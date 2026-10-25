"""Measure how long the real detector takes on THIS machine and save it for cost model v2.

Run from backend/ on the machine that plays the tier (use its own Python environment):
    Laptop (LOCAL):         .venv\\Scripts\\python.exe scripts\\calibrate_detection.py --tier local
    Teammate laptop (EDGE): .venv\\Scripts\\python.exe scripts\\calibrate_detection.py --tier edge --threads 2
    Desktop GPU (CLOUD):    .venv-gpu\\Scripts\\python.exe scripts\\calibrate_detection.py --tier cloud --device cuda

It runs real image tasks (1-8 photos of 0.15-4 MB each, made from the sample photos), times the whole
detection step (decode, detect, annotate) with the same code the workers use, fits
    detection_ms = overhead_ms + ms_per_mb * upload_MB
by least squares, and writes that tier's entry in app/ml/calibration.json with where and how it was
measured. --proxy marks an entry measured on a different machine than the one that plays the tier.
Copy the updated calibration.json back to the training machine before retraining.
"""

import argparse
import io
import json
import os
import platform
import socket
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
SAMPLES = BACKEND.parent / "public" / "samples"
CALIBRATION_PATH = BACKEND / "app" / "ml" / "calibration.json"


def make_photos():
    """Real photos at several sizes (JPEG): the two samples, upscaled, so sizes span 0.15-4 MB."""
    from PIL import Image

    photos = []
    for name in ("drone_inspection.jpg", "traffic_monitoring.jpg"):
        img = Image.open(SAMPLES / name).convert("RGB")
        for scale in (1.0, 2.0, 3.5):
            scaled = img if scale == 1.0 else img.resize((int(img.width * scale), int(img.height * scale)))
            buf = io.BytesIO()
            scaled.save(buf, format="JPEG", quality=92)
            photos.append((f"{Path(name).stem}_x{scale}.jpg", buf.getvalue()))
    return photos


def cpu_name() -> str:
    if os.name == "nt":
        try:
            import winreg

            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            return winreg.QueryValueEx(key, "ProcessorNameString")[0].strip()
        except OSError:
            pass
    return platform.processor() or platform.machine()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--tier", choices=("local", "edge", "cloud"), required=True)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="cpu")
    parser.add_argument("--threads", type=int, default=0, help="CPU threads for the detector (0 = all)")
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--proxy", default="", help="describe the real machine if this one only stands in for it")
    args = parser.parse_args()

    os.environ["DETECTOR_ENGINE"] = "torch"
    os.environ["DETECTOR_DEVICE"] = args.device
    if args.threads:
        os.environ["DETECTOR_CPU_THREADS"] = str(args.threads)
    sys.path.insert(0, str(BACKEND))
    from app.services.cv_executor import cv_executor

    if not cv_executor.is_loaded:
        print(f"Detector not loaded: {cv_executor.load_error}")
        return 1
    photos = make_photos()
    # Warm-up (first runs set up kernels/caches).
    for _ in range(3):
        cv_executor.process_workload("IMAGE", [photos[0]])

    xs, ys = [], []  # upload MB, measured ms
    tasks = []
    for name, data in photos:
        tasks.append([(name, data)])                      # 1 photo
    for count in (2, 4, 8):
        for i in range(0, len(photos), 2):
            tasks.append([photos[(i + j) % len(photos)] for j in range(count)])
    for _ in range(args.repeats):
        for files in tasks:
            mb = sum(len(d) for _, d in files) / 2**20
            started = time.perf_counter()
            cv_executor.process_workload("IMAGE_BATCH" if len(files) > 1 else "IMAGE", files)
            xs.append(mb)
            ys.append((time.perf_counter() - started) * 1000.0)

    # Least squares: ms = overhead + slope * MB
    mean_x, mean_y = statistics.fmean(xs), statistics.fmean(ys)
    sxx = sum((x - mean_x) ** 2 for x in xs)
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / sxx
    overhead = mean_y - slope * mean_x
    ss_res = sum((y - (overhead + slope * x)) ** 2 for x, y in zip(xs, ys))
    ss_tot = sum((y - mean_y) ** 2 for y in ys)
    r2 = 1 - ss_res / ss_tot if ss_tot else 1.0
    single = [y for x, y, files in zip(xs, ys, tasks * args.repeats) if len(files) == 1]

    hw = cv_executor.hardware()
    entry = {
        "overhead_ms": round(max(overhead, 1.0), 2),
        "ms_per_mb": round(max(slope, 0.0), 2),
        "measured": True,
        "r2": round(r2, 3),
        "samples": len(ys),
        "single_photo_median_ms": round(statistics.median(single), 1),
        "upload_mb_range": [round(min(xs), 2), round(max(xs), 2)],
        "detector": cv_executor.model_architecture,
        "device": hw["detector_device"],
        "cpu_threads_limit": hw["cpu_threads_limit"],
        "host": socket.gethostname(),
        "cpu": cpu_name(),
        "platform": platform.platform(),
        "measured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "proxy_for": args.proxy or None,
    }
    try:
        data = json.loads(CALIBRATION_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    data[args.tier] = entry
    data["_note"] = "Written by backend/scripts/calibrate_detection.py; detection_ms = overhead_ms + ms_per_mb * upload_MB."
    CALIBRATION_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({args.tier: entry}, indent=2))
    print(f"Saved to {CALIBRATION_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
