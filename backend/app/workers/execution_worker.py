"""Distributed execution worker service for Edge and Cloud offloading tiers.

Phase 14: Real Task Execution Through Automatic Offloading.
Provides standalone HTTP worker service for Edge (port 8001) and Cloud (port 8002).
"""

import os
import time
from typing import List, Optional, Tuple
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.services.cv_executor import cv_executor


def create_worker_app(tier: str, worker_id: Optional[str] = None) -> FastAPI:
    """Factory creating an independent execution worker FastAPI instance for Edge or Cloud."""
    worker_tier = tier.upper()
    worker_name = worker_id or f"{worker_tier.lower()}-worker-node-{os.getpid()}"

    app = FastAPI(
        title=f"AI Offloading {worker_tier} Execution Worker",
        description=f"Independent execution worker node handling offloaded AI inference for tier: {worker_tier}",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get(
        "/health",
        status_code=status.HTTP_200_OK,
        tags=["Health"],
        summary=f"{worker_tier} Worker Health Probe",
    )
    async def health_check():
        return {
            "status": "healthy",
            "tier": worker_tier,
            "worker_id": worker_name,
            "model_ready": cv_executor.is_loaded,
            "timestamp": time.time(),
        }

    @app.post(
        "/execute",
        status_code=status.HTTP_200_OK,
        tags=["Execution"],
        summary=f"Execute Real Workload in {worker_tier} Worker",
    )
    async def execute_workload(
        files: List[UploadFile] = File(..., description="Uploaded image(s) or video payload"),
        workload_type: str = Form("IMAGE", description="'IMAGE' | 'IMAGE_BATCH' | 'VIDEO'"),
        task_id: str = Form("TASK_001"),
        confidence_threshold: float = Form(0.35),
    ):
        """Processes offloaded task payload and returns real neural detections and metrics."""
        start_time = time.perf_counter()

        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files provided in execution request.",
            )

        # Read binary files
        files_data: List[Tuple[str, bytes]] = []
        total_bytes = 0
        for f in files:
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

        # Execute using real PyTorch MobileNet V3
        result = cv_executor.process_workload(
            workload_type=workload_type,
            files_data=files_data,
            threshold=confidence_threshold,
            tier=worker_tier,
        )

        total_elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        total_size_mb = round(total_bytes / (1024 * 1024), 3)

        return {
            "worker_id": worker_name,
            "tier": worker_tier,
            "task_id": task_id,
            "status": "SUCCESS",
            "workload_type": workload_type.upper(),
            "input_files_count": len(files_data),
            "input_size_mb": total_size_mb,
            "processing_time_ms": result["processing_time_ms"],
            "total_worker_elapsed_ms": total_elapsed_ms,
            "detection_count": result["detection_count"],
            "detections": result["detections"],
            "annotated_image_base64": result.get("annotated_image_base64"),
            "processed_count": result.get("processed_count", len(files_data)),
            "batch_items": result.get("batch_items", []),
            "model_architecture": result.get("model_architecture", "SSDLite320_MobileNet_V3_Large"),
        }

    return app
