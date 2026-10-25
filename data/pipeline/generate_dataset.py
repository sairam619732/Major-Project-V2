"""Generate the synthetic cloud/edge offloading dataset from the backend's cost model.

Each row samples a task and the local/edge/cloud node states from the same distributions the DQN
environment trains on (backend/app/ml/environment.py), scores all three actions with
`compute_action_metrics`, and labels the row with the action that has the highest reward. Latency,
energy, cost and the optimal action therefore follow from the features instead of being random.

Usage (from the repo root, with the backend virtualenv):
    backend/.venv/Scripts/python.exe data/pipeline/generate_dataset.py [--rows 20000] [--seed 42]
"""

from __future__ import annotations

import argparse
import csv
import random
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.ml.config import RewardWeights  # noqa: E402
from app.ml.environment import ACTION_NAMES, compute_action_metrics  # noqa: E402
from app.models.simulation import SimulationTaskInput  # noqa: E402
from app.models.system import CloudNodeState, EdgeNodeState, LocalNodeState  # noqa: E402

DEFAULT_OUTPUT = REPO_ROOT / "data" / "raw" / "synthetic_cloud_edge_offloading_dataset.csv"

# Column order is consumed by /api/dataset and the /dataset page; keep names stable.
# Units: latency in ms, energy in joules, cost in relative cost units, reward = -weighted cost.
COLUMNS = [
    "sample_id", "task_type", "data_size_mb", "cpu_demand_percent", "memory_demand_percent",
    "deadline_ms", "priority", "local_cpu_available_percent", "local_memory_available_percent",
    "local_battery_percent", "local_base_latency_ms", "edge_cpu_load_percent", "edge_task_queue",
    "edge_network_latency_ms", "edge_bandwidth_gbps", "cloud_cpu_load_percent", "cloud_task_queue",
    "cloud_network_latency_ms", "cloud_bandwidth_gbps", "local_latency_ms", "edge_latency_ms",
    "cloud_latency_ms", "local_energy_units", "edge_energy_units", "cloud_energy_units",
    "local_cost_units", "edge_cost_units", "cloud_cost_units", "optimal_action", "optimal_action_index",
    "optimal_reward",
]

TASK_TYPES = ["IMAGE", "VIDEO", "SENSOR"]


def sample_row(rng: random.Random, sample_id: int, weights: RewardWeights) -> list:
    """One labelled sample, drawn like OffloadingEnvironment.reset() draws an episode state."""
    task = SimulationTaskInput(
        task_id=f"TASK_{sample_id:05d}",
        task_type=rng.choice(TASK_TYPES),
        data_size_mb=round(rng.uniform(5.0, 60.0), 1),
        cpu_demand_percent=round(rng.uniform(20.0, 90.0), 1),
        memory_demand_percent=round(rng.uniform(15.0, 75.0), 1),
        deadline_ms=round(rng.uniform(30.0, 250.0), 1),
        priority=rng.choice([1, 2, 3, 4, 5]),
    )
    local = LocalNodeState(
        cpu_available=round(rng.uniform(30.0, 90.0), 1),
        memory_available=round(rng.uniform(40.0, 85.0), 1),
        battery_level=round(rng.uniform(40.0, 100.0), 1),
        base_latency=round(rng.uniform(0.5, 3.0), 1),
    )
    edge = EdgeNodeState(
        cpu_load=round(rng.uniform(20.0, 75.0), 1),
        task_queue=rng.randint(0, 15),
        network_latency=round(rng.uniform(5.0, 35.0), 1),
        bandwidth=round(rng.uniform(1.0, 20.0), 1),
    )
    cloud = CloudNodeState(
        cpu_load=round(rng.uniform(20.0, 80.0), 1),
        task_queue=rng.randint(2, 25),
        network_latency=round(rng.uniform(40.0, 120.0), 1),
        bandwidth=round(rng.uniform(5.0, 40.0), 1),
    )

    # Pinned to the original cost model so the dataset stays reproducible (teammates' XGBoost work).
    metrics = [compute_action_metrics(task, local, edge, cloud, a, weights, version="v1") for a in (0, 1, 2)]
    best = max(metrics, key=lambda m: m["reward"])

    return [
        sample_id, task.task_type, task.data_size_mb, task.cpu_demand_percent,
        task.memory_demand_percent, task.deadline_ms, task.priority,
        local.cpu_available, local.memory_available, local.battery_level, local.base_latency,
        edge.cpu_load, edge.task_queue, edge.network_latency, edge.bandwidth,
        cloud.cpu_load, cloud.task_queue, cloud.network_latency, cloud.bandwidth,
        *(m["latency_ms"] for m in metrics),
        *(m["energy_joules"] for m in metrics),
        *(m["cost"] for m in metrics),
        ACTION_NAMES[best["action"]], best["action"], best["reward"],
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--rows", type=int, default=20000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    weights = RewardWeights()
    args.output.parent.mkdir(parents=True, exist_ok=True)

    counts = {name: 0 for name in ACTION_NAMES.values()}
    with args.output.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(COLUMNS)
        for i in range(1, args.rows + 1):
            row = sample_row(rng, i, weights)
            counts[row[-3]] += 1
            writer.writerow(row)

    print(f"Wrote {args.rows} rows to {args.output}")
    for name, n in counts.items():
        print(f"  optimal {name:<5} {n:>6}  ({n / args.rows:.1%})")


if __name__ == "__main__":
    main()
