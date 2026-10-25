"""Cost model v2 (calibrated), checkpoint versions, and the v1 pin for the dataset.

Run from backend/:  .venv\\Scripts\\python.exe -m tests.test_calibrated_model
"""

import hashlib
import json
import sys
import unittest
from pathlib import Path

from app.ml import calibration, environment
from app.ml.agent import DQNAgent
from app.ml.config import DQNConfig
from app.models.simulation import SimulationTaskInput
from app.models.system import CloudNodeState, EdgeNodeState, LocalNodeState

BACKEND = Path(__file__).resolve().parents[1]
CHECKPOINTS = BACKEND / "app" / "ml" / "checkpoints"


def state(size_mb=1.0, cpu_free=80.0, edge_bw=0.008, edge_rtt=20.0):
    task = SimulationTaskInput(task_id="T", task_type="OBJECT_DETECTION", data_size_mb=size_mb,
                               cpu_demand_percent=55.0, memory_demand_percent=35.0, deadline_ms=1000.0, priority=3)
    local = LocalNodeState(cpu_available=cpu_free, memory_available=50.0, battery_level=90.0, base_latency=1.2)
    edge = EdgeNodeState(cpu_load=0.0, task_queue=0, network_latency=edge_rtt, bandwidth=edge_bw)
    cloud = CloudNodeState(cpu_load=0.0, task_queue=0, network_latency=30.0, bandwidth=0.05)
    return task, local, edge, cloud


class TestCostModelV2(unittest.TestCase):
    def test_transfer_time_units(self):
        # 1 MB over 8 Mbit/s (0.008 Gbps) takes 1 s to send. v2: RTT + 1000 ms + measured detection.
        m = environment.compute_action_metrics(*state(size_mb=1.0, edge_bw=0.008), action=1, version="v2")
        expected = 20.0 + 1000.0 + calibration.detection_ms("edge", 1.0)
        self.assertAlmostEqual(m["latency_ms"], expected, delta=0.5)

    def test_v1_kept_its_original_behaviour(self):
        # v1 adds transfer in seconds as if milliseconds (the bug v2 fixes): 1 MB at 0.008 Gbps -> 1.0 "ms".
        m = environment.compute_action_metrics(*state(size_mb=1.0, edge_bw=0.008), action=1, version="v1")
        self.assertLess(m["latency_ms"], 100.0)

    def test_busy_laptop_is_slower_locally(self):
        idle = environment.compute_action_metrics(*state(cpu_free=90.0), action=0, version="v2")
        busy = environment.compute_action_metrics(*state(cpu_free=10.0), action=0, version="v2")
        self.assertGreater(busy["latency_ms"], idle["latency_ms"] * 1.5)

    def test_long_tasks_still_differ(self):
        # The log scale keeps 11 s and 24 s apart (a fixed cap would score both the same).
        fast = environment.compute_action_metrics(*state(size_mb=30.0, cpu_free=90.0), action=0, version="v2")
        slow = environment.compute_action_metrics(*state(size_mb=30.0, cpu_free=5.0), action=0, version="v2")
        self.assertGreater(fast["reward"], slow["reward"])

    def test_calibration_is_measured_and_traceable(self):
        data = json.loads(calibration.CALIBRATION_PATH.read_text(encoding="utf-8"))
        for tier in ("local", "edge", "cloud"):
            self.assertTrue(data[tier]["measured"], tier)
            self.assertGreater(data[tier]["r2"], 0.8, tier)
            self.assertIn("host", data[tier])
        self.assertIn("GPU", data["cloud"]["device"])


class TestCheckpointVersions(unittest.TestCase):
    def load_version(self, path):
        agent = DQNAgent(config=DQNConfig(model_path=str(path)))
        self.assertTrue(agent.load_checkpoint(str(path)))
        return agent.checkpoint_meta["cost_model_version"]

    def test_backup_is_v1_and_live_is_v2(self):
        self.assertEqual(self.load_version(CHECKPOINTS / "backup_v1_2026-10-25" / "dqn_offloading_best.pt"), "v1")
        self.assertEqual(self.load_version(CHECKPOINTS / "dqn_offloading_best.pt"), "v2")

    def test_live_model_is_the_compared_winner(self):
        live = hashlib.sha256((CHECKPOINTS / "dqn_offloading_best.pt").read_bytes()).hexdigest()
        winner = hashlib.sha256((CHECKPOINTS / "dqn_offloading_v2.pt").read_bytes()).hexdigest()
        self.assertEqual(live, winner)
        report = json.loads((BACKEND / "benchmarks" / "results_v2" / "model_comparison.json").read_text(encoding="utf-8"))
        self.assertTrue(report["new_is_better"])
        self.assertTrue(report["paired_tests"]["new_minus_old"]["significant"])

    def test_inference_follows_the_checkpoint(self):
        from app.ml.inference import inference_service

        self.assertEqual(inference_service.cost_model_version, "v2")
        self.assertEqual(environment.active_cost_model(), "v2")


class TestDatasetStaysOnV1(unittest.TestCase):
    """The teammates' dataset generator is pinned to v1, whatever model is live."""

    def test_generator_uses_v1(self):
        sys.path.insert(0, str(BACKEND.parent / "data" / "pipeline"))
        source = (BACKEND.parent / "data" / "pipeline" / "generate_dataset.py").read_text(encoding="utf-8")
        self.assertIn('version="v1"', source)
        environment.set_cost_model("v2")
        task, local, edge, cloud = state()
        v1 = environment.compute_action_metrics(task, local, edge, cloud, 1, version="v1")
        v2 = environment.compute_action_metrics(task, local, edge, cloud, 1)
        self.assertNotEqual(v1["latency_ms"], v2["latency_ms"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
