"""Tests for the offloading node (backend/node) and the backend's link to it (remote_nodes).

Run from backend/:  .venv\\Scripts\\python.exe -m tests.test_nodes
"""

import asyncio
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.services.remote_nodes import NodeMonitor, NodeTelemetry
from node.server import app as node_app

SAMPLE_IMAGE = Path(__file__).resolve().parents[2] / "public" / "samples" / "traffic_monitoring.jpg"


class TestNodeServer(unittest.TestCase):
    """The node reports its real load and runs detection on uploaded images."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(node_app)

    def test_health(self):
        body = self.client.get("/health").json()
        self.assertEqual(body["status"], "ok")
        self.assertIn(body["tier"], ("EDGE", "CLOUD"))

    def test_status_reports_real_load(self):
        body = self.client.get("/status").json()
        self.assertGreater(body["cpu_count"], 0)
        self.assertGreaterEqual(body["cpu_load"], 0.0)
        self.assertLessEqual(body["cpu_load"], 100.0)
        self.assertGreater(body["memory_total_gb"], 0.0)
        self.assertEqual(body["task_queue"], 0)

    def test_echo_counts_bytes(self):
        body = self.client.post("/echo", content=b"x" * 4096).json()
        self.assertEqual(body["received_bytes"], 4096)

    def test_execute_runs_detection(self):
        with open(SAMPLE_IMAGE, "rb") as f:
            res = self.client.post("/execute", files={"files": ("img.jpg", f.read(), "image/jpeg")})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "SUCCESS")
        self.assertGreater(body["processing_time_ms"], 0.0)
        self.assertIsInstance(body["detections"], list)
        # The queue goes back to zero once the task is done.
        self.assertEqual(self.client.get("/status").json()["task_queue"], 0)

    def test_execute_without_files_is_rejected(self):
        self.assertEqual(self.client.post("/execute", data={"workload_type": "IMAGE"}).status_code, 400)

    def test_access_key_is_enforced_when_set(self):
        import node.server as server

        server.NODE_TOKEN = "test-key"
        try:
            self.assertEqual(self.client.get("/health").status_code, 200)  # health stays open
            self.assertEqual(self.client.get("/status").status_code, 401)
            self.assertEqual(self.client.get("/status", headers={"X-Node-Token": "wrong"}).status_code, 401)
            self.assertEqual(self.client.get("/status", headers={"X-Node-Token": "test-key"}).status_code, 200)
        finally:
            server.NODE_TOKEN = ""


class TestNodeMonitor(unittest.TestCase):
    """Live/offline/simulated rules used when deciding where a task runs."""

    def test_unconfigured_tier_is_simulated(self):
        monitor = NodeMonitor()
        asyncio.run(monitor.start())  # no EDGE_NODE_URL / CLOUD_NODE_URL in the test environment
        try:
            self.assertFalse(monitor.is_live("edge"))
            self.assertFalse(monitor.is_unavailable("edge"))
            self.assertIsNone(monitor.live_state("edge"))
            self.assertFalse(monitor.telemetry()["cloud"]["configured"])
        finally:
            asyncio.run(monitor.stop())

    def test_configured_but_silent_node_is_unavailable(self):
        monitor = NodeMonitor()
        monitor.nodes["edge"] = NodeTelemetry("EDGE", url="http://127.0.0.1:9", online=False)
        self.assertTrue(monitor.is_unavailable("edge"))
        self.assertIsNone(monitor.live_state("edge"))

    def test_live_node_gives_real_state(self):
        monitor = NodeMonitor()
        monitor.nodes["edge"] = NodeTelemetry(
            "EDGE", url="http://edge:8100", online=True, cpu_load=37.5, task_queue=3, rtt_ms=4.2, bandwidth_gbps=0.18
        )
        state = monitor.live_state("edge")
        self.assertIsNotNone(state)
        self.assertEqual((state.cpu_load, state.task_queue, state.network_latency, state.bandwidth), (37.5, 3, 4.2, 0.18))


class TestNodeLimits(unittest.TestCase):
    """Tasks a node's host can't run (reported in /status) are routed elsewhere."""

    def monitor(self, **cloud):
        mon = NodeMonitor()
        mon.nodes["cloud"] = NodeTelemetry("CLOUD", url="https://cloud.example", online=True, **cloud)
        return mon

    def test_status_reports_capabilities(self):
        body = TestClient(node_app).get("/status").json()
        self.assertIn("video", body["capabilities"])
        self.assertIn("detector", body)

    def test_video_skipped_without_ffmpeg(self):
        mon = self.monitor(video_supported=False)
        self.assertIn("videos", mon.cannot_run("cloud", "VIDEO", 1000))
        self.assertIsNone(mon.cannot_run("cloud", "IMAGE", 1000))

    def test_upload_over_node_limit_is_skipped(self):
        mon = self.monitor(max_upload_mb=4.0)
        self.assertIsNone(mon.cannot_run("cloud", "IMAGE", 3 * 1024 * 1024))
        self.assertIn("4 MB limit", mon.cannot_run("cloud", "IMAGE_BATCH", 5 * 1024 * 1024))

    def test_public_node_without_token_refuses_tasks(self):
        from unittest import mock
        import node.server as server

        with mock.patch.multiple(server, NODE_REQUIRE_TOKEN=True, NODE_TOKEN=""):
            client = TestClient(node_app)
            self.assertEqual(client.get("/health").status_code, 200)
            self.assertEqual(client.get("/status").status_code, 503)

    def test_unconfigured_node_has_no_limits(self):
        self.assertIsNone(NodeMonitor().cannot_run("edge", "VIDEO", 10**9))


class TestOnnxEngine(unittest.TestCase):
    """The Vercel cloud node runs the detector on ONNX Runtime; it must match PyTorch."""

    def test_onnx_matches_pytorch(self):
        try:
            import onnxruntime  # noqa: F401
        except ImportError:
            self.skipTest("onnxruntime not installed")
        from app.services import cv_executor as cv

        image = __import__("PIL.Image", fromlist=["Image"]).open(SAMPLE_IMAGE).convert("RGB")
        t_boxes, t_scores, t_labels = cv._TorchEngine()(image)
        o_boxes, o_scores, o_labels = cv._OnnxEngine()(image)
        keep_t, keep_o = t_scores >= 0.35, o_scores >= 0.35
        self.assertEqual(list(t_labels[keep_t]), list(o_labels[keep_o]))
        self.assertLess(abs(t_boxes[keep_t] - o_boxes[keep_o]).max(), 0.01)


class TestNetworkEmulation(unittest.TestCase):
    """Single-laptop demo: a node can add an emulated link delay, and says so in /status."""

    def test_no_emulation_by_default(self):
        self.assertIsNone(TestClient(node_app).get("/status").json()["network_emulation"])

    def test_emulated_delay_is_applied_and_reported(self):
        import time
        from unittest import mock
        import node.server as server

        settings = {"rtt_ms": 80.0, "jitter_ms": 0.0, "bandwidth_mbps": 8.0}
        with mock.patch.multiple(
            server,
            NETWORK_EMULATION=settings,
            EMULATED_RTT_MS=80.0,
            EMULATED_JITTER_MS=0.0,
            EMULATED_BANDWIDTH_MBPS=8.0,
        ):
            client = TestClient(node_app)
            self.assertEqual(client.get("/status").json()["network_emulation"], settings)
            started = time.perf_counter()
            client.get("/health")
            self.assertGreaterEqual(time.perf_counter() - started, 0.075)
            # 100 KB at 8 Mbps takes 0.1 s on top of the 80 ms round trip.
            started = time.perf_counter()
            client.post("/echo", content=b"x" * 100_000)
            self.assertGreaterEqual(time.perf_counter() - started, 0.17)


if __name__ == "__main__":
    unittest.main(verbosity=2)
