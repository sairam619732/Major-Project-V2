"""Compare the current DQN checkpoint with a candidate on the calibrated cost model (v2).

Run from backend/:
    .venv\\Scripts\\python.exe scripts\\compare_dqn_models.py --old <checkpoint> --new <checkpoint>

Every policy decides on the SAME tasks: states drawn from the v2 environment with seeds not used in
training. Each model sees the inputs scaled the way it was trained (from its checkpoint). All
choices are scored with cost model v2. Also reported: agreement with the cost model's best choice
(the oracle, an upper bound that knows the exact costs), fixed baselines, and named scenarios that
match the deployed system. Writes benchmarks/results_v2/model_comparison.json and .md.
"""

import argparse
import json
import math
import statistics
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

import torch  # noqa: E402

from app.ml.agent import DQNAgent  # noqa: E402
from app.ml.config import DQNConfig  # noqa: E402
from app.ml.environment import ACTION_NAMES, OffloadingEnvironment, compute_action_metrics, state_to_vector  # noqa: E402
from app.models.simulation import SimulationTaskInput  # noqa: E402
from app.models.system import CloudNodeState, EdgeNodeState, LocalNodeState  # noqa: E402

SEEDS = [101, 202, 303, 404, 505]
TASKS_PER_SEED = 400


class Policy:
    def __init__(self, path: str):
        ckpt = torch.load(path, map_location="cpu", weights_only=False)
        self.version = ckpt.get("cost_model_version", "v1")
        self.agent = DQNAgent(config=DQNConfig(model_path=path), device=torch.device("cpu"))
        if not self.agent.load_checkpoint(path):
            raise SystemExit(f"Could not load {path}")
        self.agent.online_net.eval()

    def act(self, task, local, edge, cloud) -> int:
        vec = state_to_vector(task, local, edge, cloud, version=self.version)
        with torch.no_grad():
            q = self.agent.online_net(torch.tensor(vec, dtype=torch.float32).unsqueeze(0))[0]
        return int(torch.argmax(q).item())


def rewards(task, local, edge, cloud):
    return [compute_action_metrics(task, local, edge, cloud, a, version="v2") for a in (0, 1, 2)]


def summarize(values):
    mean = statistics.fmean(values)
    ci = 1.96 * statistics.stdev(values) / math.sqrt(len(values)) if len(values) > 1 else 0.0
    return round(mean, 4), round(ci, 4)


def scenarios():
    """Situations of the deployed system (inputs as the backend builds them from real photos)."""
    photo = dict(data_size_mb=0.47, cpu_demand_percent=54.8, memory_demand_percent=31.7)
    batch10 = dict(data_size_mb=4.7, cpu_demand_percent=77.0, memory_demand_percent=70.6)
    batch50 = dict(data_size_mb=23.5, cpu_demand_percent=95.0, memory_demand_percent=90.0)
    radmin_edge = dict(cpu_load=5.0, task_queue=0, network_latency=20.0, bandwidth=0.05)
    radmin_cloud = dict(cpu_load=5.0, task_queue=0, network_latency=30.0, bandwidth=0.05)
    out = []
    for name, task, cpu_free in (
        ("1 photo, idle laptop", photo, 80.0),
        ("1 photo, busy laptop (10% CPU free)", photo, 10.0),
        ("10-photo batch, idle laptop", batch10, 80.0),
        ("10-photo batch, busy laptop", batch10, 10.0),
        ("50-photo batch, idle laptop", batch50, 80.0),
        ("50-photo batch, busy laptop", batch50, 10.0),
    ):
        out.append((
            name,
            SimulationTaskInput(task_id="S", task_type="OBJECT_DETECTION", deadline_ms=1000.0, priority=3, **task),
            LocalNodeState(cpu_available=cpu_free, memory_available=50.0, battery_level=90.0, base_latency=1.2),
            EdgeNodeState(**radmin_edge),
            CloudNodeState(**radmin_cloud),
        ))
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--old", required=True)
    parser.add_argument("--new", required=True)
    parser.add_argument("--out", default=str(BACKEND / "benchmarks" / "results_v2"))
    args = parser.parse_args()
    policies = {"old_dqn": Policy(args.old), "new_dqn": Policy(args.new)}

    names = ["old_dqn", "new_dqn", "oracle", "local_only", "edge_only", "cloud_only"]
    rewards_by = {n: [] for n in names}
    agree = {"old_dqn": 0, "new_dqn": 0}
    actions = {n: [0, 0, 0] for n in names}
    feasible = {n: 0 for n in names}
    latency = {n: [] for n in names}
    total = 0
    for seed in SEEDS:
        env = OffloadingEnvironment(seed=seed, version="v2")
        for i in range(TASKS_PER_SEED):
            env.reset(seed=seed * 100000 + i)
            task, local, edge, cloud = env.current_task, env.local, env.edge, env.cloud
            m = rewards(task, local, edge, cloud)
            best = max(range(3), key=lambda a: m[a]["reward"])
            choice = {"oracle": best, "local_only": 0, "edge_only": 1, "cloud_only": 2}
            for n, p in policies.items():
                choice[n] = p.act(task, local, edge, cloud)
                agree[n] += choice[n] == best
            for n in names:
                a = choice[n]
                rewards_by[n].append(m[a]["reward"])
                actions[n][a] += 1
                feasible[n] += m[a]["feasible"]
                latency[n].append(m[a]["latency_ms"])
            total += 1

    table = {}
    for n in names:
        mean, ci = summarize(rewards_by[n])
        table[n] = {
            "mean_reward": mean,
            "ci95": ci,
            "deadline_met_pct": round(100 * feasible[n] / total, 1),
            "median_latency_ms": round(statistics.median(latency[n]), 1),
            "actions_pct": {ACTION_NAMES[a]: round(100 * c / total, 1) for a, c in enumerate(actions[n])},
            "oracle_agreement_pct": round(100 * agree[n] / total, 1) if n in agree else None,
        }

    scen = []
    for name, task, local, edge, cloud in scenarios():
        m = rewards(task, local, edge, cloud)
        best = max(range(3), key=lambda a: m[a]["reward"])
        scen.append({
            "scenario": name,
            "oracle": ACTION_NAMES[best],
            "old_dqn": ACTION_NAMES[policies["old_dqn"].act(task, local, edge, cloud)],
            "new_dqn": ACTION_NAMES[policies["new_dqn"].act(task, local, edge, cloud)],
            "latency_ms_local_edge_cloud": [m[a]["latency_ms"] for a in (0, 1, 2)],
        })

    def paired(a, b):
        """Mean of (a - b) per task with its 95% CI: the right test when both run on the same tasks."""
        diffs = [x - y for x, y in zip(rewards_by[a], rewards_by[b])]
        mean, ci = summarize(diffs)
        return {"mean_diff": mean, "ci95": ci, "significant": abs(mean) > ci}

    paired_tests = {
        "new_minus_old": paired("new_dqn", "old_dqn"),
        "new_minus_local_only": paired("new_dqn", "local_only"),
        "oracle_minus_new": paired("oracle", "new_dqn"),
    }
    old, new = table["old_dqn"], table["new_dqn"]
    better = (new["mean_reward"] - new["ci95"] > old["mean_reward"] + old["ci95"]
              and new["oracle_agreement_pct"] > old["oracle_agreement_pct"])
    result = {
        "evaluated_on": "cost model v2 (calibrated)",
        "seeds": SEEDS,
        "tasks": total,
        "old_checkpoint": {"path": args.old, "cost_model": policies["old_dqn"].version},
        "new_checkpoint": {"path": args.new, "cost_model": policies["new_dqn"].version},
        "policies": table,
        "paired_tests": paired_tests,
        "scenarios": scen,
        "decision_rule": "switch only if new mean reward is higher with non-overlapping 95% CIs AND oracle agreement is higher",
        "new_is_better": better,
    }
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "model_comparison.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    lines = ["# DQN model comparison (cost model v2, calibrated)", "",
             f"{total} tasks, seeds {SEEDS} (not used in training). Same tasks for every policy.", "",
             "| Policy | Mean reward (±95% CI) | Oracle agreement | Deadline met | Median latency | LOCAL / EDGE / CLOUD |",
             "| --- | --- | --- | --- | --- | --- |"]
    for n in names:
        r = table[n]
        acts = " / ".join(f"{r['actions_pct'][k]}%" for k in ("LOCAL", "EDGE", "CLOUD"))
        agreement = f"{r['oracle_agreement_pct']}%" if r["oracle_agreement_pct"] is not None else "-"
        lines.append(f"| {n} | {r['mean_reward']} ± {r['ci95']} | {agreement} | {r['deadline_met_pct']}% | {r['median_latency_ms']} ms | {acts} |")
    lines += ["", "Paired differences in mean reward (same tasks; positive = first is better):", ""]
    for k, v in paired_tests.items():
        lines.append(f"- {k.replace('_', ' ')}: {v['mean_diff']:+.4f} ± {v['ci95']} ({'significant' if v['significant'] else 'not significant'})")
    lines += ["", "| Scenario | Oracle | Old DQN | New DQN | Est. latency L/E/C (ms) |", "| --- | --- | --- | --- | --- |"]
    for s in scen:
        lines.append(f"| {s['scenario']} | {s['oracle']} | {s['old_dqn']} | {s['new_dqn']} | " + " / ".join(f"{v:.0f}" for v in s["latency_ms_local_edge_cloud"]) + " |")
    lines += ["", f"Decision rule: {result['decision_rule']}.", f"New model better: **{better}**."]
    (out / "model_comparison.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
