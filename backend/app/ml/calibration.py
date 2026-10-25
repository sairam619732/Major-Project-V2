"""Measured detection speed per tier, used by cost model v2 (app/ml/environment.py).

Each tier's detection time is modelled as  overhead_ms + ms_per_mb * upload_MB,  fitted by least
squares to real timings of the detector on that machine (scripts/calibrate_detection.py). The fit
and where it was measured are stored in app/ml/calibration.json, so the numbers are traceable.

Values used when a tier has not been measured yet are marked "measured": false.
"""

import json
from pathlib import Path
from typing import Any, Dict

CALIBRATION_PATH = Path(__file__).resolve().parent / "calibration.json"

# Placeholders only until scripts/calibrate_detection.py is run for a tier (marked measured=false).
_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "local": {"overhead_ms": 150.0, "ms_per_mb": 60.0, "measured": False},
    "edge": {"overhead_ms": 150.0, "ms_per_mb": 60.0, "measured": False},
    "cloud": {"overhead_ms": 100.0, "ms_per_mb": 40.0, "measured": False},
}

# Modelling assumptions of cost model v2 that are NOT measured (documented for the report).
ASSUMPTIONS = {
    "local_busy_slowdown": "detection time x (1 + 2 x busy fraction of the CPU), busy fraction = 1 - cpu_available/100",
    "edge_load_slowdown": "detection time x (1 + cpu_load/100)",
    "cloud_load_slowdown": "detection time x (1 + 0.5 x cpu_load/100)",
    "queue_wait": "each queued task adds one single-photo detection time (edge) or half of one (cloud, 2 at a time)",
    "energy_and_cost": "same power and price constants as cost model v1",
}


def load_calibration() -> Dict[str, Dict[str, Any]]:
    data: Dict[str, Dict[str, Any]] = {k: dict(v) for k, v in _DEFAULTS.items()}
    try:
        stored = json.loads(CALIBRATION_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return data
    for tier in data:
        entry = stored.get(tier)
        if isinstance(entry, dict) and "overhead_ms" in entry and "ms_per_mb" in entry:
            data[tier].update(entry)
    return data


CALIBRATION = load_calibration()


def detection_ms(tier: str, data_size_mb: float) -> float:
    c = CALIBRATION[tier]
    return float(c["overhead_ms"]) + float(c["ms_per_mb"]) * max(0.0, float(data_size_mb))
