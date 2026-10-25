"""Live link to the optional edge and cloud offloading nodes (backend/node).

Local processing never depends on this: with no node enabled, every task runs on this machine.

A node is configured by URL + API key, either in backend/.env (EDGE_NODE_URL / EDGE_NODE_API_KEY,
CLOUD_NODE_URL / CLOUD_NODE_API_KEY; the old *_NODE_TOKEN names also work) or in the app's
Configuration page, which saves to backend/node_settings.json on this computer (overrides .env).
API keys are sent only to their own node (X-API-Key header) and are never returned to the browser.

A background loop checks each enabled node every few seconds:
  - latency: round-trip time of GET /health (average of the last few probes)
  - load: the node's own CPU load, memory, task queue, GPU and limits from GET /status
  - bandwidth: a 1 KB and a 2 MB upload to POST /echo back to back; the extra time the larger one
    takes is the transfer time (every 30 s, averaged over the last few probes). Over a metered link
    (e.g. a phone hotspot) make it lighter with BANDWIDTH_PROBE_MB and BANDWIDTH_PROBE_INTERVAL_S.
A node that stops answering is reported offline, never with made-up values.

Tasks are sent with a unique execution ID. If the request times out after it may have reached the
node, the node is asked for that ID's status instead of sending the task again.
"""

import asyncio
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlsplit

import httpx

from app.models.system import CloudNodeState, EdgeNodeState

PROBE_INTERVAL_S = 3.0
BANDWIDTH_INTERVAL_S = 30.0
BANDWIDTH_PROBE_BYTES = 2 * 1024 * 1024
BANDWIDTH_BASE_BYTES = 1024
BANDWIDTH_SAMPLES = 3
OFFLINE_AFTER_S = 10.0
RTT_SAMPLES = 5
PROBE_TIMEOUT_S = 5.0
EXECUTE_TIMEOUT_S = 90.0
# After a timeout, how long to keep asking the node for the task's status before giving up on it.
RECOVER_WAIT_S = 30.0
RECOVER_POLL_S = 2.0

SETTINGS_PATH = Path(os.getenv("NODE_SETTINGS_PATH") or Path(__file__).resolve().parents[2] / "node_settings.json")


class RemoteTaskError(Exception):
    """A remote attempt that didn't produce a result.

    kind:
      not_started   the node never received/accepted it (unreachable, busy, wrong key): safe to try elsewhere
      failed        the node ran it and it failed: try elsewhere
      still_running the node may still be running it; its result will not be used
      rejected      the node says the task itself is invalid (400): don't try elsewhere
    """

    def __init__(self, message: str, kind: str):
        super().__init__(message)
        self.kind = kind


def validate_node_url(url: str) -> str:
    """Normalised http(s) base URL of a node, or ValueError."""
    url = (url or "").strip().rstrip("/")
    if len(url) > 300:
        raise ValueError("The URL is too long.")
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError("Enter a full address starting with http:// or https://, e.g. https://example.trycloudflare.com")
    if parts.username or parts.password:
        raise ValueError("Don't put a user name or password in the URL; use the API key field.")
    if parts.query or parts.fragment:
        raise ValueError("The URL should be the node's base address, without ? or #.")
    return url


@dataclass
class NodeTelemetry:
    tier: str
    url: Optional[str] = None
    token: Optional[str] = None
    enabled: bool = True
    # Where the URL/key came from: "env" (backend/.env), "settings" (Configuration page) or "none".
    source: str = "none"
    online: bool = False
    node_id: Optional[str] = None
    platform: Optional[str] = None
    cpu_count: Optional[int] = None
    cpu_load: Optional[float] = None
    memory_used: Optional[float] = None
    memory_total_gb: Optional[float] = None
    task_queue: Optional[int] = None
    tasks_running: Optional[int] = None
    model_ready: Optional[bool] = None
    # The node's emulated-link settings (single-machine demo); None means a real network path.
    network_emulation: Optional[Dict[str, Any]] = None
    # What the node's host can run (e.g. no video without ffmpeg; Vercel caps uploads at 4.5 MB).
    video_supported: Optional[bool] = None
    max_upload_mb: Optional[float] = None
    detector: Optional[str] = None
    # Limits the node imposes on itself (configured, not measured), and its GPU.
    constraints: Optional[Dict[str, Any]] = None
    gpu: Optional[Dict[str, Any]] = None
    rtt_ms: Optional[float] = None
    bandwidth_gbps: Optional[float] = None
    last_seen: Optional[float] = None
    last_bandwidth_at: float = 0.0
    error: Optional[str] = None
    rtt_samples: List[float] = field(default_factory=list)
    bandwidth_samples: List[float] = field(default_factory=list)

    @property
    def configured(self) -> bool:
        """Has an address and is switched on."""
        return bool(self.url) and self.enabled

    @property
    def headers(self) -> Dict[str, str]:
        # X-API-Key is the current header; X-Node-Token is understood by older nodes.
        return {"X-API-Key": self.token, "X-Node-Token": self.token} if self.token else {}

    def reset_measurements(self) -> None:
        for name in ("node_id", "platform", "cpu_count", "cpu_load", "memory_used", "memory_total_gb", "task_queue",
                     "tasks_running", "model_ready", "network_emulation", "video_supported", "max_upload_mb",
                     "detector", "constraints", "gpu", "rtt_ms", "bandwidth_gbps", "last_seen", "error"):
            setattr(self, name, None)
        self.online = False
        self.last_bandwidth_at = 0.0
        self.rtt_samples, self.bandwidth_samples = [], []

    def as_dict(self) -> Dict[str, Any]:
        """Telemetry for the browser. Never includes the API key."""
        return {
            "tier": self.tier,
            "configured": self.configured,
            "enabled": self.enabled,
            "has_api_key": bool(self.token),
            "source": self.source,
            "online": self.online,
            "url": self.url,
            "node_id": self.node_id,
            "platform": self.platform,
            "cpu_count": self.cpu_count,
            "cpu_load": self.cpu_load,
            "memory_used": self.memory_used,
            "memory_total_gb": self.memory_total_gb,
            "task_queue": self.task_queue,
            "tasks_running": self.tasks_running,
            "model_ready": self.model_ready,
            "network_emulation": self.network_emulation,
            "video_supported": self.video_supported,
            "max_upload_mb": self.max_upload_mb,
            "detector": self.detector,
            "constraints": self.constraints,
            "gpu": self.gpu,
            "network_latency_ms": self.rtt_ms,
            "bandwidth_gbps": self.bandwidth_gbps,
            "last_seen": self.last_seen,
            "error": self.error,
        }


def _env_number(name: str, default: float, minimum: float) -> float:
    try:
        return max(minimum, float(os.getenv(name, "") or default))
    except ValueError:
        return default


def _env_key(tier: str) -> Optional[str]:
    return (os.getenv(f"{tier}_NODE_API_KEY") or os.getenv(f"{tier}_NODE_TOKEN") or "").strip() or None


def _short_error(exc: Exception) -> str:
    """An error message for the UI: type and text only (URLs, never headers or keys)."""
    return f"{type(exc).__name__}: {exc}"[:200]


class NodeMonitor:
    """Keeps live telemetry for the edge and cloud nodes and sends tasks to them."""

    def __init__(self) -> None:
        self.nodes: Dict[str, NodeTelemetry] = {"edge": NodeTelemetry("EDGE"), "cloud": NodeTelemetry("CLOUD")}
        self._client: Optional[httpx.AsyncClient] = None
        self._task: Optional[asyncio.Task] = None
        self.bandwidth_interval_s = BANDWIDTH_INTERVAL_S
        self.bandwidth_probe_bytes = BANDWIDTH_PROBE_BYTES
        self.settings_path = SETTINGS_PATH
        # Tiers configured from the Configuration page (saved to settings_path).
        self._saved: Dict[str, Dict[str, Any]] = {}

    async def start(self) -> None:
        # Read the settings here, not at import: main.py loads backend/.env after importing the routers.
        self.bandwidth_interval_s = _env_number("BANDWIDTH_PROBE_INTERVAL_S", BANDWIDTH_INTERVAL_S, 5.0)
        # At most 3.5 MB: nodes refuse probe blocks over 4 MB (and Vercel requests over 4.5 MB).
        probe_mb = min(3.5, _env_number("BANDWIDTH_PROBE_MB", BANDWIDTH_PROBE_BYTES / 2**20, 0.25))
        self.bandwidth_probe_bytes = int(probe_mb * 2**20)
        for key in ("edge", "cloud"):
            node = self.nodes[key]
            url = os.getenv(f"{key.upper()}_NODE_URL", "").strip().rstrip("/")
            node.url = url or None
            node.token = _env_key(key.upper())
            node.enabled = True
            node.source = "env" if url else "none"
        self._load_saved()
        self._client = httpx.AsyncClient()
        # Always running (cheap when nothing is enabled), so nodes can be added from the UI later.
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._client:
            await self._client.aclose()

    # ---------- Settings from the Configuration page ----------

    def _load_saved(self) -> None:
        try:
            data = json.loads(self.settings_path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return
        except (OSError, ValueError):
            return  # unreadable file: keep the .env values
        for key in ("edge", "cloud"):
            entry = data.get(key)
            if not isinstance(entry, dict):
                continue
            node = self.nodes[key]
            self._saved[key] = entry
            node.url = entry.get("url") or None
            node.token = entry.get("api_key") or None
            node.enabled = bool(entry.get("enabled", True))
            node.source = "settings"

    def _write_saved(self) -> None:
        self.settings_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.settings_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._saved, indent=2), encoding="utf-8")
        try:
            os.chmod(tmp, 0o600)  # owner-only where the OS supports it (no effect on Windows ACLs)
        except OSError:
            pass
        os.replace(tmp, self.settings_path)

    def update_settings(
        self,
        key: str,
        enabled: bool,
        url: Optional[str],
        api_key: Optional[str] = None,
        clear_api_key: bool = False,
    ) -> Dict[str, Any]:
        """Applies and saves a node's settings. api_key=None keeps the saved key."""
        node = self.nodes[key]
        clean_url = validate_node_url(url) if url else None
        if enabled and not clean_url:
            raise ValueError("Enter the node's URL before enabling it.")
        token = node.token
        if clear_api_key:
            token = None
        elif api_key is not None and api_key.strip():
            token = api_key.strip()
        changed = (clean_url != node.url) or (token != node.token)
        node.url, node.token, node.enabled, node.source = clean_url, token, enabled, "settings"
        if changed or not enabled:
            node.reset_measurements()
        self._saved[key] = {"enabled": enabled, "url": clean_url, "api_key": token}
        self._write_saved()
        return node.as_dict()

    async def test_connection(self, url: str, api_key: Optional[str]) -> Dict[str, Any]:
        """One-off check of a node: reachable, key accepted, valid answers. Never echoes the key."""
        url = validate_node_url(url)
        headers = {"X-API-Key": api_key, "X-Node-Token": api_key} if api_key else {}
        out: Dict[str, Any] = {"url": url, "reachable": False, "authenticated": False, "online": False}
        client = self._client or httpx.AsyncClient()
        try:
            started = time.perf_counter()
            health = await client.get(f"{url}/health", headers=headers, timeout=PROBE_TIMEOUT_S * 3)
            out["latency_ms"] = round((time.perf_counter() - started) * 1000.0, 1)
            out["reachable"] = True
            out["http_status"] = health.status_code
            if health.status_code == 401:
                out["error"] = "The node rejected the API key." if api_key else "The node requires an API key."
                return out
            health.raise_for_status()
            status_res = await client.get(f"{url}/status", headers=headers, timeout=PROBE_TIMEOUT_S * 3)
            if status_res.status_code == 401:
                out["error"] = "The node rejected the API key."
                return out
            status_res.raise_for_status()
            data = status_res.json()
            if not isinstance(data, dict) or data.get("tier") not in ("EDGE", "CLOUD") or "cpu_load" not in data:
                out["error"] = "This address answered, but not like an offloading node (unexpected /status reply)."
                return out
            out.update(
                authenticated=True,
                online=True,
                tier=data.get("tier"),
                node_id=data.get("node_id"),
                cpu_load=data.get("cpu_load"),
                memory_used=data.get("memory_used"),
                task_queue=data.get("task_queue"),
                model_ready=data.get("model_ready"),
                gpu=data.get("gpu"),
                constraints=data.get("constraints"),
                detector=data.get("detector"),
                key_required=bool(api_key) or None,
            )
        except httpx.TimeoutException:
            out["error"] = "No answer within 15 s (offline, asleep, or a firewall blocks it)."
        except httpx.ConnectError as exc:
            out["error"] = f"Could not connect: {_short_error(exc)}"
        except (httpx.HTTPStatusError, ValueError) as exc:
            out["error"] = f"Unexpected reply: {_short_error(exc)}"
        finally:
            if client is not self._client:
                await client.aclose()
        return out

    # ---------- Monitoring loop ----------

    async def _loop(self) -> None:
        while True:
            await asyncio.gather(*(self._probe(n) for n in self.nodes.values() if n.configured))
            await asyncio.sleep(PROBE_INTERVAL_S)

    async def _probe(self, node: NodeTelemetry) -> None:
        assert self._client is not None
        url = node.url
        now = time.time()
        try:
            started = time.perf_counter()
            health = await self._client.get(f"{url}/health", timeout=PROBE_TIMEOUT_S, headers=node.headers)
            rtt_ms = (time.perf_counter() - started) * 1000.0
            health.raise_for_status()
            status = await self._client.get(f"{url}/status", timeout=PROBE_TIMEOUT_S, headers=node.headers)
            status.raise_for_status()
            data = status.json()
            if node.url != url:
                return  # settings changed while probing: drop this reading

            node.rtt_samples = (node.rtt_samples + [rtt_ms])[-RTT_SAMPLES:]
            node.rtt_ms = round(sum(node.rtt_samples) / len(node.rtt_samples), 2)
            node.node_id = data.get("node_id")
            node.platform = data.get("platform")
            node.cpu_count = data.get("cpu_count")
            node.cpu_load = data.get("cpu_load")
            node.memory_used = data.get("memory_used")
            node.memory_total_gb = data.get("memory_total_gb")
            node.task_queue = data.get("task_queue")
            node.tasks_running = data.get("tasks_running")
            node.model_ready = data.get("model_ready")
            node.network_emulation = data.get("network_emulation")
            caps = data.get("capabilities") or {}
            node.video_supported = caps.get("video")
            node.max_upload_mb = caps.get("max_upload_mb")
            node.detector = data.get("detector")
            node.constraints = data.get("constraints")
            node.gpu = data.get("gpu")
            node.online = True
            node.last_seen = now
            node.error = None
            if node.bandwidth_gbps is None or now - node.last_bandwidth_at >= self.bandwidth_interval_s:
                await self._measure_bandwidth(node)
        except Exception as exc:  # unreachable, timeout, bad response, wrong key
            if node.url != url:
                return
            node.error = _short_error(exc)
            if node.last_seen is None or now - node.last_seen > OFFLINE_AFTER_S:
                node.online = False

    async def _timed_echo(self, node: NodeTelemetry, size: int) -> float:
        assert self._client is not None
        block = os.urandom(size)
        started = time.perf_counter()
        res = await self._client.post(f"{node.url}/echo", content=block, timeout=PROBE_TIMEOUT_S * 6, headers=node.headers)
        elapsed_s = time.perf_counter() - started
        res.raise_for_status()
        return elapsed_s

    async def _measure_bandwidth(self, node: NodeTelemetry) -> None:
        # Latency and request overhead are the same for both uploads, so the difference in time is
        # what the extra bytes took to transfer. (Subtracting an average RTT instead let a few ms of
        # jitter swamp the transfer time on fast links.)
        small_s = await self._timed_echo(node, BANDWIDTH_BASE_BYTES)
        large_s = await self._timed_echo(node, self.bandwidth_probe_bytes)
        transfer_s = max(large_s - small_s, 0.001)
        gbps = (self.bandwidth_probe_bytes - BANDWIDTH_BASE_BYTES) * 8 / transfer_s / 1e9
        node.bandwidth_samples = (node.bandwidth_samples + [gbps])[-BANDWIDTH_SAMPLES:]
        node.bandwidth_gbps = round(sum(node.bandwidth_samples) / len(node.bandwidth_samples), 4)
        node.last_bandwidth_at = time.time()

    # ---------- Used by the API ----------

    def telemetry(self) -> Dict[str, Dict[str, Any]]:
        return {key: node.as_dict() for key, node in self.nodes.items()}

    def is_live(self, key: str) -> bool:
        node = self.nodes[key]
        return node.configured and node.online and node.rtt_ms is not None and node.bandwidth_gbps is not None

    def is_unavailable(self, key: str) -> bool:
        """Configured but not answering: the DQN must not send tasks there."""
        node = self.nodes[key]
        return node.configured and not node.online

    def cannot_run(self, key: str, workload_type: str, upload_bytes: int) -> Optional[str]:
        """Why this node can't take the task (as reported by the node), or None if it can."""
        node = self.nodes[key]
        if not node.configured:
            return None
        if workload_type.upper() in ("VIDEO", "VIDEO_STREAM", "STREAM") and node.video_supported is False:
            return f"the {key} node can't process videos (no ffmpeg there)"
        if node.max_upload_mb and upload_bytes > node.max_upload_mb * 1024 * 1024:
            return (
                f"the upload ({upload_bytes / (1024 * 1024):.1f} MB) is over the {key} node's "
                f"{node.max_upload_mb:g} MB limit"
            )
        return None

    def live_state(self, key: str):
        """The node's real state for the DQN, or None when it is not live."""
        if not self.is_live(key):
            return None
        node = self.nodes[key]
        cls = EdgeNodeState if key == "edge" else CloudNodeState
        return cls(
            cpu_load=max(0.0, min(100.0, float(node.cpu_load or 0.0))),
            task_queue=max(0, int(node.task_queue or 0)),
            network_latency=float(node.rtt_ms),
            bandwidth=float(node.bandwidth_gbps),
        )

    async def execute(
        self, key: str, files_data: List[Tuple[str, bytes, str]], workload_type: str, task_id: str
    ) -> Dict[str, Any]:
        """Sends the task to the node under a unique task_id and returns its result + measured round trip.

        Raises RemoteTaskError. After a timeout it asks the node for task_id's status rather than
        sending the task again, so a slow answer never makes the task run twice on that node.
        """
        node = self.nodes[key]
        if not self._client or not node.url:
            raise RemoteTaskError(f"the {key} node is not configured", "not_started")
        started = time.perf_counter()
        try:
            res = await self._client.post(
                f"{node.url}/execute",
                files=[("files", (name, data, ctype)) for name, data, ctype in files_data],
                data={"workload_type": workload_type, "task_id": task_id},
                timeout=httpx.Timeout(EXECUTE_TIMEOUT_S, connect=PROBE_TIMEOUT_S),
                headers=node.headers,
            )
        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            raise RemoteTaskError(f"could not reach the {key} node ({type(exc).__name__})", "not_started")
        except (httpx.TimeoutException, httpx.TransportError):
            # The node may have received it: look it up by ID instead of re-sending.
            result = await self._recover(key, task_id)
            result["round_trip_ms"] = round((time.perf_counter() - started) * 1000.0, 2)
            return result

        if res.status_code == 200:
            result = res.json()
            result["round_trip_ms"] = round((time.perf_counter() - started) * 1000.0, 2)
            return result
        detail = _detail(res)
        if res.status_code == 409:  # already running under this ID
            result = await self._recover(key, task_id)
            result["round_trip_ms"] = round((time.perf_counter() - started) * 1000.0, 2)
            return result
        if res.status_code == 400:
            raise RemoteTaskError(detail or "the node could not process this task", "rejected")
        if res.status_code == 401:
            raise RemoteTaskError(f"the {key} node rejected the API key", "not_started")
        if res.status_code in (413, 503):
            raise RemoteTaskError(f"the {key} node refused the task: {detail or res.status_code}", "not_started")
        raise RemoteTaskError(f"the {key} node failed: {detail or res.status_code}", "failed")

    async def _recover(self, key: str, task_id: str) -> Dict[str, Any]:
        """Polls GET /tasks/{task_id} until it is done, failed, unknown, or RECOVER_WAIT_S passes."""
        node = self.nodes[key]
        deadline = time.monotonic() + RECOVER_WAIT_S
        while True:
            try:
                res = await self._client.get(f"{node.url}/tasks/{task_id}", headers=node.headers, timeout=PROBE_TIMEOUT_S)
                if res.status_code == 404:
                    raise RemoteTaskError(f"the {key} node never received the task (timed out before it arrived)", "not_started")
                if res.status_code == 200:
                    body = res.json()
                    if body.get("status") == "done" and body.get("result"):
                        return dict(body["result"])
                    if body.get("status") == "failed":
                        raise RemoteTaskError(f"the {key} node failed: {body.get('error')}", "failed")
            except RemoteTaskError:
                raise
            except Exception:
                pass  # status check itself failed: keep trying until the deadline
            if time.monotonic() >= deadline:
                raise RemoteTaskError(
                    f"the {key} node did not finish task {task_id} in time; its result will not be used", "still_running"
                )
            await asyncio.sleep(RECOVER_POLL_S)


def _detail(res: httpx.Response) -> Optional[str]:
    try:
        detail = res.json().get("detail")
        return str(detail)[:300] if detail else None
    except ValueError:
        return None


node_monitor = NodeMonitor()
