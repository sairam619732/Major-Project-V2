"""Local-first execution, optional remote nodes, settings, timeouts and fallback.

Run from backend/:  .venv\\Scripts\\python.exe -m tests.test_offloading
Starts a real worker (backend/node) on a free local port for the end-to-end checks.
"""

import asyncio
import socket
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

import httpx
import uvicorn
from fastapi.testclient import TestClient

from app.api import simulation as sim
from app.main import app
from app.services import remote_nodes
from app.services.remote_nodes import NodeMonitor, NodeTelemetry, RemoteTaskError

SAMPLE = (Path(__file__).resolve().parents[2] / "public" / "samples" / "traffic_monitoring.jpg").read_bytes()
WORKER_KEY = "worker-test-key-123"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Worker:
    """A real node server (backend/node) on a local port, protected by WORKER_KEY."""

    def __init__(self):
        import node.server as server

        self.server_module = server
        self.port = free_port()
        self.url = f"http://127.0.0.1:{self.port}"
        self._old_key = server.NODE_TOKEN
        server.NODE_TOKEN = WORKER_KEY
        config = uvicorn.Config(server.app, host="127.0.0.1", port=self.port, log_level="error")
        self.uvicorn = uvicorn.Server(config)
        self.thread = threading.Thread(target=self.uvicorn.run, daemon=True)
        self.thread.start()
        for _ in range(100):
            try:
                httpx.get(f"{self.url}/health", headers={"X-API-Key": WORKER_KEY}, timeout=1)
                return
            except httpx.HTTPError:
                time.sleep(0.1)
        raise RuntimeError("worker did not start")

    def stop(self):
        self.uvicorn.should_exit = True
        self.thread.join(timeout=10)
        self.server_module.NODE_TOKEN = self._old_key


def execute(client, **form):
    return client.post("/api/simulation/execute", files=[("files", ("a.jpg", SAMPLE, "image/jpeg"))], data=form)


class TestLocalOnly(unittest.TestCase):
    """With no edge/cloud node set up, everything runs here for real."""

    def setUp(self):
        self.nodes = {k: NodeTelemetry(k.upper()) for k in ("edge", "cloud")}
        self.patch = mock.patch.dict(sim.node_monitor.nodes, self.nodes)
        self.patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.patch.stop()

    def test_local_task_returns_real_result(self):
        res = execute(self.client)
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["executed_on"], "LOCAL")
        self.assertEqual(body["decision"], "LOCAL")
        self.assertFalse(body["is_simulated_distributed"])
        self.assertGreater(body["detection_count"], 0)
        self.assertGreater(body["processing_time_ms"], 0)
        self.assertIn(body["dqn_decision"], ("LOCAL", "EDGE", "CLOUD"))  # the real DQN ran

    def test_dqn_choice_of_missing_tier_runs_locally_and_says_so(self):
        real = sim.inference_service.predict

        def edge_choice(**kw):
            res = real(**kw)
            res.update(decision="EDGE", action_index=1, q_values={"local": -1.0, "edge": -0.2, "cloud": -2.0})
            return res

        with mock.patch.object(sim.inference_service, "predict", side_effect=edge_choice):
            body = execute(self.client).json()
        self.assertEqual(body["dqn_decision"], "EDGE")
        self.assertEqual(body["executed_on"], "LOCAL")
        self.assertIn("no edge node is set up", " ".join(body["routing_notes"]))

    def test_local_failure_is_an_error_not_success(self):
        with mock.patch.object(sim.cv_executor, "process_workload", side_effect=RuntimeError("detector crashed")):
            res = execute(self.client)
        self.assertEqual(res.status_code, 500)
        self.assertIn("detector crashed", res.json()["detail"])


class TestSettingsApi(unittest.TestCase):
    """Configuration page API: keys stored server-side, never returned; only this computer may change them."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.patches = [
            mock.patch.dict(sim.node_monitor.nodes, {k: NodeTelemetry(k.upper()) for k in ("edge", "cloud")}),
            mock.patch.object(sim.node_monitor, "settings_path", Path(self.tmp.name) / "node_settings.json"),
            mock.patch.object(sim.node_monitor, "_saved", {}),
        ]
        for p in self.patches:
            p.start()
        self.client = TestClient(app)

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def test_save_never_returns_key(self):
        res = self.client.put("/api/nodes/edge", json={"enabled": True, "url": "https://edge.example.com/", "api_key": "s3cret-key"})
        self.assertEqual(res.status_code, 200, res.text)
        self.assertNotIn("s3cret-key", res.text)
        self.assertTrue(res.json()["has_api_key"])
        listing = self.client.get("/api/nodes")
        self.assertNotIn("s3cret-key", listing.text)
        self.assertEqual(listing.json()["edge"]["url"], "https://edge.example.com")
        # Saved server-side for the next start (plain text file on this computer, ignored by git).
        self.assertIn("s3cret-key", sim.node_monitor.settings_path.read_text())

    def test_empty_key_keeps_saved_key_and_clear_removes_it(self):
        self.client.put("/api/nodes/cloud", json={"enabled": True, "url": "https://c.example.com", "api_key": "k1"})
        self.client.put("/api/nodes/cloud", json={"enabled": True, "url": "https://c.example.com", "api_key": ""})
        self.assertEqual(sim.node_monitor.nodes["cloud"].token, "k1")
        self.client.put("/api/nodes/cloud", json={"enabled": False, "url": "https://c.example.com", "clear_api_key": True})
        self.assertIsNone(sim.node_monitor.nodes["cloud"].token)
        self.assertFalse(sim.node_monitor.nodes["cloud"].configured)

    def test_invalid_urls_rejected(self):
        for bad in ("edge.example.com", "ftp://x.com", "https://user:pw@x.com", "https://x.com/?a=1"):
            res = self.client.put("/api/nodes/edge", json={"enabled": True, "url": bad})
            self.assertEqual(res.status_code, 422, bad)
        self.assertEqual(self.client.put("/api/nodes/edge", json={"enabled": True}).status_code, 422)

    def test_other_devices_cannot_change_settings(self):
        remote = TestClient(app, client=("192.168.1.50", 50000))
        res = remote.put("/api/nodes/edge", json={"enabled": True, "url": "https://evil.example.com"})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(remote.post("/api/nodes/edge/test", json={"url": "https://x.example.com"}).status_code, 403)


class TestRealWorker(unittest.TestCase):
    """Against a real worker over HTTP: authentication, connection test, remote execution."""

    @classmethod
    def setUpClass(cls):
        cls.worker = Worker()

    @classmethod
    def tearDownClass(cls):
        cls.worker.stop()

    def test_connection_test_results(self):
        mon = NodeMonitor()
        ok = asyncio.run(mon.test_connection(self.worker.url, WORKER_KEY))
        self.assertTrue(ok["online"], ok)
        self.assertTrue(ok["authenticated"])
        self.assertIn("gpu", ok)
        self.assertNotIn(WORKER_KEY, str(ok))
        wrong = asyncio.run(mon.test_connection(self.worker.url, "wrong-key"))
        self.assertFalse(wrong["authenticated"])
        self.assertIn("rejected the API key", wrong["error"])
        offline = asyncio.run(mon.test_connection(f"http://127.0.0.1:{free_port()}", WORKER_KEY))
        self.assertFalse(offline["reachable"])

    def test_invalid_key_rejected_and_valid_key_accepted(self):
        self.assertEqual(httpx.get(f"{self.worker.url}/status", headers={"X-API-Key": "nope"}).status_code, 401)
        self.assertEqual(httpx.get(f"{self.worker.url}/status").status_code, 401)
        self.assertEqual(httpx.get(f"{self.worker.url}/status", headers={"X-API-Key": WORKER_KEY}).status_code, 200)

    def test_task_runs_on_the_remote_node(self):
        node = NodeTelemetry("EDGE", url=self.worker.url, token=WORKER_KEY, online=True, rtt_ms=5.0, bandwidth_gbps=1.0)
        real = sim.inference_service.predict

        def edge_choice(**kw):
            res = real(**kw)
            res.update(decision="EDGE", action_index=1, q_values={"local": -1.0, "edge": -0.2, "cloud": -2.0})
            return res

        client = TestClient(app)
        with mock.patch.dict(sim.node_monitor.nodes, {"edge": node, "cloud": NodeTelemetry("CLOUD")}), \
                mock.patch.object(sim.inference_service, "predict", side_effect=edge_choice), \
                mock.patch.object(sim.node_monitor, "_client", httpx.AsyncClient()):
            body = execute(client).json()
        self.assertEqual(body["executed_on"], "EDGE", body.get("routing_notes"))
        self.assertEqual(body["execution_worker"], self.worker.server_module.NODE_ID)
        self.assertGreater(body["detection_count"], 0)
        self.assertTrue(body["execution_id"].startswith("exec-"))
        # The worker recorded the task under that ID.
        status = httpx.get(f"{self.worker.url}/tasks/{body['execution_id']}", headers={"X-API-Key": WORKER_KEY}).json()
        self.assertEqual(status["status"], "done")


class TestTimeoutRecovery(unittest.TestCase):
    """A timeout after sending asks the node for the task's status instead of sending it again."""

    def monitor(self, handler):
        mon = NodeMonitor()
        mon.nodes["edge"] = NodeTelemetry("EDGE", url="http://edge.test", token="k", online=True)
        mon._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        return mon

    def test_timeout_then_result_by_id(self):
        posts = []
        polls = iter(["running", "done"])

        def handler(request):
            if request.method == "POST":
                posts.append(1)
                raise httpx.ReadTimeout("slow", request=request)
            state = next(polls)
            body = {"status": state, "result": {"processing_time_ms": 5.0, "task_id": "t1"} if state == "done" else None}
            return httpx.Response(200, json=body)

        with mock.patch.object(remote_nodes, "RECOVER_POLL_S", 0.01):
            result = asyncio.run(self.monitor(handler).execute("edge", [("a.jpg", SAMPLE, "image/jpeg")], "IMAGE", "t1"))
        self.assertEqual(result["task_id"], "t1")
        self.assertEqual(len(posts), 1)  # sent once, never re-sent

    def test_timeout_before_arrival_is_safe_to_run_elsewhere(self):
        def handler(request):
            if request.method == "POST":
                raise httpx.WriteTimeout("slow upload", request=request)
            return httpx.Response(404, json={"detail": "No task with this ID was received."})

        with self.assertRaises(RemoteTaskError) as ctx:
            asyncio.run(self.monitor(handler).execute("edge", [("a.jpg", SAMPLE, "image/jpeg")], "IMAGE", "t2"))
        self.assertEqual(ctx.exception.kind, "not_started")

    def test_still_running_is_reported_not_duplicated(self):
        def handler(request):
            if request.method == "POST":
                raise httpx.ReadTimeout("slow", request=request)
            return httpx.Response(200, json={"status": "running"})

        with mock.patch.object(remote_nodes, "RECOVER_WAIT_S", 0.05), mock.patch.object(remote_nodes, "RECOVER_POLL_S", 0.01):
            with self.assertRaises(RemoteTaskError) as ctx:
                asyncio.run(self.monitor(handler).execute("edge", [("a.jpg", SAMPLE, "image/jpeg")], "IMAGE", "t3"))
        self.assertEqual(ctx.exception.kind, "still_running")
        self.assertIn("will not be used", str(ctx.exception))


class TestFallback(unittest.TestCase):
    """Both remote nodes fail: the task still runs locally, and the result says what happened."""

    def test_all_remote_fail_then_local(self):
        live = dict(online=True, rtt_ms=10.0, bandwidth_gbps=0.5, token="k")
        nodes = {"edge": NodeTelemetry("EDGE", url="http://e.test", **live), "cloud": NodeTelemetry("CLOUD", url="http://c.test", **live)}
        real = sim.inference_service.predict

        def cloud_choice(**kw):
            res = real(**kw)
            res.update(decision="CLOUD", action_index=2, q_values={"local": -2.0, "edge": -1.0, "cloud": -0.5})
            return res

        async def fail(key, *args, **kwargs):
            raise RemoteTaskError(f"could not reach the {key} node (ConnectError)", "not_started")

        with mock.patch.dict(sim.node_monitor.nodes, nodes), \
                mock.patch.object(sim.inference_service, "predict", side_effect=cloud_choice), \
                mock.patch.object(sim.node_monitor, "execute", side_effect=fail) as remote:
            body = execute(TestClient(app)).json()
        self.assertEqual([c.args[0] for c in remote.call_args_list], ["cloud", "edge"])  # DQN order, then the next best
        self.assertEqual(body["dqn_decision"], "CLOUD")
        self.assertEqual(body["executed_on"], "LOCAL")
        notes = " ".join(body["routing_notes"])
        self.assertIn("CLOUD was tried", notes)
        self.assertIn("EDGE was tried", notes)
        self.assertGreater(body["detection_count"], 0)


class TestDqnOrderIsRespected(unittest.TestCase):
    """With nodes live, a DQN choice of LOCAL runs locally: remote tiers are not tried first."""

    def test_local_choice_stays_local(self):
        live = dict(online=True, rtt_ms=10.0, bandwidth_gbps=0.5, token="k")
        nodes = {"edge": NodeTelemetry("EDGE", url="http://e.test", **live), "cloud": NodeTelemetry("CLOUD", url="http://c.test", **live)}
        real = sim.inference_service.predict

        def local_choice(**kw):
            res = real(**kw)
            res.update(decision="LOCAL", action_index=0, q_values={"local": -0.5, "edge": -1.0, "cloud": -2.0})
            return res

        with mock.patch.dict(sim.node_monitor.nodes, nodes), \
                mock.patch.object(sim.inference_service, "predict", side_effect=local_choice), \
                mock.patch.object(sim.node_monitor, "execute") as remote:
            body = execute(TestClient(app)).json()
        remote.assert_not_called()
        self.assertEqual((body["dqn_decision"], body["executed_on"]), ("LOCAL", "LOCAL"))
        self.assertEqual(body["routing_notes"], [])

    def test_edge_choice_falls_back_to_local_before_lower_ranked_cloud(self):
        live = dict(online=True, rtt_ms=10.0, bandwidth_gbps=0.5, token="k")
        nodes = {"edge": NodeTelemetry("EDGE", url="http://e.test", **live), "cloud": NodeTelemetry("CLOUD", url="http://c.test", **live)}
        real = sim.inference_service.predict

        def edge_choice(**kw):
            res = real(**kw)
            res.update(decision="EDGE", action_index=1, q_values={"local": -0.8, "edge": -0.5, "cloud": -2.0})
            return res

        async def fail(key, *args, **kwargs):
            raise RemoteTaskError(f"the {key} node refused the task: busy", "not_started")

        with mock.patch.dict(sim.node_monitor.nodes, nodes), \
                mock.patch.object(sim.inference_service, "predict", side_effect=edge_choice), \
                mock.patch.object(sim.node_monitor, "execute", side_effect=fail) as remote:
            body = execute(TestClient(app)).json()
        # EDGE failed; LOCAL ranks above CLOUD, so CLOUD is not tried.
        self.assertEqual([c.args[0] for c in remote.call_args_list], ["edge"])
        self.assertEqual(body["executed_on"], "LOCAL")


class TestNoKeysInFrontend(unittest.TestCase):
    """API keys don't end up in the built web app or in tracked files."""

    def test_no_secrets_in_build_or_git(self):
        import subprocess

        root = Path(__file__).resolve().parents[2]
        secrets = []
        for env_file in (root / "backend" / ".env", root / "backend" / ".cloud-node-token", root / "backend" / "node_settings.json"):
            if env_file.exists():
                text = env_file.read_text(encoding="utf-8", errors="ignore")
                for line in text.splitlines():
                    if any(k in line for k in ("TOKEN=", "API_KEY=")) and "=" in line:
                        value = line.split("=", 1)[1].strip()
                        if len(value) >= 16:
                            secrets.append(value)
                if env_file.suffix in ("", ".json") and env_file.name != ".env":
                    secrets.extend(v for v in __import__("re").findall(r"[A-Za-z0-9_\-]{24,}", text))
        if not secrets:
            self.skipTest("no local keys to check for")
        tracked = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True).stdout.split()
        build_dir = root / ".next"
        haystacks = [root / f for f in tracked if (root / f).is_file() and (root / f).stat().st_size < 5_000_000]
        if build_dir.exists():
            haystacks += [p for p in build_dir.rglob("*.js") if p.stat().st_size < 5_000_000]
        for path in haystacks:
            text = path.read_text(encoding="utf-8", errors="ignore")
            for secret in secrets:
                self.assertNotIn(secret, text, f"a key appears in {path.relative_to(root)}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
