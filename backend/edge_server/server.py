"""FastAPI Edge Execution Server.

Phase 14A: Real Edge Server Connection.
Accepts workloads (Single Image, Image Batch, Video) sent from the main PC
over HTTP, executes neural inference using the MobileNet V3 object detection pipeline,
and returns real detection bounding boxes, execution timings, and payload metrics.
"""

import os
import sys
import time
from pathlib import Path
from typing import List, Optional, Tuple

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.services.cv_executor import cv_executor

app = FastAPI(
    title="Real Edge Execution Server",
    version="1.0.0",
    description="Lightweight HTTP execution service for Edge PC/Laptop on local LAN/Wi-Fi",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EDGE_NODE_ID = os.getenv("EDGE_NODE_ID", "edge-pc-node-01")


@app.get("/health", tags=["Status"])
async def health_check():
    """Health probe reporting Edge server status and model readiness."""
    return {
        "status": "healthy",
        "service": "edge-execution-server",
        "execution_node": "EDGE",
        "tier": "EDGE",
        "worker_id": EDGE_NODE_ID,
        "model_ready": cv_executor.is_loaded,
        "timestamp": time.time(),
    }


@app.post(
    "/execute",
    status_code=status.HTTP_200_OK,
    tags=["Execution"],
    summary="Execute Real Workload on Edge Server",
)
async def execute_workload(
    files: Optional[List[UploadFile]] = File(None, description="Uploaded image(s) or video payload"),
    file: Optional[UploadFile] = File(None, description="Single file upload fallback"),
    workload_type: str = Form("IMAGE", description="'IMAGE' | 'IMAGE_BATCH' | 'VIDEO'"),
    task_id: str = Form("TASK_001", description="Assigned task identifier"),
    confidence_threshold: float = Form(0.35, description="Detection confidence cutoff"),
):
    """Executes real neural object detection on the Edge PC.

    Receives the actual workload payload over HTTP, executes PyTorch
    MobileNet V3 object detection, and returns real detections and metrics.
    """
    start_time = time.perf_counter()

    # Consolidate files
    actual_files: List[UploadFile] = []
    if files:
        actual_files.extend(files)
    if file and not files:
        actual_files.append(file)

    if not actual_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided in Edge execution request.",
        )

    # Read binary contents
    files_data: List[Tuple[str, bytes]] = []
    total_bytes = 0
    for f in actual_files:
        content = await f.read()
        if not content:
            continue
        files_data.append((f.filename or "file", content))
        total_bytes += len(content)

    if not files_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All provided file payloads were empty.",
        )

    # Execute real object detection pipeline
    result = cv_executor.process_workload(
        workload_type=workload_type,
        files_data=files_data,
        threshold=confidence_threshold,
        tier="EDGE",
    )

    total_elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
    payload_size_mb = round(total_bytes / (1024 * 1024), 3)

    return {
        "success": True,
        "status": "SUCCESS",
        "execution_node": "EDGE",
        "tier": "EDGE",
        "worker_id": EDGE_NODE_ID,
        "task_id": task_id,
        "workload_type": workload_type.upper(),
        "payload_size": payload_size_mb,
        "payload_size_mb": payload_size_mb,
        "processing_time": result["processing_time_ms"],
        "processing_time_ms": result["processing_time_ms"],
        "total_server_elapsed_ms": total_elapsed_ms,
        "detected_objects": result["detections"],
        "detections": result["detections"],
        "detection_count": result["detection_count"],
        "annotated_image_base64": result.get("annotated_image_base64"),
        "processed_count": result.get("processed_count", len(files_data)),
        "batch_items": result.get("batch_items", []),
        "model_architecture": result.get("model_architecture", "SSDLite320_MobileNet_V3_Large"),
    }
