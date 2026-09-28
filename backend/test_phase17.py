"""Unit and integration test suite for Phase 17: Final DQN Algorithm Integration."""

import os
import unittest
import numpy as np
import torch

from app.models.simulation import SimulationTaskInput
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState
from app.ml.config import DQNConfig
from app.ml.environment import state_to_vector, ACTION_NAMES
from app.ml.inference import DQNInferenceService, inference_service
from app.services.evaluator import evaluate_simulation


class TestPhase17DQNIntegration(unittest.TestCase):
    """Rigorous validation of DQN loading, state construction, inference, and fallback."""

    def setUp(self):
        self.sample_task = SimulationTaskInput(
            task_id="TASK_UNIT_01",
            task_type="OBJECT_DETECTION",
            data_size_mb=25.0,
            cpu_demand_percent=60.0,
            memory_demand_percent=40.0,
            deadline_ms=50.0,
            priority=3,
        )
        self.sample_local = LocalNodeState(
            cpu_available=40.0,
            memory_available=50.0,
            battery_level=75.0,
            base_latency=1.0,
        )
        self.sample_edge = EdgeNodeState(
            cpu_load=35.0,
            task_queue=2,
            network_latency=4.0,
            bandwidth=12.0,
        )
        self.sample_cloud = CloudNodeState(
            cpu_load=65.0,
            task_queue=15,
            network_latency=40.0,
            bandwidth=25.0,
        )

    def test_canonical_state_construction(self):
        """Validates that state vector has exact length 17 and strictly bounded [0.0, 1.0]."""
        vec = state_to_vector(self.sample_task, self.sample_local, self.sample_edge, self.sample_cloud)
        self.assertEqual(vec.shape, (17,))
        self.assertTrue(np.all(vec >= 0.0), f"Values below 0: {vec}")
        self.assertTrue(np.all(vec <= 1.0), f"Values above 1: {vec}")
        print("1. Canonical 17-D state construction verified.")

    def test_action_mapping_integrity(self):
        """Validates that action space maps strictly to {0: 'LOCAL', 1: 'EDGE', 2: 'CLOUD'}."""
        self.assertEqual(ACTION_NAMES[0], "LOCAL")
        self.assertEqual(ACTION_NAMES[1], "EDGE")
        self.assertEqual(ACTION_NAMES[2], "CLOUD")
        print("2. Action space mapping verified: 0=LOCAL, 1=EDGE, 2=CLOUD.")

    def test_production_dqn_inference(self):
        """Validates live production DQN inference with loaded checkpoint."""
        res = inference_service.predict(
            task=self.sample_task,
            local=self.sample_local,
            edge=self.sample_edge,
            cloud=self.sample_cloud,
        )
        self.assertIn(res["decision"], ["LOCAL", "EDGE", "CLOUD"])
        self.assertIn(res["action_index"], [0, 1, 2])
        self.assertGreaterEqual(res["confidence"], 0.33)
        self.assertIn("local", res["q_values"])
        self.assertIn("edge", res["q_values"])
        self.assertIn("cloud", res["q_values"])
        self.assertEqual(res["method"], "dqn")
        self.assertFalse(res["is_fallback"])
        print(f"3. Live DQN inference verified (Decision: {res['decision']}, Confidence: {res['confidence']:.4f}).")

    def test_deterministic_greedy_inference(self):
        """Validates that repeated calls without temperature noise produce identical deterministic actions."""
        res1 = inference_service.predict(self.sample_task, self.sample_local, self.sample_edge, self.sample_cloud)
        res2 = inference_service.predict(self.sample_task, self.sample_local, self.sample_edge, self.sample_cloud)
        self.assertEqual(res1["decision"], res2["decision"])
        self.assertEqual(res1["action_index"], res2["action_index"])
        self.assertEqual(res1["confidence"], res2["confidence"])
        self.assertEqual(res1["q_values"], res2["q_values"])
        print("4. Deterministic greedy inference verified across repeated calls.")

    def test_safe_rule_based_fallback(self):
        """Validates that missing or corrupted checkpoint triggers rule-based fallback with explicit flag."""
        fake_cfg = DQNConfig(model_path="app/ml/checkpoints/non_existent_checkpoint_404.pt")
        fallback_service = DQNInferenceService(config=fake_cfg)
        self.assertFalse(fallback_service.is_model_loaded)

        res = fallback_service.predict(self.sample_task, self.sample_local, self.sample_edge, self.sample_cloud)
        self.assertEqual(res["method"], "rule_based_fallback")
        self.assertTrue(res["is_fallback"])
        self.assertAlmostEqual(res["confidence"], 0.3333, places=3)
        self.assertIn(res["decision"], ["LOCAL", "EDGE", "CLOUD"])
        self.assertIsNotNone(res.get("note"))
        print("5. Missing checkpoint fallback verified (Explicit is_fallback=True, method='rule_based_fallback').")

    def test_simulation_pipeline_dqn_integration(self):
        """Validates that evaluate_simulation uses DQN decision by default."""
        sim_res = evaluate_simulation(
            task=self.sample_task,
            local=self.sample_local,
            edge=self.sample_edge,
            cloud=self.sample_cloud,
            algorithm="dqn",
        )
        self.assertEqual(sim_res.status, "success")
        self.assertIn(sim_res.selectedTarget, ["local", "edge", "cloud"])
        self.assertEqual(sim_res.method, "dqn")
        self.assertFalse(sim_res.is_fallback)
        self.assertIsNotNone(sim_res.confidence)
        self.assertIn("DQN agent selected", sim_res.reason)
        print("6. Simulation pipeline DQN integration verified with explainable reason.")


if __name__ == "__main__":
    print("==================================================")
    print("RUNNING PHASE 17 DQN INTEGRATION TESTS")
    print("==================================================")
    unittest.main()
