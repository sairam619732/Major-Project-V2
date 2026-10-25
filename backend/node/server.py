"""Offloading node (worker): a small FastAPI app for the edge and cloud tiers.

It reports its own real CPU / memory load and task queue, and runs the same object detector as the
local backend on images and videos sent to it. The local backend measures the network latency and
bandwidth to it and decides where each task runs. It never runs code sent by a caller: only the
fixed detection task on uploaded image/video files.

API (every endpoint needs the key when one is set; send it as X-API-Key):
  GET  /health            liveness + identity (the backend also times it to measure latency)
  GET  /status            real CPU/RAM/queue, GPU, limits, imposed constraints, emulation
  POST /echo              bandwidth probe (counts bytes)
  POST /execute           run a task; form: files, workload_type, task_id (unique per task)
  GET  /tasks/{task_id}   status/result of a task (used after a timeout instead of re-sending it)

Configure with environment variables:
  NODE_TIER        EDGE or CLOUD (default EDGE)
  NODE_ID          a name shown in the UI (default: <tier>-<hostname>)
  NODE_API_KEY     access key (old name NODE_TOKEN also works). Required for any node reachable
                   from other machines; compared in constant time.
  NODE_REQUIRE_API_KEY=1   refuse every request until a key is set (old name NODE_REQUIRE_TOKEN)

Workload limits (imposed; reported in /status under "constraints"):
  NODE_PROFILE          "edge-like" applies edge-style defaults below (a remote node configured to
                        behave like a constrained edge server; it is not a physical edge device)
  NODE_MAX_CONCURRENT   tasks run at the same time (edge-like default 1, else 2)
  NODE_MAX_QUEUE        tasks accepted at once, running + waiting (edge-like default 3, else 16);
                        more are refused with 503 so the backend can use another tier
  DETECTOR_CPU_THREADS  CPU threads the detector may use (edge-like default 2; else all)

Network emulation (for running every tier on one machine, e.g. a single-laptop demo). Off unless set:
  NODE_EMULATED_RTT_MS, NODE_EMULATED_JITTER_MS, NODE_EMULATED_BANDWIDTH_MBPS
The node really waits, so the backend's normal measurements see the emulated link. /status reports
the settings so the UI labels these values as emulated, never as a real network.

Host limits (reported in /status so the backend doesn't send tasks the host can't run):
  NODE_MAX_UPLOAD_MB  largest upload the host accepts (e.g. 4 on Vercel, whose limit is 4.5 MB)
  Video needs ffmpeg/ffprobe on the host; /status says whether they are installed.
"""

import asyncio
import hmac
import os
import platform
import random
import re
import shutil
import socket
import threading
import time
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


def _env_float(name: str) -> float:
    try:
        return max(0.0, float(os.getenv(name, "0") or 0))
    except ValueError:
        return 0.0


def _env_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, "") or default))
    except ValueError:
        return default


NODE_PROFILE = os.getenv("NODE_PROFILE", "").strip().lower()
EDGE_LIKE = NODE_PROFILE in ("edge-like", "edge")
# Edge-like nodes get fewer CPU threads; must be set before the detector is loaded below.
if EDGE_LIKE:
    os.environ.setdefault("DETECTOR_CPU_THREADS", "2")

import psutil  # noqa: E402
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, status  # noqa: E402
from fastapi.concurrency import run_in_threadpool  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from app.services.cv_executor import cv_executor  # noqa: E402
from app.services.workload_limits import WorkloadError, check_workload, max_file_bytes, read_upload  # noqa: E402

NODE_TIER = os.getenv("NODE_TIER", "EDGE").upper()
NODE_ID = os.getenv("NODE_ID", f"{NODE_TIER.lower()}-{socket.gethostname().lower()}")
NODE_TOKEN = (os.getenv("NODE_API_KEY") or os.getenv("NODE_TOKEN") or "").strip()
NODE_REQUIRE_TOKEN = (os.getenv("NODE_REQUIRE_API_KEY") or os.getenv("NODE_REQUIRE_TOKEN") or "").strip().lower() in (
    "1",
    "true",
    "yes",
)

MAX_CONCURRENT = _env_int("NODE_MAX_CONCURRENT", 1 if EDGE_LIKE else 2)
MAX_QUEUE = max(MAX_CONCURRENT, _env_int("NODE_MAX_QUEUE", 3 if EDGE_LIKE else 16))
RESULT_TTL_S = 15 * 60
RESULT_CACHE_MAX = 256
TASK_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]{1,80}$")

EMULATED_RTT_MS = _env_float("NODE_EMULATED_RTT_MS")
EMULATED_JITTER_MS = _env_float("NODE_EMULATED_JITTER_MS")
EMULATED_BANDWIDTH_MBPS = _env_float("NODE_EMULATED_BANDWIDTH_MBPS")
MAX_UPLOAD_MB = _env_float("NODE_MAX_UPLOAD_MB") or None
NETWORK_EMULATION = (
    {"rtt_ms": EMULATED_RTT_MS, "jitter_ms": EMULATED_JITTER_MS, "bandwidth_mbps": EMULATED_BANDWIDTH_MBPS or None}
    if EMULATED_RTT_MS or EMULATED_BANDWIDTH_MBPS
    else None
)


def _transfer_s(size_bytes: int) -> float:
    """Time to move size_bytes over the emulated link."""
    if not EMULATED_BANDWIDTH_MBPS or size_bytes <= 0:
        return 0.0
    return size_bytes * 8 / (EMULATED_BANDWIDTH_MBPS * 1_000_000)


app = FastAPI(
    title=f"Offloading Node ({NODE_TIER})",
    version="2.0.0",
    description="Runs offloaded object-detection tasks and reports this machine's real load.",
)


@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """With a key set, every request must send it (X-API-Key; the old X-Node-Token header also works)."""
    if NODE_REQUIRE_TOKEN and not NODE_TOKEN and request.url.path != "/health":
        return JSONResponse(
            {"detail": "This node has no API key set, so it refuses requests. Set NODE_API_KEY."},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if NODE_TOKEN:
        sent = request.headers.get("x-api-key") or request.headers.get("x-node-token") or ""
        if not hmac.compare_digest(sent.encode(), NODE_TOKEN.encode()):
            return JSONResponse({"detail": "Missing or wrong API key (X-API-Key)."}, status_code=status.HTTP_401_UNAUTHORIZED)
    return await call_next(request)


@app.middleware("http")
async def emulate_network(request: Request, call_next):
    """With network emulation on, delay each request like a real link of that latency and speed."""
    if NETWORK_EMULATION is None:
        return await call_next(request)
    half_rtt_s = max(0.0, EMULATED_RTT_MS + random.uniform(-EMULATED_JITTER_MS, EMULATED_JITTER_MS)) / 2000.0
    try:
        upload_bytes = int(request.headers.get("content-length", "0"))
    except ValueError:
        upload_bytes = 0
    await asyncio.sleep(half_rtt_s + _transfer_s(upload_bytes))  # request travelling to the node
    response = await call_next(request)
    try:
        download_bytes = int(response.headers.get("content-length", "0"))
    except ValueError:
        download_bytes = 0
    await asyncio.sleep(half_rtt_s + _transfer_s(download_bytes))  # response travelling back
    return response


# The backend's bandwidth probe sends 2 MB; refuse anything much larger.
ECHO_MAX_BYTES = 4 * 1024 * 1024

# Tasks accepted but not finished yet (running + waiting): the node's real queue length.
_queue_lock = threading.Lock()
_in_flight = 0
_running = 0
_slots = asyncio.Semaphore(MAX_CONCURRENT)


@dataclass
class TaskRecord:
    status: str  # running | done | failed
    started: float = field(default_factory=time.time)
    finished: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    error_status: Optional[int] = None


# Recent tasks by ID: a retried task_id returns the recorded result instead of running twice.
_tasks: "OrderedDict[str, TaskRecord]" = OrderedDict()

# Prime psutil's CPU counter so the first /status reading is meaningful.
psutil.cpu_percent(interval=None)


def _queue_change(delta: int) -> None:
    global _in_flight
    with _queue_lock:
        _in_flight = max(0, _in_flight + delta)


def _forget_old_tasks() -> None:
    now = time.time()
    for task_id in list(_tasks):
        rec = _tasks[task_id]
        if rec.status != "running" and rec.finished and now - rec.finished > RESULT_TTL_S:
            del _tasks[task_id]
    while len(_tasks) > RESULT_CACHE_MAX:
        oldest = next((k for k, r in _tasks.items() if r.status != "running"), None)
        if oldest is None:
            break
        del _tasks[oldest]


def _constraints() -> Dict[str, Any]:
    """Limits this node imposes on itself (configured, not measured)."""
    return {
        "profile": "edge-like" if EDGE_LIKE else (NODE_PROFILE or "default"),
        "max_concurrent": MAX_CONCURRENT,
        "max_queue": MAX_QUEUE,
        "cpu_threads": cv_executor.hardware()["cpu_threads_limit"],
    }


@app.get("/health", tags=["Status"])
async def health():
    """Liveness and identity; the backend also times it to measure network latency."""
    return {"status": "ok", "tier": NODE_TIER, "node_id": NODE_ID, "model_ready": cv_executor.is_loaded}


@app.get("/status", tags=["Status"])
async def node_status():
    """Real load of this machine (psutil), plus its configured limits."""
    mem = psutil.virtual_memory()
    hw = cv_executor.hardware()
    return {
        "tier": NODE_TIER,
        "node_id": NODE_ID,
        "platform": platform.platform(),
        "cpu_count": psutil.cpu_count(logical=True),
        "cpu_load": round(psutil.cpu_percent(interval=None), 1),
        "memory_used": round(mem.percent, 1),
        "memory_total_gb": round(mem.total / (1024**3), 1),
        "task_queue": _in_flight,
        "tasks_running": _running,
        "model_ready": cv_executor.is_loaded,
        # Set when this node adds an emulated network delay (single-machine demo); None = real network.
        "network_emulation": NETWORK_EMULATION,
        # What this host can take: the backend routes other tasks elsewhere.
        "capabilities": {
            "video": shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None,
            "max_upload_mb": MAX_UPLOAD_MB,
        },
        # Imposed limits, kept apart from the measured values above.
        "constraints": _constraints(),
        # Detection hardware: detector_device is what tasks actually run on.
        "gpu": {"available": hw["gpu_available"], "name": hw["gpu_name"], "used_for_detection": hw["detector_device"] != "CPU"},
        "detector": cv_executor.model_architecture,
        "timestamp": time.time(),
    }


@app.post("/echo", tags=["Status"])
async def echo(request: Request):
    """Bandwidth probe: receives a block of bytes and reports how many arrived."""
    received = 0
    async for chunk in request.stream():
        received += len(chunk)
        if received > ECHO_MAX_BYTES:
            raise HTTPException(status_code=413, detail="Probe block too large.")
    return {"received_bytes": received}


def _record_view(task_id: str, rec: TaskRecord) -> Dict[str, Any]:
    return {"task_id": task_id, "status": rec.status, "error": rec.error, "result": rec.result}


@app.get("/tasks/{task_id}", tags=["Execution"])
async def task_status(task_id: str):
    """Status of a task this node received: running, done (with its result) or failed."""
    rec = _tasks.get(task_id)
    if rec is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No task with this ID was received.")
    return _record_view(task_id, rec)


@app.post("/execute", tags=["Execution"])
async def execute(
    files: Optional[List[UploadFile]] = File(None),
    workload_type: str = Form("IMAGE"),
    task_id: Optional[str] = Form(None),
    confidence_threshold: float = Form(0.35),
):
    """Runs object detection on the uploaded image(s) or video on this machine.

    task_id should be unique per task. Sending the same ID again does not run the task twice: a
    finished task returns its recorded result ("replayed": true), a running one answers 409.
    """
    global _running
    task_id = task_id or f"node-{uuid.uuid4().hex}"
    if not TASK_ID_PATTERN.match(task_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task_id must be 1-80 letters, digits or _ . : -")

    _forget_old_tasks()
    existing = _tasks.get(task_id)
    if existing is not None:
        if existing.status == "running":
            return JSONResponse({"detail": "This task is already running.", "status": "running", "task_id": task_id}, status_code=409)
        if existing.status == "done":
            return {**existing.result, "replayed": True}
        return JSONResponse({"detail": existing.error, "status": "failed", "task_id": task_id}, status_code=existing.error_status or 500)

    if _in_flight >= MAX_QUEUE:
        # Full: refuse now (nothing recorded) so the backend can send it to another tier.
        return JSONResponse(
            {"detail": f"Node busy: {_in_flight} tasks accepted, limit {MAX_QUEUE}.", "status": "busy"},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            headers={"Retry-After": "2"},
        )

    files_data: List[Tuple[str, bytes]] = []
    for f in files or []:
        try:
            # Stops reading once a file is over the limit, so huge uploads never fill memory.
            content = await read_upload(f, max_file_bytes(workload_type))
        except WorkloadError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        if content:
            files_data.append((f.filename or "file", content))
    if not files_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file data received.")

    rec = TaskRecord(status="running")
    _tasks[task_id] = rec
    _queue_change(+1)
    received = time.perf_counter()
    try:
        async with _slots:  # waits here while MAX_CONCURRENT tasks are running
            started = time.perf_counter()
            _running += 1
            try:
                # Same limits as the backend: one photo, up to 10 photos, or a video of up to 10 s.
                await run_in_threadpool(check_workload, workload_type, files_data)
                # Detection is CPU/GPU heavy: run it off the event loop so /status stays responsive.
                result = await run_in_threadpool(
                    cv_executor.process_workload,
                    workload_type=workload_type,
                    files_data=files_data,
                    threshold=confidence_threshold,
                    tier=NODE_TIER,
                )
            finally:
                _running -= 1
    except WorkloadError as exc:
        rec.status, rec.error, rec.error_status, rec.finished = "failed", str(exc), 400, time.time()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        rec.status, rec.error, rec.error_status, rec.finished = "failed", f"{type(exc).__name__}: {exc}"[:300], 500, time.time()
        raise HTTPException(status_code=500, detail=f"Detection failed on this node: {rec.error}")
    finally:
        _queue_change(-1)

    response = {
        "status": "SUCCESS",
        "tier": NODE_TIER,
        "node_id": NODE_ID,
        "task_id": task_id,
        "workload_type": result["workload_type"],
        "processing_time_ms": result["processing_time_ms"],
        "queue_wait_ms": round((started - received) * 1000.0, 2),
        "server_elapsed_ms": round((time.perf_counter() - received) * 1000.0, 2),
        "detections": result["detections"],
        "detection_count": result["detection_count"],
        "annotated_image_base64": result.get("annotated_image_base64"),
        "processed_count": result.get("processed_count", len(files_data)),
        "batch_items": result.get("batch_items", []),
        "model_architecture": result.get("model_architecture", "SSDLite320_MobileNet_V3_Large"),
        # The hardware this task actually ran on ("GPU (...)" only when the GPU was used).
        "accelerator": result.get("accelerator"),
        "constraints": _constraints(),
        "replayed": False,
    }
    rec.status, rec.result, rec.finished = "done", response, time.time()
    return response
