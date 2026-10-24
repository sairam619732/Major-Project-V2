"""Live link to the edge and cloud offloading nodes (backend/node).

When EDGE_NODE_URL / CLOUD_NODE_URL are set (plus EDGE_NODE_TOKEN / CLOUD_NODE_TOKEN for a node
protected with NODE_TOKEN), a background loop checks each node every few seconds:
  - latency: round-trip time of GET /health (average of the last few probes)
  - load: the node's own CPU load and task queue from GET /status
  - bandwidth: a 1 KB and a 2 MB upload to POST /echo back to back; the extra time the larger one
    takes is the transfer time (every 30 s, averaged over the last few probes)
A tier without a URL stays simulated (its values come from the UI's what-if settings).
A configured node that stops answering is reported offline, never with made-up values.
"""

import asyncio
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

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
EXECUTE_TIMEOUT_S = 120.0


@dataclass
class NodeTelemetry:
    tier: str
    url: Optional[str] = None
    token: Optional[str] = None
    online: bool = False
    node_id: Optional[str] = None
    platform: Optional[str] = None
    cpu_count: Optional[int] = None
    cpu_load: Optional[float] = None
    memory_used: Optional[float] = None
    memory_total_gb: Optional[float] = None
    task_queue: Optional[int] = None
    model_ready: Optional[bool] = None
    # The node's emulated-link settings (single-machine demo); None means a real network path.
    network_emulation: Optional[Dict[str, Any]] = None
    rtt_ms: Optional[float] = None
    bandwidth_gbps: Optional[float] = None
    last_seen: Optional[float] = None
    last_bandwidth_at: float = 0.0
    error: Optional[str] = None
    rtt_samples: List[float] = field(default_factory=list)
    bandwidth_samples: List[float] = field(default_factory=list)

    @property
    def configured(self) -> bool:
        return bool(self.url)

    @property
    def headers(self) -> Dict[str, str]:
        return {"X-Node-Token": self.token} if self.token else {}

    def as_dict(self) -> Dict[str, Any]:
        return {
            "tier": self.tier,
            "configured": self.configured,
            "online": self.online,
            "url": self.url,
            "node_id": self.node_id,
            "platform": self.platform,
            "cpu_count": self.cpu_count,
            "cpu_load": self.cpu_load,
            "memory_used": self.memory_used,
            "memory_total_gb": self.memory_total_gb,
            "task_queue": self.task_queue,
            "model_ready": self.model_ready,
            "network_emulation": self.network_emulation,
            "network_latency_ms": self.rtt_ms,
            "bandwidth_gbps": self.bandwidth_gbps,
            "last_seen": self.last_seen,
            "error": self.error,
        }


class NodeMonitor:
    """Keeps live telemetry for the edge and cloud nodes and sends tasks to them."""

    def __init__(self) -> None:
        self.nodes: Dict[str, NodeTelemetry] = {"edge": NodeTelemetry("EDGE"), "cloud": NodeTelemetry("CLOUD")}
        self._client: Optional[httpx.AsyncClient] = None
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        # Read the URLs here, not at import: main.py loads backend/.env after importing the routers.
        for key in ("edge", "cloud"):
            url = os.getenv(f"{key.upper()}_NODE_URL", "").strip().rstrip("/")
            self.nodes[key].url = url or None
            self.nodes[key].token = os.getenv(f"{key.upper()}_NODE_TOKEN", "").strip() or None
        if not any(n.configured for n in self.nodes.values()):
            return
        self._client = httpx.AsyncClient()
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

    async def _loop(self) -> None:
        while True:
            await asyncio.gather(*(self._probe(n) for n in self.nodes.values() if n.configured))
            await asyncio.sleep(PROBE_INTERVAL_S)

    async def _probe(self, node: NodeTelemetry) -> None:
        assert self._client is not None
        now = time.time()
        try:
            started = time.perf_counter()
            health = await self._client.get(f"{node.url}/health", timeout=PROBE_TIMEOUT_S, headers=node.headers)
            rtt_ms = (time.perf_counter() - started) * 1000.0
            health.raise_for_status()
            status = await self._client.get(f"{node.url}/status", timeout=PROBE_TIMEOUT_S, headers=node.headers)
            status.raise_for_status()
            data = status.json()

            node.rtt_samples = (node.rtt_samples + [rtt_ms])[-RTT_SAMPLES:]
            node.rtt_ms = round(sum(node.rtt_samples) / len(node.rtt_samples), 2)
            node.node_id = data.get("node_id")
            node.platform = data.get("platform")
            node.cpu_count = data.get("cpu_count")
            node.cpu_load = data.get("cpu_load")
            node.memory_used = data.get("memory_used")
            node.memory_total_gb = data.get("memory_total_gb")
            node.task_queue = data.get("task_queue")
            node.model_ready = data.get("model_ready")
            node.network_emulation = data.get("network_emulation")
            node.online = True
            node.last_seen = now
            node.error = None
            if node.bandwidth_gbps is None or now - node.last_bandwidth_at >= BANDWIDTH_INTERVAL_S:
                await self._measure_bandwidth(node)
        except Exception as exc:  # unreachable, timeout, bad response
            node.error = f"{type(exc).__name__}: {exc}"[:200]
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
        large_s = await self._timed_echo(node, BANDWIDTH_PROBE_BYTES)
        transfer_s = max(large_s - small_s, 0.001)
        gbps = (BANDWIDTH_PROBE_BYTES - BANDWIDTH_BASE_BYTES) * 8 / transfer_s / 1e9
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
        """Sends the task to the node and returns its result plus the measured round trip."""
        node = self.nodes[key]
        if not self._client or not node.url:
            raise RuntimeError(f"{node.tier} node is not configured")
        started = time.perf_counter()
        res = await self._client.post(
            f"{node.url}/execute",
            files=[("files", (name, data, ctype)) for name, data, ctype in files_data],
            data={"workload_type": workload_type, "task_id": task_id},
            timeout=EXECUTE_TIMEOUT_S,
            headers=node.headers,
        )
        round_trip_ms = (time.perf_counter() - started) * 1000.0
        res.raise_for_status()
        result = res.json()
        result["round_trip_ms"] = round(round_trip_ms, 2)
        return result


node_monitor = NodeMonitor()
