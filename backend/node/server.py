"""Offloading node: a small FastAPI app that runs on the edge PC and on the cloud server.

It reports its own real CPU / memory load and how many tasks it is working on, and runs the same
object detector as the local backend on images sent to it. The local backend (app/) measures the
network latency and bandwidth to it and decides where each task runs.

Configure with environment variables:
  NODE_TIER   EDGE or CLOUD (default EDGE)
  NODE_ID     a name shown in the UI (default: <tier>-<hostname>)
  NODE_TOKEN  optional access key; when set, every request except /health must send it in the
              X-Node-Token header (use it for a node on the public internet)
"""

import hmac
import os
import platform
import socket
import threading
import time
from typing import List, Optional, Tuple

import psutil
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from app.services.cv_executor import cv_executor
from app.services.workload_limits import WorkloadError, check_workload, max_file_bytes, read_upload

NODE_TIER = os.getenv("NODE_TIER", "EDGE").upper()
NODE_ID = os.getenv("NODE_ID", f"{NODE_TIER.lower()}-{socket.gethostname().lower()}")
NODE_TOKEN = os.getenv("NODE_TOKEN", "")

app = FastAPI(
    title=f"Offloading Node ({NODE_TIER})",
    version="1.0.0",
    description="Runs offloaded object-detection tasks and reports this machine's real load.",
)


@app.middleware("http")
async def require_token(request: Request, call_next):
    """With NODE_TOKEN set, only callers that send it may use the node (health stays open)."""
    if NODE_TOKEN and request.url.path != "/health":
        sent = request.headers.get("x-node-token", "")
        if not hmac.compare_digest(sent, NODE_TOKEN):
            return JSONResponse({"detail": "Missing or wrong X-Node-Token"}, status_code=status.HTTP_401_UNAUTHORIZED)
    return await call_next(request)

# The backend's bandwidth probe sends 512 KB; refuse anything much larger.
ECHO_MAX_BYTES = 2 * 1024 * 1024

# Tasks received but not finished yet: the node's real queue length.
_queue_lock = threading.Lock()
_in_flight = 0

# Prime psutil's CPU counter so the first /status reading is meaningful.
psutil.cpu_percent(interval=None)


def _queue_change(delta: int) -> None:
    global _in_flight
    with _queue_lock:
        _in_flight = max(0, _in_flight + delta)


@app.get("/health", tags=["Status"])
async def health():
    """Cheap liveness probe; the backend also times it to measure network latency."""
    return {"status": "ok", "tier": NODE_TIER, "node_id": NODE_ID, "model_ready": cv_executor.is_loaded}


@app.get("/status", tags=["Status"])
async def node_status():
    """Real load of this machine, read with psutil."""
    mem = psutil.virtual_memory()
    return {
        "tier": NODE_TIER,
        "node_id": NODE_ID,
        "platform": platform.platform(),
        "cpu_count": psutil.cpu_count(logical=True),
        "cpu_load": round(psutil.cpu_percent(interval=None), 1),
        "memory_used": round(mem.percent, 1),
        "memory_total_gb": round(mem.total / (1024**3), 1),
        "task_queue": _in_flight,
        "model_ready": cv_executor.is_loaded,
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


@app.post("/execute", tags=["Execution"])
async def execute(
    files: Optional[List[UploadFile]] = File(None),
    workload_type: str = Form("IMAGE"),
    task_id: str = Form("TASK_001"),
    confidence_threshold: float = Form(0.35),
):
    """Runs object detection on the uploaded image(s) or video on this machine."""
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

    _queue_change(+1)
    started = time.perf_counter()
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
    except WorkloadError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    finally:
        _queue_change(-1)

    return {
        "status": "SUCCESS",
        "tier": NODE_TIER,
        "node_id": NODE_ID,
        "task_id": task_id,
        "workload_type": result["workload_type"],
        "processing_time_ms": result["processing_time_ms"],
        "server_elapsed_ms": round((time.perf_counter() - started) * 1000.0, 2),
        "detections": result["detections"],
        "detection_count": result["detection_count"],
        "annotated_image_base64": result.get("annotated_image_base64"),
        "processed_count": result.get("processed_count", len(files_data)),
        "batch_items": result.get("batch_items", []),
        "model_architecture": result.get("model_architecture", "SSDLite320_MobileNet_V3_Large"),
    }
