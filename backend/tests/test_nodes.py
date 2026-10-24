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


if __name__ == "__main__":
    unittest.main(verbosity=2)
