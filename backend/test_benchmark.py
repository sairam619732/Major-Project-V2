"""Unit tests for the Empirical Benchmarking Engine (Phase 15)."""

import os
import tempfile
import numpy as np

from app.ml.benchmark import compute_statistics, run_empirical_benchmark
from app.ml.config import DQNConfig, RewardWeights
from app.ml.agent import DQNAgent


def test_compute_statistics():
    print("1. Testing Statistical Calculation Accuracy...")
    values = [10.0, 20.0, 30.0, 40.0, 50.0]
    stats = compute_statistics(values)

    assert stats["mean"] == 30.0, f"Expected mean 30.0, got {stats['mean']}"
    assert abs(stats["std"] - 15.8114) < 0.001, f"Expected std ~15.8114, got {stats['std']}"
    assert stats["min"] == 10.0
    assert stats["max"] == 50.0
    assert stats["median"] == 30.0
    # 95% CI = 1.96 * (15.8114 / sqrt(5)) = 13.8587
    assert abs(stats["ci_95"] - 13.8587) < 0.01
    print("   PASSED: Mean, std, and 95% confidence interval computed accurately")


def test_benchmark_execution():
    print("2. Testing Controlled Benchmark Execution and Artifact Generation...")
    with tempfile.TemporaryDirectory() as tmpdir:
        # Pre-create agent in tmpdir
        model_path = os.path.join(tmpdir, "test_dqn.pt")
        agent = DQNAgent(config=DQNConfig(model_path=model_path))
        agent.save_checkpoint(model_path)

        data = run_empirical_benchmark(
            model_path=model_path,
            seeds=[42, 99],
            eval_episodes=15,
            output_dir=tmpdir,
            train_if_missing=False,
        )

        # Verify all 6 policies are present
        expected_policies = ["DQN", "Local-Only", "Edge-Only", "Cloud-Only", "Random", "Rule-Based Greedy"]
        for p in expected_policies:
            assert p in data["policies"], f"Missing policy {p} in benchmark summary"
            assert data["policies"][p]["samples"] == 30, f"Expected 30 samples, got {data['policies'][p]['samples']}"

        # Verify comparisons
        assert "DQN_vs_Local-Only" in data["comparisons"]
        assert "DQN_vs_Edge-Only" in data["comparisons"]
        assert "DQN_vs_Cloud-Only" in data["comparisons"]
        assert "DQN_vs_Random" in data["comparisons"]
        assert "DQN_vs_Rule-Based Greedy" in data["comparisons"]

        # Verify output files exist and are non-empty
        assert os.path.exists(os.path.join(tmpdir, "benchmark_summary.json"))
        assert os.path.exists(os.path.join(tmpdir, "benchmark_summary.csv"))
        assert os.path.exists(os.path.join(tmpdir, "benchmark_samples.csv"))
        assert os.path.exists(os.path.join(tmpdir, "BENCHMARK_REPORT.md"))

        with open(os.path.join(tmpdir, "BENCHMARK_REPORT.md"), "r", encoding="utf-8") as f:
            report_text = f.read()
            assert "# Empirical Benchmark Report" in report_text
            for p in expected_policies:
                assert p in report_text
    print("   PASSED: Benchmark ran cleanly, all 6 policies evaluated, and all artifacts generated")


def main():
    print("==================================================")
    print("RUNNING BENCHMARK UNIT TESTS (PHASE 15)")
    print("==================================================")
    test_compute_statistics()
    test_benchmark_execution()
    print("==================================================")
    print("ALL BENCHMARK TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    main()
