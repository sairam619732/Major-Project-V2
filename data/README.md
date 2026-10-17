# Dataset

Synthetic task-offloading dataset (LOCAL / EDGE / CLOUD) built from the backend's own cost model, plus a preprocessing step that turns it into model-ready train/val/test splits.

```
data/
├── pipeline/
│   ├── generate_dataset.py     # raw dataset from the backend cost model
│   └── preprocess_dataset.py   # clean → encode → normalize → stratified split
├── raw/
│   └── synthetic_cloud_edge_offloading_dataset.csv   # 20,000 rows; read by /api/dataset
└── processed/
    ├── train.csv  val.csv  test.csv                  # 70 / 15 / 15, stratified on the label
    └── preprocessing_report.json                     # drops, stats, class counts, class weights
```

## Rebuild

From the repo root, with the backend virtualenv (the scripts import `backend/app`):

```bash
backend/.venv/Scripts/python.exe data/pipeline/generate_dataset.py
backend/.venv/Scripts/python.exe data/pipeline/preprocess_dataset.py
```

Both take `--seed` (default 42), so the output is reproducible. `generate_dataset.py` also takes `--rows`; `preprocess_dataset.py` takes `--input`, `--output-dir`, `--val` and `--test`.

## How rows are generated

Each row samples a task and the local, edge and cloud node states from the same ranges the DQN environment uses (`OffloadingEnvironment.reset` in `backend/app/ml/environment.py`). All three actions are scored with `compute_action_metrics`. The row records each action's latency (ms), energy (joules, in the `*_energy_units` columns) and cost, and is labelled with the highest-reward action (`optimal_action`, `optimal_action_index`, `optimal_reward`).

The labels follow the cost model, so they are imbalanced: about 77% LOCAL, 22% EDGE and under 1% CLOUD with the default reward weights. The preprocessing keeps that distribution in every split and reports inverse-frequency class weights for a weighted loss.

## Preprocessing

1. **Validate**: required columns present; numeric values parse; no NaN or inf.
2. **Clean**: drop rows outside physical ranges (percentages 0–100; positive size, deadline and bandwidth; priority 1–5; known task type), rows whose action name and index disagree, and duplicate inputs. Drop counts by reason go in the report.
3. **Features** (20): the 17 task/node inputs normalized with the backend's `state_to_vector`, exactly as the DQN sees them at inference, plus a one-hot `task_type` (image / video / sensor).
4. **Labels**: `optimal_action_index` (0 LOCAL, 1 EDGE, 2 CLOUD), with `optimal_reward` kept as an auxiliary target.
5. **Split**: stratified 70/15/15 on the label with a fixed seed.
