import io
import time
import json
import platform
from typing import Optional, Any, List, Tuple
from PIL import Image
import psutil
from fastapi import APIRouter, status, UploadFile, File, Form, HTTPException

from app.models.simulation import (
    SimulationRequest,
    SimulationResponse,
    SimulationTaskInput,
    SimulationExecuteResponse,
    ObjectDetectionResultItem,
    ImageMetadataSchema,
)
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState
from app.services.evaluator import evaluate_simulation
from app.services.cv_executor import cv_executor
from app.ml.inference import inference_service
from app.ml.environment import compute_action_metrics

router = APIRouter(prefix="/simulation", tags=["Simulation"])


# Fixed on-device dispatch overhead (not measured) used as the local base latency.
LOCAL_BASE_LATENCY_MS = 1.2


def read_local_telemetry() -> dict:
    """Real CPU / memory / battery of this machine via psutil (battery is None without one)."""
    try:
        cpu_util = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        battery = psutil.sensors_battery()
        return {
            "ok": True,
            "cpu_load": round(cpu_util, 1),
            "cpu_available": round(max(0.0, min(100.0, 100.0 - cpu_util)), 1),
            "memory_available": round(mem.available / mem.total * 100.0, 1),
            "memory_total_gb": round(mem.total / (1024**3), 1),
            "battery_pct": round(battery.percent, 1) if battery is not None else None,
            "battery_plugged": bool(battery.power_plugged) if battery is not None else None,
            "cpu_count": psutil.cpu_count(logical=True),
        }
    except Exception:
        return {"ok": False}


def real_local_state() -> LocalNodeState:
    """Local node state for the DQN from real telemetry; a machine without a battery counts as 100%."""
    t = read_local_telemetry()
    if not t["ok"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not read local device telemetry (psutil).",
        )
    return LocalNodeState(
        cpu_available=t["cpu_available"],
        memory_available=t["memory_available"],
        battery_level=t["battery_pct"] if t["battery_pct"] is not None else 100.0,
        base_latency=LOCAL_BASE_LATENCY_MS,
    )


@router.get(
    "/telemetry/local",
    summary="Get Real Local Machine Telemetry",
    description="Collects empirical real-time CPU, RAM, and hardware telemetry from the host machine using psutil.",
)
async def get_real_local_telemetry():
    """Returns actual real-time telemetry from the local host system."""
    t = read_local_telemetry()
    if not t["ok"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not read local device telemetry (psutil).",
        )
    battery_pct = t["battery_pct"]
    battery_is_real = battery_pct is not None
    if battery_is_real:
        battery_status = "CHARGING / AC" if t["battery_plugged"] else "ON BATTERY"
    else:
        battery_status = "UNAVAILABLE (AC Mains / Desktop Host)"
    cpu_available = t["cpu_available"]
    cpu_util = t["cpu_load"]
    mem_available = t["memory_available"]
    mem_total_gb = t["memory_total_gb"]
    cpu_count = t["cpu_count"]

    return {
        "status": "success",
        "timestamp": time.time(),
        "platform": platform.platform(),
        "cpu_count": cpu_count,
        "cpu_available": cpu_available,
        "cpu_load": round(cpu_util, 1),
        "cpu_is_real": True,
        "memory_available": mem_available,
        "memory_total_gb": mem_total_gb,
        "memory_is_real": True,
        "battery_pct": battery_pct,
        "battery_status": battery_status,
        "battery_is_real": battery_is_real,
        # Not measured: a fixed on-device dispatch overhead used as the DQN's local base latency.
        "base_latency_ms": LOCAL_BASE_LATENCY_MS,
        "base_latency_status": "ASSUMED (fixed on-device dispatch overhead)",
        "base_latency_is_real": False,
    }


@router.post(
    "/evaluate",
    response_model=SimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Dynamic Offloading Simulation",
    description=(
        "Receives task parameters, local device conditions, edge server state, "
        "and cloud infrastructure telemetry to compute the optimal multi-objective execution target."
    ),
)
@router.post(
    "/run",
    response_model=SimulationResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def run_simulation_endpoint(payload: SimulationRequest) -> SimulationResponse:
    """Evaluates task offloading decision across Local, Edge, and Cloud tiers using the DQN policy."""
    response = evaluate_simulation(
        task=payload.task,
        local=payload.local,
        edge=payload.edge,
        cloud=payload.cloud,
        algorithm=payload.algorithm or "dqn",
    )
    return response


def _resolve_form_val(val: Any, default: Any) -> Any:
    """Helper to extract resolved parameter value when called via FastAPI or direct test harness."""
    if val is None or hasattr(val, "default"):
        return default
    return val


@router.post(
    "/execute",
    response_model=SimulationExecuteResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Real Workload with Automatic DQN Offloading",
    description=(
        "Accepts single image, image batch, or video stream. Extracts real workload features, "
        "invokes DQN to automatically select LOCAL, EDGE, or CLOUD, runs the workload in-process "
        "on the local host, and returns empirical detections and metrics. EDGE and CLOUD costs "
        "come from the cost model; no external edge or cloud server is needed."
    ),
)
async def execute_simulation_task(
    files: Optional[List[UploadFile]] = File(None, description="Uploaded image(s) or video payload"),
    file: Optional[UploadFile] = File(None, description="Single file upload fallback"),
    workload_type: Optional[str] = Form("IMAGE"),
    task_id: Optional[str] = Form("TASK_CV_001"),
    deadline_ms: Optional[float] = Form(None),
    priority: Optional[int] = Form(3),
    edge_cpu_load: Optional[float] = Form(40.0),
    edge_task_queue: Optional[int] = Form(2),
    edge_network_latency: Optional[float] = Form(14.5),
    edge_bandwidth: Optional[float] = Form(1.0),
    cloud_cpu_load: Optional[float] = Form(25.0),
    cloud_task_queue: Optional[int] = Form(5),
    cloud_network_latency: Optional[float] = Form(65.0),
    cloud_bandwidth: Optional[float] = Form(10.0),
    telemetry_json: Optional[str] = Form(None),
) -> SimulationExecuteResponse:
    """Unified automatic offloading and real CV task execution endpoint."""
    # STEP A: Consolidate uploaded files
    actual_files: List[UploadFile] = []
    if files:
        actual_files.extend(files)
    if file and not files:
        actual_files.append(file)

    if not actual_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided for execution.",
        )

    files_data: List[Tuple[str, bytes, str]] = []
    total_bytes = 0
    for f in actual_files:
        if not f.filename:
            continue
        try:
            content = await f.read()
            if not content:
                continue
            files_data.append((f.filename, content, f.content_type or "application/octet-stream"))
            total_bytes += len(content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read file {f.filename}: {str(e)}",
            )

    if not files_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file payload is empty.",
        )

    w_type = _resolve_form_val(workload_type, "IMAGE").upper()
    total_size_mb = max(0.01, round(total_bytes / (1024 * 1024), 3))

    # STEP B: Extract workload computational demands
    img_meta = None
    if w_type == "IMAGE":
        img_meta = cv_executor.extract_image_metadata(files_data[0][1])
        data_size_mb = img_meta["size_mb"]
        cpu_demand = img_meta["estimated_cpu_demand"]
        mem_demand = img_meta["estimated_memory_demand"]
    elif w_type == "IMAGE_BATCH":
        count = len(files_data)
        data_size_mb = total_size_mb
        cpu_demand = min(95.0, max(35.0, round(40.0 + min(count, 10) * 3.0 + total_size_mb * 1.5, 1)))
        mem_demand = min(90.0, max(30.0, round(35.0 + min(count, 10) * 3.0 + total_size_mb * 1.2, 1)))
        try:
            img_meta = cv_executor.extract_image_metadata(files_data[0][1])
        except Exception:
            pass
    else:  # VIDEO
        data_size_mb = total_size_mb
        cpu_demand = min(95.0, max(45.0, round(50.0 + total_size_mb * 0.4, 1)))
        mem_demand = min(90.0, max(35.0, round(45.0 + total_size_mb * 0.4, 1)))

    # Resolve parameters from Form objects or direct values
    task_id = _resolve_form_val(task_id, "TASK_CV_001")
    deadline_ms = _resolve_form_val(deadline_ms, 60.0)
    priority = _resolve_form_val(priority, 3)
    edge_cpu_load = _resolve_form_val(edge_cpu_load, 40.0)
    edge_task_queue = _resolve_form_val(edge_task_queue, 2)
    edge_network_latency = _resolve_form_val(edge_network_latency, 14.5)
    edge_bandwidth = _resolve_form_val(edge_bandwidth, 1.0)
    cloud_cpu_load = _resolve_form_val(cloud_cpu_load, 25.0)
    cloud_task_queue = _resolve_form_val(cloud_task_queue, 5)
    cloud_network_latency = _resolve_form_val(cloud_network_latency, 65.0)
    cloud_bandwidth = _resolve_form_val(cloud_bandwidth, 10.0)
    telemetry_json = _resolve_form_val(telemetry_json, None)

    # Parse optional telemetry_json override if supplied
    if telemetry_json:
        try:
            parsed = json.loads(telemetry_json)
            # Any "device"/"local" block is ignored: the local state is read from this machine below.
            if "edge" in parsed:
                ed = parsed["edge"]
                edge_cpu_load = ed.get("cpuLoadPct", ed.get("cpu_load", edge_cpu_load))
                edge_task_queue = ed.get("queueLength", ed.get("task_queue", edge_task_queue))
                edge_network_latency = ed.get("latencyMs", ed.get("network_latency", edge_network_latency))
                edge_bandwidth = ed.get("bandwidthGbps", ed.get("bandwidth", edge_bandwidth))

            if "cloud" in parsed:
                cl = parsed["cloud"]
                cloud_cpu_load = cl.get("cpuLoadPct", cl.get("cpu_load", cloud_cpu_load))
                cloud_task_queue = cl.get("queueLength", cl.get("task_queue", cloud_task_queue))
                cloud_network_latency = cl.get("latencyMs", cl.get("network_latency", cloud_network_latency))
                cloud_bandwidth = cl.get("bandwidthGbps", cl.get("bandwidth", cloud_bandwidth))

            if "task" in parsed:
                t = parsed["task"]
                if not task_id or task_id == "TASK_CV_001":
                    task_id = t.get("id", t.get("task_id", task_id))
                if deadline_ms is None:
                    deadline_ms = t.get("deadlineMs", t.get("deadline_ms", deadline_ms))
                if priority is None:
                    priority = t.get("priority", priority)
        except Exception:
            pass

    actual_deadline = float(deadline_ms) if deadline_ms is not None and float(deadline_ms) > 0 else 60.0
    actual_task_id = str(task_id) if task_id else f"TASK_CV_{int(time.time() % 10000):04d}"

    # Build node states
    local_state = real_local_state()
    edge_state = EdgeNodeState(
        cpu_load=max(0.0, min(100.0, float(edge_cpu_load or 40.0))),
        task_queue=max(0, int(edge_task_queue or 2)),
        network_latency=max(0.1, float(edge_network_latency or 14.5)),
        bandwidth=max(0.1, float(edge_bandwidth or 1.0)),
    )
    cloud_state = CloudNodeState(
        cpu_load=max(0.0, min(100.0, float(cloud_cpu_load or 25.0))),
        task_queue=max(0, int(cloud_task_queue or 5)),
        network_latency=max(0.1, float(cloud_network_latency or 65.0)),
        bandwidth=max(0.1, float(cloud_bandwidth or 10.0)),
    )

    task_input = SimulationTaskInput(
        task_id=actual_task_id,
        task_type="OBJECT_DETECTION",
        data_size_mb=data_size_mb,
        cpu_demand_percent=cpu_demand,
        memory_demand_percent=mem_demand,
        deadline_ms=actual_deadline,
        priority=priority or 3,
    )

    # STEP C: Call EXISTING DQN decision logic (Autonomous Routing)
    dqn_res = inference_service.predict(
        task=task_input,
        local=local_state,
        edge=edge_state,
        cloud=cloud_state,
    )

    # STEP D: Receive selected action (LOCAL / EDGE / CLOUD)
    decision = dqn_res["decision"].upper()
    action_idx = dqn_res["action_index"]
    confidence = float(dqn_res["confidence"])
    raw_q_values = dqn_res.get("q_values", {})
    q_values = {
        "local": raw_q_values.get("local", 0.0),
        "edge": raw_q_values.get("edge", 0.0),
        "cloud": raw_q_values.get("cloud", 0.0),
        "LOCAL": raw_q_values.get("local", 0.0),
        "EDGE": raw_q_values.get("edge", 0.0),
        "CLOUD": raw_q_values.get("cloud", 0.0),
    }

    # STEP E: Execute on the local host. The DQN decision is kept and reported, but every tier runs
    # in-process; EDGE/CLOUD network and queueing costs are modelled by compute_action_metrics.
    workload_res = cv_executor.process_workload(
        workload_type=w_type,
        files_data=[(name, data) for name, data, _ in files_data],
        tier="LOCAL",
    )
    exec_worker = "local-host-device"
    if decision == "LOCAL":
        exec_env = "LOCAL (On-Device CPU)"
        env_desc = "Executed locally on device without network transmission. Measured real neural inference compute."
    else:
        exec_env = f"LOCAL HOST ({decision} tier simulated)"
        env_desc = (
            f"DQN selected {decision}. The workload ran in-process on the local host; "
            f"{decision} network and queueing costs are estimated by the cost model."
        )
    processing_time_ms = workload_res["processing_time_ms"]
    network_transfer_ms = 0.0
    total_latency_ms = processing_time_ms
    detections = workload_res["detections"]
    detection_count = workload_res["detection_count"]
    annotated_b64 = workload_res.get("annotated_image_base64")
    batch_items = workload_res.get("batch_items", [])
    processed_count = workload_res.get("processed_count", 1)
    model_arch = workload_res.get("model_architecture", "SSDLite320_MobileNet_V3_Large")
    task_status = "SUCCESS"
    error_msg = None

    # Format detection items
    formatted_detections: List[ObjectDetectionResultItem] = []
    for d in detections:
        try:
            formatted_detections.append(
                ObjectDetectionResultItem(
                    label=str(d.get("label", "object")),
                    confidence=float(d.get("confidence", 0.5)),
                    box_normalized=list(d.get("box_normalized", [0.0, 0.0, 1.0, 1.0])),
                    box_pixels=list(d.get("box_pixels", [0, 0, 100, 100])),
                )
            )
        except Exception:
            pass

    # Compute DQN action metrics and candidate scores
    base_metrics = compute_action_metrics(
        task=task_input,
        local=local_state,
        edge=edge_state,
        cloud=cloud_state,
        action=action_idx,
    )

    eval_response = evaluate_simulation(
        task=task_input,
        local=local_state,
        edge=edge_state,
        cloud=cloud_state,
        algorithm="dqn",
    )

    # Format image metadata schema if available
    img_meta_schema = None
    if img_meta:
        try:
            img_meta_schema = ImageMetadataSchema(**img_meta)
        except Exception:
            pass

    is_feasible = total_latency_ms <= actual_deadline

    return SimulationExecuteResponse(
        task_id=actual_task_id,
        task_type="OBJECT_DETECTION",
        decision=decision,
        action_index=action_idx,
        confidence=confidence,
        q_values=q_values,
        execution_environment=exec_env,
        environment_description=env_desc,
        is_simulated_distributed=action_idx != 0,
        detections=formatted_detections,
        detection_count=len(formatted_detections),
        annotated_image_base64=annotated_b64,
        image_metadata=img_meta_schema,
        execution_time_ms=processing_time_ms,
        latency_ms=total_latency_ms,
        energy=base_metrics["energy_joules"],
        cost=base_metrics["cost"],
        reward=base_metrics["reward"],
        deadline_penalty=base_metrics["deadline_penalty"],
        feasible=is_feasible,
        success=task_status == "SUCCESS",
        model_architecture=model_arch,
        candidateScores=eval_response.candidateScores,
        reason=eval_response.reason,
        summary=eval_response.summary,
        # Phase 14 Execution Architecture Metrics
        execution_worker=exec_worker,
        workload_type=w_type,
        input_size_mb=total_size_mb,
        processing_time_ms=processing_time_ms,
        network_transfer_ms=network_transfer_ms,
        processed_count=processed_count,
        batch_items=batch_items,
        status=task_status,
        error_message=error_msg,
    )



