"""Baseline Multi-Criteria Offloading Evaluator Service.

NOTE: This service implements the foundational deterministic multi-criteria baseline
for Phase 13 frontend-backend integration. Advanced AI/reinforcement learning
optimization models will be incorporated in subsequent methodology phases.
"""

import time
from typing import Dict
from app.models.simulation import (
    SimulationTaskInput,
    CostBreakdownSchema,
    CandidateScoreSchema,
    SimulationResponse,
)
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState

# Weights for multi-objective cost formulation matching research baseline
WEIGHTS = {
    "compute": 1.0,
    "network": 1.1,
    "queue": 1.0,
    "pressure": 0.9,
    "risk": 1.3,
}


def evaluate_local_candidate(
    task: SimulationTaskInput,
    device: LocalNodeState,
) -> CandidateScoreSchema:
    """Evaluates Local Device execution feasibility and cost."""
    # 1. Network Delay: Bus/internal latency only (no wireless transfer)
    net_latency_ms = device.base_latency
    network_cost = round(net_latency_ms * 0.5, 1)

    # 2. Compute Execution Time & Capacity Deficit
    base_exec_ms = (task.data_size_mb / 12.0) * (task.cpu_demand_percent / 68.0) * 36.0
    cpu_deficit_pct = max(0.0, task.cpu_demand_percent - device.cpu_available)
    throttle_factor = 1.0 + (cpu_deficit_pct / 38.0) * 0.85
    estimated_exec_ms = base_exec_ms * throttle_factor
    compute_cost = round(estimated_exec_ms * 0.72, 1)

    # 3. Queue Cost: Dedicated device, 0 queued tasks
    queue_cost = 0.0

    # 4. Resource Pressure: Memory deficit + battery penalty
    mem_deficit_pct = max(0.0, task.memory_demand_percent - device.memory_available)
    battery_factor = 2.5 if device.battery_level < 30 else (1.4 if device.battery_level < 60 else 1.0)
    resource_pressure = round(
        (cpu_deficit_pct * 0.28 + mem_deficit_pct * 0.45) * battery_factor + (100.0 - device.battery_level) * 0.08,
        1,
    )

    # 5. Total Latency & Deadline Risk
    total_latency_ms = round(net_latency_ms + estimated_exec_ms, 1)
    deadline_slack = task.deadline_ms - total_latency_ms

    if deadline_slack < 0:
        deadline_risk = round(24.0 + abs(deadline_slack) * 1.8, 1)
    elif deadline_slack < 10:
        deadline_risk = round((10.0 - deadline_slack) * 1.5, 1)
    else:
        deadline_risk = round(max(1.0, 4.0 - deadline_slack * 0.1), 1)

    total_cost = round(
        compute_cost * WEIGHTS["compute"]
        + network_cost * WEIGHTS["network"]
        + queue_cost * WEIGHTS["queue"]
        + resource_pressure * WEIGHTS["pressure"]
        + deadline_risk * WEIGHTS["risk"],
        1,
    )

    breakdown = CostBreakdownSchema(
        computeCost=compute_cost,
        networkCost=network_cost,
        queueCost=queue_cost,
        resourcePressure=resource_pressure,
        deadlineRisk=deadline_risk,
        totalCost=total_cost,
    )

    return CandidateScoreSchema(
        target="local",
        displayName="LOCAL",
        score=total_cost,
        breakdown=breakdown,
        estimatedLatencyMs=total_latency_ms,
        feasible=(deadline_slack >= -15 and mem_deficit_pct < 25),
    )


def evaluate_edge_candidate(
    task: SimulationTaskInput,
    edge: EdgeNodeState,
) -> CandidateScoreSchema:
    """Evaluates Edge Server execution feasibility and cost."""
    # 1. Network Delay: Round-trip ping + payload transmission time
    transfer_ms = (task.data_size_mb * 8.0) / (edge.bandwidth * 1000.0) if edge.bandwidth > 0 else 50.0
    rtt_ms = 2.0 * edge.network_latency
    net_latency_ms = rtt_ms + transfer_ms
    network_cost = round(net_latency_ms * 1.1, 1)

    # 2. Compute Execution Time on Edge Server (2.4x faster hardware than mobile)
    base_exec_ms = ((task.data_size_mb / 12.0) * (task.cpu_demand_percent / 68.0) * 36.0) / 2.4
    edge_load_factor = 1.0 + (edge.cpu_load / 100.0) * 0.45
    estimated_exec_ms = base_exec_ms * edge_load_factor
    compute_cost = round(estimated_exec_ms * 0.75, 1)

    # 3. Queue Cost: Edge queue latency (~3.2 ms per queued task)
    queue_latency_ms = edge.task_queue * 3.2
    queue_cost = round(edge.task_queue * 3.5, 1)

    # 4. Resource Pressure on Edge: based on current CPU load
    resource_pressure = round((edge.cpu_load / 100.0) * 12.0, 1)

    # 5. Total Latency & Deadline Risk
    total_latency_ms = round(net_latency_ms + queue_latency_ms + estimated_exec_ms, 1)
    deadline_slack = task.deadline_ms - total_latency_ms

    if deadline_slack < 0:
        deadline_risk = round(24.0 + abs(deadline_slack) * 1.8, 1)
    elif deadline_slack < 10:
        deadline_risk = round((10.0 - deadline_slack) * 1.4, 1)
    else:
        deadline_risk = round(max(1.0, 3.5 - deadline_slack * 0.08), 1)

    total_cost = round(
        compute_cost * WEIGHTS["compute"]
        + network_cost * WEIGHTS["network"]
        + queue_cost * WEIGHTS["queue"]
        + resource_pressure * WEIGHTS["pressure"]
        + deadline_risk * WEIGHTS["risk"],
        1,
    )

    breakdown = CostBreakdownSchema(
        computeCost=compute_cost,
        networkCost=network_cost,
        queueCost=queue_cost,
        resourcePressure=resource_pressure,
        deadlineRisk=deadline_risk,
        totalCost=total_cost,
    )

    return CandidateScoreSchema(
        target="edge",
        displayName="EDGE",
        score=total_cost,
        breakdown=breakdown,
        estimatedLatencyMs=total_latency_ms,
        feasible=(deadline_slack >= -10 and edge.cpu_load < 95),
    )


def evaluate_cloud_candidate(
    task: SimulationTaskInput,
    cloud: CloudNodeState,
) -> CandidateScoreSchema:
    """Evaluates Centralized Cloud Datacenter execution feasibility and cost."""
    # 1. Network Delay: WAN round-trip ping + transfer
    transfer_ms = (task.data_size_mb * 8.0) / (cloud.bandwidth * 1000.0) if cloud.bandwidth > 0 else 100.0
    rtt_ms = 2.0 * cloud.network_latency
    net_latency_ms = rtt_ms + transfer_ms
    network_cost = round(min(48.0, net_latency_ms * 0.45), 1)

    # 2. Compute Execution Time in Cloud Cluster (4.0x faster hardware)
    base_exec_ms = ((task.data_size_mb / 12.0) * (task.cpu_demand_percent / 68.0) * 36.0) / 4.0
    cloud_load_factor = 1.0 + (cloud.cpu_load / 100.0) * 0.35
    estimated_exec_ms = base_exec_ms * cloud_load_factor
    compute_cost = round(estimated_exec_ms * 0.65, 1)

    # 3. Queue Cost: Large multi-tenant datacenter queue
    queue_latency_ms = cloud.task_queue * 1.6
    queue_cost = round(cloud.task_queue * 1.7, 1)

    # 4. Resource Pressure in Cloud: resilient datacenter pool
    resource_pressure = round((cloud.cpu_load / 100.0) * 10.0, 1)

    # 5. Total Latency & Deadline Risk
    total_latency_ms = round(net_latency_ms + queue_latency_ms + estimated_exec_ms, 1)
    deadline_slack = task.deadline_ms - total_latency_ms

    if deadline_slack < 0:
        deadline_risk = round(24.0 + min(30.0, abs(deadline_slack) * 0.75), 1)
    elif deadline_slack < 10:
        deadline_risk = round((10.0 - deadline_slack) * 1.4, 1)
    else:
        deadline_risk = round(max(1.0, 3.0 - deadline_slack * 0.05), 1)

    total_cost = round(
        compute_cost * WEIGHTS["compute"]
        + network_cost * WEIGHTS["network"]
        + queue_cost * WEIGHTS["queue"]
        + resource_pressure * WEIGHTS["pressure"]
        + deadline_risk * WEIGHTS["risk"],
        1,
    )

    breakdown = CostBreakdownSchema(
        computeCost=compute_cost,
        networkCost=network_cost,
        queueCost=queue_cost,
        resourcePressure=resource_pressure,
        deadlineRisk=deadline_risk,
        totalCost=total_cost,
    )

    return CandidateScoreSchema(
        target="cloud",
        displayName="CLOUD",
        score=total_cost,
        breakdown=breakdown,
        estimatedLatencyMs=total_latency_ms,
        feasible=(deadline_slack >= -60),
    )


def generate_reason(
    selected: str,
    task: SimulationTaskInput,
    device: LocalNodeState,
    edge: EdgeNodeState,
    cloud: CloudNodeState,
) -> str:
    """Generates an explainable justification for the selected target."""
    if selected == "edge":
        if edge.network_latency < cloud.network_latency and edge.cpu_load < 65:
            return f"Lower network latency ({edge.network_latency} ms) and available edge capacity provide the lowest simulated execution cost for {task.task_id}."
        return f"Edge execution minimizes round-trip latency ({edge.network_latency} ms) while offloading local device constraints."

    if selected == "local":
        return f"Ample local device resources ({device.cpu_available}% CPU available) and zero network overhead provide the lowest simulated execution cost for {task.task_id}."

    if edge.task_queue > 10 or edge.cpu_load > 80:
        return f"Centralized cloud throughput overcomes local and edge congestion ({edge.task_queue} tasks queued at edge) despite higher WAN latency."
    return "High computational demands favor scalable cloud infrastructure with the lowest aggregate execution cost."


def evaluate_simulation(
    task: SimulationTaskInput,
    local: LocalNodeState,
    edge: EdgeNodeState,
    cloud: CloudNodeState,
    algorithm: str = "dqn",
) -> SimulationResponse:
    """Evaluates offloading trade-offs across Local, Edge, and Cloud environments using DQN or heuristic baseline."""
    # Lazy import to prevent circular dependency
    from app.ml.inference import inference_service

    local_candidate = evaluate_local_candidate(task, local)
    edge_candidate = evaluate_edge_candidate(task, edge)
    cloud_candidate = evaluate_cloud_candidate(task, cloud)

    scores_map: Dict[str, CandidateScoreSchema] = {
        "local": local_candidate,
        "edge": edge_candidate,
        "cloud": cloud_candidate,
    }

    algorithm = (algorithm or "dqn").lower()

    if algorithm == "dqn":
        dqn_res = inference_service.predict(
            task=task,
            local=local,
            edge=edge,
            cloud=cloud,
        )
        best_target = dqn_res["decision"].lower()
        method = dqn_res["method"]
        confidence = float(dqn_res.get("confidence", 0.3333))
        q_values = dqn_res.get("q_values")
        is_fallback = bool(dqn_res.get("is_fallback", False))
    else:
        # Classical multi-criteria heuristic baseline
        best_target = min(scores_map.keys(), key=lambda t: scores_map[t].score)
        method = "rule_based"
        confidence = 0.3333
        q_values = {"local": 0.0, "edge": 0.0, "cloud": 0.0}
        is_fallback = False

    selected_candidate = scores_map.get(best_target, local_candidate)
    base_reason = generate_reason(best_target, task, local, edge, cloud)

    if method == "dqn":
        reason_str = f"DQN agent selected {selected_candidate.displayName} with {round(confidence * 100, 1)}% confidence. {base_reason}"
        summary_str = f"{selected_candidate.displayName} selected via DQN Policy with total cost score of {selected_candidate.score} (est. {selected_candidate.estimatedLatencyMs} ms)."
    elif method == "rule_based_fallback":
        reason_str = f"Rule-based fallback selected {selected_candidate.displayName}. {base_reason}"
        summary_str = f"{selected_candidate.displayName} selected via Fallback Policy with total cost score of {selected_candidate.score} (est. {selected_candidate.estimatedLatencyMs} ms)."
    else:
        reason_str = base_reason
        summary_str = f"{selected_candidate.displayName} selected with total cost score of {selected_candidate.score} (est. {selected_candidate.estimatedLatencyMs} ms)."

    return SimulationResponse(
        status="success",
        taskId=task.task_id,
        timestamp=time.time(),
        selectedTarget=best_target,
        selectedCandidate=selected_candidate,
        candidateScores=scores_map,
        reason=reason_str,
        summary=summary_str,
        isSimulated=True,
        source="backend",
        method=method,
        confidence=confidence,
        q_values=q_values,
        is_fallback=is_fallback,
    )

