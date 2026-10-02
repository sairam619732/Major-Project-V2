"""HTTP Client for communicating with Edge and Cloud execution workers.

Phase 14: Real Task Execution Through Automatic Offloading.
Sends real HTTP POST requests with multipart file payloads to Edge (port 8001)
or Cloud (port 8002) workers. Measures actual network transmission time.
"""

import os
import time
from typing import List, Tuple, Dict, Any, Optional
import httpx

def get_worker_url_for_tier(tier: str) -> str:
    """Resolves target worker URL from environment configuration.

    Supports EDGE_SERVER_URL (preferred) or EDGE_WORKER_URL, default http://127.0.0.1:8001.
    Supports CLOUD_WORKER_URL, default http://127.0.0.1:8002.
    """
    t = tier.upper()
    if t == "EDGE":
        return (
            os.getenv("EDGE_SERVER_URL")
            or os.getenv("EDGE_WORKER_URL")
            or "http://127.0.0.1:8001"
        ).rstrip("/")
    elif t == "CLOUD":
        return os.getenv("CLOUD_WORKER_URL", "http://127.0.0.1:8002").rstrip("/")
    else:
        raise ValueError(f"Unknown distributed worker tier: {tier}")


async def execute_on_worker(
    tier: str,
    workload_type: str,
    files_data: List[Tuple[str, bytes, str]],
    task_id: str,
    confidence_threshold: float = 0.35,
    timeout_seconds: float = 45.0,
) -> Dict[str, Any]:
    """Transmits task payload to Edge or Cloud worker via real HTTP request."""
    worker_url = get_worker_url_for_tier(tier)

    # Build multipart form payload
    form_files = []
    for filename, content, mime in files_data:
        form_files.append(("files", (filename, content, mime or "application/octet-stream")))

    data = {
        "workload_type": workload_type.upper(),
        "task_id": task_id,
        "confidence_threshold": str(confidence_threshold),
    }

    start_transfer = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post(f"{worker_url}/execute", data=data, files=form_files)
            resp.raise_for_status()
            worker_data = resp.json()

        total_roundtrip_ms = round((time.perf_counter() - start_transfer) * 1000.0, 2)
        processing_time_ms = worker_data.get("processing_time_ms", 0.0)
        # Real network transfer time = roundtrip time minus remote processing time
        network_transfer_ms = round(max(0.5, total_roundtrip_ms - processing_time_ms), 2)

        worker_data["network_transfer_ms"] = network_transfer_ms
        worker_data["total_latency_ms"] = total_roundtrip_ms
        worker_data["status"] = "SUCCESS"
        worker_data["success"] = True
        worker_data["execution_node"] = tier.upper()
        worker_data["processing_time"] = processing_time_ms
        if "detected_objects" not in worker_data and "detections" in worker_data:
            worker_data["detected_objects"] = worker_data["detections"]
        return worker_data

    except (httpx.ConnectError, httpx.ConnectTimeout) as e:
        total_roundtrip_ms = round((time.perf_counter() - start_transfer) * 1000.0, 2)
        return {
            "success": False,
            "status": "FAILED",
            "worker_id": f"{tier.lower()}-server-unreachable",
            "execution_node": tier.upper(),
            "tier": tier.upper(),
            "task_id": task_id,
            "error_message": (
                f"Edge server unreachable at {worker_url}. "
                f"Please ensure the Edge server is running (`python run_edge_server.py`) on the target machine "
                f"and that firewalls allow traffic on the designated port. (Error: {str(e)})"
            ),
            "network_transfer_ms": total_roundtrip_ms,
            "processing_time": 0.0,
            "processing_time_ms": 0.0,
            "total_latency_ms": total_roundtrip_ms,
            "detection_count": 0,
            "detected_objects": [],
            "detections": [],
            "annotated_image_base64": None,
            "batch_items": [],
            "model_architecture": "SSDLite320_MobileNet_V3_Large",
        }
    except httpx.TimeoutException as e:
        total_roundtrip_ms = round((time.perf_counter() - start_transfer) * 1000.0, 2)
        return {
            "success": False,
            "status": "FAILED",
            "worker_id": f"{tier.lower()}-server-timeout",
            "execution_node": tier.upper(),
            "tier": tier.upper(),
            "task_id": task_id,
            "error_message": f"Edge server request timed out after {timeout_seconds}s at {worker_url}. (Error: {str(e)})",
            "network_transfer_ms": total_roundtrip_ms,
            "processing_time": 0.0,
            "processing_time_ms": 0.0,
            "total_latency_ms": total_roundtrip_ms,
            "detection_count": 0,
            "detected_objects": [],
            "detections": [],
            "annotated_image_base64": None,
            "batch_items": [],
            "model_architecture": "SSDLite320_MobileNet_V3_Large",
        }
    except Exception as e:
        total_roundtrip_ms = round((time.perf_counter() - start_transfer) * 1000.0, 2)
        return {
            "success": False,
            "status": "FAILED",
            "worker_id": f"{tier.lower()}-server-error",
            "execution_node": tier.upper(),
            "tier": tier.upper(),
            "task_id": task_id,
            "error_message": f"Worker execution error from {worker_url}: {str(e)}",
            "network_transfer_ms": total_roundtrip_ms,
            "processing_time": 0.0,
            "processing_time_ms": 0.0,
            "total_latency_ms": total_roundtrip_ms,
            "detection_count": 0,
            "detected_objects": [],
            "detections": [],
            "annotated_image_base64": None,
            "batch_items": [],
            "model_architecture": "SSDLite320_MobileNet_V3_Large",
        }
