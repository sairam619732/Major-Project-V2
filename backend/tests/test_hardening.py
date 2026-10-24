"""Tests for the backend's input handling on /api/simulation/execute and /api/optimization/train.

Run from backend/:  .venv\\Scripts\\python.exe -m tests.test_hardening
"""

import os
import unittest
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient

from app.main import app
from app.services import workload_limits
from node.server import app as node_app

SAMPLE = (Path(__file__).resolve().parents[2] / "public" / "samples" / "traffic_monitoring.jpg").read_bytes()


class TestExecuteInputs(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def execute(self, files, **form):
        return self.client.post("/api/simulation/execute", files=files, data=form)

    def test_broken_image_is_a_clear_400(self):
        res = self.execute([("files", ("broken.jpg", b"not an image", "image/jpeg"))])
        self.assertEqual(res.status_code, 400)
        self.assertIn("not a readable", res.json()["detail"])

    def test_zero_what_if_values_are_kept(self):
        # An empty edge queue (0) used to be replaced by the default of 2.
        res = self.execute(
            [("files", ("a.jpg", SAMPLE, "image/jpeg"))],
            edge_task_queue="0", edge_cpu_load="0", cloud_task_queue="0",
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["candidateScores"]["edge"]["breakdown"]["queueCost"], 0.0)

    def test_out_of_range_priority_is_clamped(self):
        res = self.execute([("files", ("a.jpg", SAMPLE, "image/jpeg"))], priority="9")
        self.assertEqual(res.status_code, 200, res.text)

    def test_oversized_upload_is_refused_while_reading(self):
        with mock.patch.object(workload_limits, "MAX_IMAGE_MB", 1):
            res = self.execute([("files", ("big.jpg", b"\0" * (2 * 1024 * 1024), "image/jpeg"))])
        self.assertEqual(res.status_code, 413)

    def test_preview_image_is_shrunk(self):
        res = self.execute([("files", ("a.jpg", SAMPLE, "image/jpeg"))])
        self.assertEqual(res.status_code, 200, res.text)
        self.assertTrue(res.json()["annotated_image_base64"].startswith("data:image/jpeg;base64,"))


class TestRoutingAroundNodeLimits(unittest.TestCase):
    """A task over the cloud node's upload limit (e.g. Vercel's 4.5 MB) goes to another tier."""

    def test_oversized_task_is_not_sent_to_cloud(self):
        from app.api import simulation as sim
        from app.services.remote_nodes import NodeTelemetry

        cloud = NodeTelemetry("CLOUD", url="https://cloud.example", online=True, max_upload_mb=0.01)
        real_predict = sim.inference_service.predict

        def predict_cloud(**kwargs):
            res = real_predict(**kwargs)
            res.update(decision="CLOUD", action_index=2, q_values={"local": -1.0, "edge": -2.0, "cloud": -0.5})
            return res

        with mock.patch.dict(sim.node_monitor.nodes, {"cloud": cloud}), mock.patch.object(
            sim.inference_service, "predict", side_effect=predict_cloud
        ):
            res = TestClient(app).post(
                "/api/simulation/execute", files=[("files", ("a.jpg", SAMPLE, "image/jpeg"))]
            )
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["decision"], "LOCAL")
        self.assertIn("over the cloud node's", body["environment_description"])


class TestTrainingEndpoint(unittest.TestCase):
    def test_training_is_off_by_default(self):
        with mock.patch.dict(os.environ, {"ENABLE_TRAINING_API": ""}):
            res = TestClient(app).post("/api/optimization/train", json={"episodes": 1})
        self.assertEqual(res.status_code, 403)


class TestNodeInputs(unittest.TestCase):
    def test_node_rejects_broken_image(self):
        res = TestClient(node_app).post(
            "/execute", files=[("files", ("broken.jpg", b"not an image", "image/jpeg"))], data={"workload_type": "IMAGE"}
        )
        self.assertEqual(res.status_code, 400)

    def test_echo_refuses_huge_blocks(self):
        res = TestClient(node_app).post("/echo", content=b"x" * (5 * 1024 * 1024))
        self.assertEqual(res.status_code, 413)


if __name__ == "__main__":
    unittest.main(verbosity=2)
