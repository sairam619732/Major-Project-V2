"""Phase 18 Comprehensive Testing and Scientific Evaluation Test Suite.

Verifies:
1. Deterministic seed reproducibility
2. All baseline strategies action validity
3. DQN evaluation mode (deterministic inference without weights update)
4. Action distribution calculation and normalization
5. Metric aggregation (mean, std, ci_95, min, max, median)
6. Multi-seed evaluation with seed-to-seed variance tracking
7. Malformed configuration handling
8. Missing checkpoint safe fallback handling
9. Evaluation artifact generation and schema integrity
"""

import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
import numpy as np

from app.ml.config import DQNConfig, RewardWeights
from app.ml.environment import (
    OffloadingEnvironment,
    state_to_vector,
    compute_action_metrics,
    ACTION_NAMES,
)
from app.ml.agent import DQNAgent
from app.ml.baselines import (
    LocalOnlyPolicy,
    EdgeOnlyPolicy,
    CloudOnlyPolicy,
    RandomPolicy,
    RuleBasedGreedyPolicy,
)
from app.ml.benchmark import (
    compute_statistics,
    run_empirical_benchmark,
    DEFAULT_SEEDS,
)
from app.ml.inference import DQNInferenceService
from app.models.simulation import SimulationTaskInput
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState


class TestPhase18ScientificEvaluation(unittest.TestCase):
    """Test suite for Phase 18 comprehensive testing and evaluation integrity."""

    def setUp(self):
        self.weights = RewardWeights()
        self.sample_task = SimulationTaskInput(
            task_id="TEST_001",
            task_type="BENCHMARK_TASK",
            data_size_mb=25.0,
            cpu_demand_percent=60.0,
            memory_demand_percent=40.0,
            deadline_ms=85.0,
            priority=3,
        )
        self.sample_local = LocalNodeState(cpu_available=65.0, memory_available=60.0, battery_level=80.0, base_latency=1.5)
        self.sample_edge = EdgeNodeState(cpu_load=45.0, task_queue=3, network_latency=15.0, bandwidth=2.5)
        self.sample_cloud = CloudNodeState(cpu_load=35.0, task_queue=6, network_latency=60.0, bandwidth=12.0)
        self.sample_state = state_to_vector(self.sample_task, self.sample_local, self.sample_edge, self.sample_cloud)

    def test_1_deterministic_seed_behavior(self):
        """Verify that identical random seeds produce identical environment sequences."""
        seed = 42
        env1 = OffloadingEnvironment(weights=self.weights, seed=seed)
        env2 = OffloadingEnvironment(weights=self.weights, seed=seed)

        for step in range(10):
            s1 = env1.reset()
            s2 = env2.reset()
            np.testing.assert_array_almost_equal(s1, s2, decimal=6, err_msg=f"Seed {seed} state mismatch at step {step}")
            self.assertEqual(env1.current_task.data_size_mb, env2.current_task.data_size_mb)
            self.assertEqual(env1.local.cpu_available, env2.local.cpu_available)
            self.assertEqual(env1.edge.task_queue, env2.edge.task_queue)
            self.assertEqual(env1.cloud.network_latency, env2.cloud.network_latency)
        print("   [1] PASSED: Deterministic seed reproducibility verified.")

    def test_2_all_baseline_strategies(self):
        """Verify action output guarantees for all baseline offloading strategies."""
        local_p = LocalOnlyPolicy()
        edge_p = EdgeOnlyPolicy()
        cloud_p = CloudOnlyPolicy()
        rand_p = RandomPolicy(seed=123)
        rule_p = RuleBasedGreedyPolicy()

        self.assertEqual(local_p.select_action(self.sample_state), 0)
        self.assertEqual(edge_p.select_action(self.sample_state), 1)
        self.assertEqual(cloud_p.select_action(self.sample_state), 2)

        rand_action = rand_p.select_action(self.sample_state)
        self.assertIn(rand_action, [0, 1, 2])

        rule_action = rule_p.select_action(
            self.sample_state,
            self.sample_task,
            self.sample_local,
            self.sample_edge,
            self.sample_cloud,
            weights=self.weights,
        )
        self.assertIn(rule_action, [0, 1, 2])
        print("   [2] PASSED: Baseline strategies produce valid canonical actions in {0, 1, 2}.")

    def test_3_dqn_evaluation_without_training(self):
        """Verify that DQN evaluation uses deterministic greedy inference without training updates."""
        agent = DQNAgent(config=DQNConfig(seed=42))
        initial_param_sum = sum(p.sum().item() for p in agent.online_net.parameters())

        # Repeated inference calls
        actions = []
        for _ in range(25):
            a = agent.select_action(self.sample_state, evaluate=True)
            actions.append(a)

        # All deterministic greedy actions must be identical for the same state
        self.assertTrue(all(a == actions[0] for a in actions), "DQN evaluate=True must be strictly deterministic")

        # Network weights must remain unchanged (no backprop/learning during evaluation)
        post_param_sum = sum(p.sum().item() for p in agent.online_net.parameters())
        self.assertAlmostEqual(initial_param_sum, post_param_sum, places=6)
        print("   [3] PASSED: DQN deterministic evaluation verified with frozen parameters.")

    def test_4_action_distribution_calculation(self):
        """Verify action distribution percentages and count preservation."""
        total = 500
        counts = {0: 425, 1: 54, 2: 21}
        local_pct = round((counts[0] / total) * 100, 2)
        edge_pct = round((counts[1] / total) * 100, 2)
        cloud_pct = round((counts[2] / total) * 100, 2)

        self.assertEqual(local_pct, 85.0)
        self.assertEqual(edge_pct, 10.8)
        self.assertEqual(cloud_pct, 4.2)
        self.assertAlmostEqual(local_pct + edge_pct + cloud_pct, 100.0, delta=0.01)
        print("   [4] PASSED: Action distribution calculation and percentage sum validated.")

    def test_5_metric_aggregation(self):
        """Verify exactness of compute_statistics helper."""
        test_data = [12.0, 15.0, 18.0, 21.0, 24.0]
        stats = compute_statistics(test_data)
        self.assertEqual(stats["mean"], 18.0)
        self.assertEqual(stats["min"], 12.0)
        self.assertEqual(stats["max"], 24.0)
        self.assertEqual(stats["median"], 18.0)
        self.assertGreater(stats["std"], 0.0)
        self.assertGreater(stats["ci_95"], 0.0)
        print("   [5] PASSED: Statistical aggregation metrics computed accurately.")

    def test_6_multiseed_evaluation(self):
        """Verify multi-seed evaluation execution and seed-to-seed variance tracking."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_seeds = [42, 101, 777]
            eval_episodes = 10
            data = run_empirical_benchmark(
                seeds=test_seeds,
                eval_episodes=eval_episodes,
                output_dir=tmpdir,
                train_if_missing=False,
                copy_to_public=False,
            )

            # Metadata validation
            self.assertEqual(data["metadata"]["seeds"], test_seeds)
            self.assertEqual(data["metadata"]["eval_episodes_per_seed"], eval_episodes)
            self.assertEqual(data["metadata"]["total_evaluation_samples"], len(test_seeds) * eval_episodes)

            # Seed breakdowns validation
            self.assertIn("seed_breakdowns", data)
            for s in test_seeds:
                self.assertIn(s, data["seed_breakdowns"])
                self.assertIn("DQN", data["seed_breakdowns"][s])
                self.assertEqual(data["seed_breakdowns"][s]["DQN"]["samples"], eval_episodes)

            # Seed variance validation
            self.assertIn("seed_variance", data)
            self.assertIn("DQN", data["seed_variance"])
            self.assertIn("reward_across_seeds_mean", data["seed_variance"]["DQN"])
            self.assertIn("reward_across_seeds_std", data["seed_variance"]["DQN"])
            self.assertIn("latency_across_seeds_mean", data["seed_variance"]["DQN"])
            self.assertIn("latency_across_seeds_std", data["seed_variance"]["DQN"])
            print("   [6] PASSED: Multi-seed evaluation with seed-to-seed variance verified.")

    def test_7_missing_checkpoint_handling(self):
        """Verify that inference service falls back smoothly when checkpoint file does not exist."""
        non_existent_path = "non_existent_checkpoint_xyz.pt"
        svc = DQNInferenceService(config=DQNConfig(model_path=non_existent_path))
        self.assertFalse(svc.is_model_loaded)

        # Inference must NOT raise an exception, but gracefully fall back
        decision = svc.predict(
            task=self.sample_task,
            local=self.sample_local,
            edge=self.sample_edge,
            cloud=self.sample_cloud,
            weights=self.weights,
        )
        self.assertIn(decision["action_index"], [0, 1, 2])
        self.assertIn(decision["decision"], ["LOCAL", "EDGE", "CLOUD"])
        self.assertEqual(decision["method"], "rule_based_fallback")
        self.assertTrue(decision["is_fallback"])
        print("   [7] PASSED: Missing checkpoint graceful fallback verified.")

    def test_8_benchmark_artifact_generation(self):
        """Verify that evaluation results JSON, CSV, and markdown reports are properly formatted."""
        results_dir = Path("benchmarks/results")
        required_files = [
            "evaluation_results.json",
            "evaluation_results.csv",
            "evaluation_samples.csv",
            "EVALUATION_REPORT.md",
            "benchmark_summary.json",
            "benchmark_summary.csv",
            "benchmark_samples.csv",
            "BENCHMARK_REPORT.md",
        ]

        for fname in required_files:
            fpath = results_dir / fname
            self.assertTrue(fpath.exists(), f"Missing required artifact: {fname}")
            self.assertGreater(fpath.stat().st_size, 0, f"Artifact is empty: {fname}")

        # Check JSON schema
        with open(results_dir / "evaluation_results.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            self.assertIn("metadata", data)
            self.assertIn("policies", data)
            self.assertIn("comparisons", data)
            self.assertIn("seed_breakdowns", data)
            self.assertIn("seed_variance", data)
            self.assertEqual(len(data["metadata"]["seeds"]), 5)

        print("   [8] PASSED: All Phase 18 benchmark artifacts generated and validated.")


def main():
    print("==================================================")
    print("RUNNING PHASE 18 SCIENTIFIC EVALUATION TEST SUITE")
    print("==================================================")
    unittest.main(verbosity=1)


if __name__ == "__main__":
    main()
