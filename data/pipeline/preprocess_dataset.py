"""Clean, encode, normalize and split the offloading dataset for model training.

Steps:
  1. Validate the schema and parse every row; drop rows with missing or non-numeric values.
  2. Drop rows outside physical ranges (percentages 0-100, positive sizes/deadlines/bandwidth,
     priority 1-5, known task types) and rows whose action name and index disagree.
  3. Drop duplicate samples (identical inputs).
  4. Build model features: the 17 inputs normalized exactly like the DQN sees them at inference
     (backend `state_to_vector`), plus a one-hot task type.
  5. Stratified train/val/test split on the optimal action (the classes are imbalanced).
  6. Write the splits and a JSON report with drop counts, raw column stats, normalized feature ranges,
     class distribution per split and inverse-frequency class weights.

Usage (from the repo root, with the backend virtualenv):
    backend/.venv/Scripts/python.exe data/pipeline/preprocess_dataset.py [--seed 42]
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import random
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.ml.environment import ACTION_NAMES, state_to_vector  # noqa: E402
from app.models.simulation import SimulationTaskInput  # noqa: E402
from app.models.system import CloudNodeState, EdgeNodeState, LocalNodeState  # noqa: E402

DEFAULT_INPUT = REPO_ROOT / "data" / "raw" / "synthetic_cloud_edge_offloading_dataset.csv"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "data" / "processed"

TASK_TYPES = ["IMAGE", "VIDEO", "SENSOR"]

# Raw input columns in the order state_to_vector emits them, with their valid range.
INPUT_COLUMNS = {
    "data_size_mb": (0.0, None),
    "cpu_demand_percent": (0.0, 100.0),
    "memory_demand_percent": (0.0, 100.0),
    "deadline_ms": (0.0, None),
    "priority": (1, 5),
    "local_cpu_available_percent": (0.0, 100.0),
    "local_memory_available_percent": (0.0, 100.0),
    "local_battery_percent": (0.0, 100.0),
    "local_base_latency_ms": (0.0, None),
    "edge_cpu_load_percent": (0.0, 100.0),
    "edge_task_queue": (0, None),
    "edge_network_latency_ms": (0.0, None),
    "edge_bandwidth_gbps": (0.0, None),
    "cloud_cpu_load_percent": (0.0, 100.0),
    "cloud_task_queue": (0, None),
    "cloud_network_latency_ms": (0.0, None),
    "cloud_bandwidth_gbps": (0.0, None),
}
INTEGER_COLUMNS = {"priority", "edge_task_queue", "cloud_task_queue"}
# Strictly positive (a zero size, deadline or bandwidth is not a valid sample).
POSITIVE_COLUMNS = {"data_size_mb", "deadline_ms", "edge_bandwidth_gbps", "cloud_bandwidth_gbps"}
# Normalized feature names, index-aligned with state_to_vector.
FEATURE_NAMES = [name.removesuffix("_percent").removesuffix("_ms").removesuffix("_mb").removesuffix("_gbps")
                 for name in INPUT_COLUMNS]
LABEL_COLUMNS = ["optimal_action_index", "optimal_reward"]


def display_path(path: Path) -> str:
    """Repo-relative path when inside the repo, else the absolute path."""
    path = path.resolve()
    return (path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path).as_posix()


def load_rows(path: Path) -> tuple[list[dict], list[str]]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames or []
        required = ["sample_id", "task_type", *INPUT_COLUMNS, "optimal_action", *LABEL_COLUMNS]
        missing = [c for c in required if c not in header]
        if missing:
            raise SystemExit(f"Dataset is missing columns: {', '.join(missing)}")
        return list(reader), header


def parse_row(raw: dict) -> tuple[dict | None, str | None]:
    """Typed row, or (None, drop reason)."""
    row: dict = {"sample_id": raw["sample_id"].strip(), "task_type": raw["task_type"].strip().upper()}
    try:
        for col in INPUT_COLUMNS:
            value = float(raw[col])
            if math.isnan(value) or math.isinf(value):
                return None, "invalid_value"
            row[col] = int(value) if col in INTEGER_COLUMNS else value
        row["optimal_action_index"] = int(raw["optimal_action_index"])
        row["optimal_reward"] = float(raw["optimal_reward"])
    except (TypeError, ValueError):
        return None, "invalid_value"

    if row["task_type"] not in TASK_TYPES:
        return None, "out_of_range"
    for col, (lo, hi) in INPUT_COLUMNS.items():
        v = row[col]
        if (lo is not None and v < lo) or (hi is not None and v > hi) or (col in POSITIVE_COLUMNS and v <= 0):
            return None, "out_of_range"
    if ACTION_NAMES.get(row["optimal_action_index"]) != raw["optimal_action"].strip().upper():
        return None, "label_mismatch"
    return row, None


def to_features(row: dict) -> list[float]:
    task = SimulationTaskInput(
        data_size_mb=row["data_size_mb"],
        cpu_demand_percent=row["cpu_demand_percent"],
        memory_demand_percent=row["memory_demand_percent"],
        deadline_ms=row["deadline_ms"],
        priority=row["priority"],
    )
    local = LocalNodeState(
        cpu_available=row["local_cpu_available_percent"],
        memory_available=row["local_memory_available_percent"],
        battery_level=row["local_battery_percent"],
        base_latency=row["local_base_latency_ms"],
    )
    edge = EdgeNodeState(
        cpu_load=row["edge_cpu_load_percent"],
        task_queue=row["edge_task_queue"],
        network_latency=row["edge_network_latency_ms"],
        bandwidth=row["edge_bandwidth_gbps"],
    )
    cloud = CloudNodeState(
        cpu_load=row["cloud_cpu_load_percent"],
        task_queue=row["cloud_task_queue"],
        network_latency=row["cloud_network_latency_ms"],
        bandwidth=row["cloud_bandwidth_gbps"],
    )
    vector = [round(float(x), 6) for x in state_to_vector(task, local, edge, cloud)]
    one_hot = [1.0 if row["task_type"] == t else 0.0 for t in TASK_TYPES]
    return vector + one_hot


def column_stats(rows: list[dict], col: str) -> dict:
    values = [r[col] for r in rows]
    mean = sum(values) / len(values)
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))
    return {"min": min(values), "max": max(values), "mean": round(mean, 4), "std": round(std, 4)}


def stratified_split(rows: list[dict], ratios: tuple[float, float, float], seed: int) -> dict[str, list[dict]]:
    rng = random.Random(seed)
    by_class: dict[int, list[dict]] = {}
    for r in rows:
        by_class.setdefault(r["optimal_action_index"], []).append(r)
    splits: dict[str, list[dict]] = {"train": [], "val": [], "test": []}
    for members in by_class.values():
        rng.shuffle(members)
        n = len(members)
        n_val = max(1, round(n * ratios[1])) if n >= 3 else 0
        n_test = max(1, round(n * ratios[2])) if n >= 3 else 0
        splits["val"] += members[:n_val]
        splits["test"] += members[n_val:n_val + n_test]
        splits["train"] += members[n_val + n_test:]
    for part in splits.values():
        rng.shuffle(part)
    return splits


def write_split(path: Path, rows: list[dict]) -> None:
    feature_cols = FEATURE_NAMES + [f"task_type_{t.lower()}" for t in TASK_TYPES]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["sample_id", *feature_cols, *LABEL_COLUMNS])
        for r in rows:
            writer.writerow([r["sample_id"], *r["features"], r["optimal_action_index"], r["optimal_reward"]])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--val", type=float, default=0.15)
    parser.add_argument("--test", type=float, default=0.15)
    args = parser.parse_args()

    raw_rows, _ = load_rows(args.input)
    dropped: Counter = Counter()
    clean: list[dict] = []
    seen: set[tuple] = set()
    for raw in raw_rows:
        row, reason = parse_row(raw)
        if row is None:
            dropped[reason] += 1
            continue
        key = (row["task_type"], *(row[c] for c in INPUT_COLUMNS))
        if key in seen:
            dropped["duplicate"] += 1
            continue
        seen.add(key)
        clean.append(row)
    if not clean:
        raise SystemExit("No valid rows left after cleaning.")

    for row in clean:
        row["features"] = to_features(row)
    feature_ranges = {
        name: {"min": min(r["features"][i] for r in clean), "max": max(r["features"][i] for r in clean)}
        for i, name in enumerate(FEATURE_NAMES)
    }

    splits = stratified_split(clean, (1 - args.val - args.test, args.val, args.test), args.seed)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in splits.items():
        write_split(args.output_dir / f"{name}.csv", rows)

    train_counts = Counter(r["optimal_action_index"] for r in splits["train"])
    n_train, n_classes = len(splits["train"]), len(ACTION_NAMES)
    report = {
        "source": display_path(args.input),
        "seed": args.seed,
        "rows": {"raw": len(raw_rows), "clean": len(clean), "dropped": dict(dropped)},
        "features": {
            "normalized": FEATURE_NAMES,
            "one_hot": [f"task_type_{t.lower()}" for t in TASK_TYPES],
            "normalization": "backend/app/ml/environment.py state_to_vector (value / cap, clipped to [0, 1])",
            "normalized_ranges": feature_ranges,
        },
        "labels": {"target": "optimal_action_index", "classes": ACTION_NAMES, "auxiliary": "optimal_reward"},
        "raw_column_stats": {c: column_stats(clean, c) for c in INPUT_COLUMNS},
        "splits": {
            name: {
                "rows": len(rows),
                "class_counts": {ACTION_NAMES[k]: v for k, v in sorted(Counter(r["optimal_action_index"] for r in rows).items())},
            }
            for name, rows in splits.items()
        },
        # Inverse-frequency weights for a weighted loss; CLOUD is rare under the cost model.
        "class_weights": {
            ACTION_NAMES[k]: round(n_train / (n_classes * train_counts[k]), 4) for k in sorted(train_counts)
        },
    }
    (args.output_dir / "preprocessing_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Clean rows: {len(clean)} / {len(raw_rows)}  dropped: {dict(dropped) or 'none'}")
    for name, info in report["splits"].items():
        print(f"  {name:<5} {info['rows']:>6}  {info['class_counts']}")
    print(f"Class weights: {report['class_weights']}")
    print(f"Wrote {display_path(args.output_dir)}/{{train,val,test}}.csv and preprocessing_report.json")


if __name__ == "__main__":
    main()
