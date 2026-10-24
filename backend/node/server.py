"""Offloading node: a small FastAPI app that runs on the edge PC and on the cloud server.

It reports its own real CPU / memory load and how many tasks it is working on, and runs the same
object detector as the local backend on images sent to it. The local backend (app/) measures the
network latency and bandwidth to it and decides where each task runs.

Configure with environment variables:
  NODE_TIER   EDGE or CLOUD (default EDGE)
  NODE_ID     a name shown in the UI (default: <tier>-<hostname>)
  NODE_TOKEN  optional access key; when set, every request except /health must send it in the
              X-Node-Token header (use it for a node on the public internet)

Network emulation (for running every tier on one machine, e.g. a single-laptop demo). Off unless set:
  NODE_EMULATED_RTT_MS          extra round-trip delay added to every request (e.g. 20 for edge, 90 for cloud)
  NODE_EMULATED_JITTER_MS       random +/- variation of that delay
  NODE_EMULATED_BANDWIDTH_MBPS  link speed: request and response bodies are delayed by size / speed
The node really waits, so the backend's normal measurements see the emulated link. /status reports
the settings so the UI can label these values as emulated, never as a real network.
"""

import asyncio
import hmac
import os
import platform
import random
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


def _env_float(name: str) -> float:
    try:
        return max(0.0, float(os.getenv(name, "0") or 0))
    except ValueError:
        return 0.0


EMULATED_RTT_MS = _env_float("NODE_EMULATED_RTT_MS")
EMULATED_JITTER_MS = _env_float("NODE_EMULATED_JITTER_MS")
EMULATED_BANDWIDTH_MBPS = _env_float("NODE_EMULATED_BANDWIDTH_MBPS")
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
        # Set when this node adds an emulated network delay (single-machine demo); None = real network.
        "network_emulation": NETWORK_EMULATION,
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
