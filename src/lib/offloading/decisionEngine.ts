// Phase 10: Dynamic Offloading Decision Engine
// Pure deterministic multi-criteria optimization baseline
// Evaluates Local, Edge, and Cloud candidate execution environments based on simulated task and system inputs

import {
  TaskState,
  DeviceState,
  EdgeState,
  CloudState,
  ExecutionTarget,
  CandidateScore,
  DecisionResult,
  CostBreakdown,
} from "./types";

// Standard Simulated Benchmark Inputs (Phase 10 Specifications)
export const DEFAULT_TASK: TaskState = {
  id: "TASK_001",
  name: "OBJECT DETECTION",
  taskSizeMb: 12,
  cpuDemandPct: 68,
  memoryDemandPct: 52,
  deadlineMs: 45,
};

export const DEFAULT_DEVICE: DeviceState = {
  cpuAvailablePct: 38,
  memoryAvailablePct: 48,
  batteryPct: 72,
  latencyMs: 0.8,
};

export const DEFAULT_EDGE: EdgeState = {
  cpuLoadPct: 41,
  queueLength: 2,
  latencyMs: 3.8,
  bandwidthGbps: 10,
};

export const DEFAULT_CLOUD: CloudState = {
  cpuLoadPct: 67,
  queueLength: 18,
  latencyMs: 42,
  bandwidthGbps: 25,
};

/**
 * Weights for Multi-Objective Cost Formulation
 * Total Cost = w_comp * C_comp + w_net * C_net + w_queue * C_queue + w_pres * C_pres + w_risk * C_risk
 */
const WEIGHTS = {
  compute: 1.0,
  network: 1.1,
  queue: 1.0,
  pressure: 0.9,
  risk: 1.3,
};

/**
 * Evaluates Local Device execution feasibility and cost
 */
function evaluateLocalCandidate(
  task: TaskState,
  device: DeviceState
): CandidateScore {
  // 1. Network Delay: Bus/internal latency only (no wireless transfer)
  const netLatencyMs = device.latencyMs;
  const networkCost = Number((netLatencyMs * 0.5).toFixed(1));

  // 2. Compute Execution Time & Capacity Deficit
  // Reference execution duration on standard mobile CPU = 36 ms for a 12 MB task
  const baseExecMs = (task.taskSizeMb / 12) * (task.cpuDemandPct / 68) * 36;
  const cpuDeficitPct = Math.max(0, task.cpuDemandPct - device.cpuAvailablePct);
  // Throttling multiplier when demand exceeds available capacity
  const throttleFactor = 1 + (cpuDeficitPct / 38) * 0.85;
  const estimatedExecMs = baseExecMs * throttleFactor;
  const computeCost = Number((estimatedExecMs * 0.72).toFixed(1));

  // 3. Queue Cost: Dedicated device, 0 queued tasks
  const queueLatencyMs = 0;
  const queueCost = 0.0;

  // 4. Resource Pressure: Memory deficit + battery penalty
  const memDeficitPct = Math.max(0, task.memoryDemandPct - device.memoryAvailablePct);
  const batteryFactor = device.batteryPct < 30 ? 2.5 : device.batteryPct < 60 ? 1.4 : 1.0;
  const resourcePressure = Number(
    ((cpuDeficitPct * 0.28 + memDeficitPct * 0.45) * batteryFactor + (100 - device.batteryPct) * 0.08).toFixed(1)
  );

  // 5. Total Latency & Deadline Risk
  const totalLatencyMs = Number((netLatencyMs + queueLatencyMs + estimatedExecMs).toFixed(1));
  const deadlineSlack = task.deadlineMs - totalLatencyMs;
  let deadlineRisk = 0;
  if (deadlineSlack < 0) {
    // Deadline breached
    deadlineRisk = Number((24 + Math.abs(deadlineSlack) * 1.8).toFixed(1));
  } else if (deadlineSlack < 10) {
    // Tight deadline (< 10ms slack)
    deadlineRisk = Number(((10 - deadlineSlack) * 1.5).toFixed(1));
  } else {
    deadlineRisk = Number((Math.max(1, 4 - deadlineSlack * 0.1)).toFixed(1));
  }

  const breakdown: CostBreakdown = {
    computeCost,
    networkCost,
    queueCost,
    resourcePressure,
    deadlineRisk,
    totalCost: Number(
      (
        computeCost * WEIGHTS.compute +
        networkCost * WEIGHTS.network +
        queueCost * WEIGHTS.queue +
        resourcePressure * WEIGHTS.pressure +
        deadlineRisk * WEIGHTS.risk
      ).toFixed(1)
    ),
  };

  return {
    target: "local",
    displayName: "LOCAL",
    score: breakdown.totalCost,
    breakdown,
    estimatedLatencyMs: totalLatencyMs,
    feasible: deadlineSlack >= -15 && memDeficitPct < 25,
  };
}

/**
 * Evaluates Distributed Edge Server execution feasibility and cost
 */
function evaluateEdgeCandidate(task: TaskState, edge: EdgeState): CandidateScore {
  // 1. Network Delay: Round-trip ping + payload transmission time
  // Transmission time (ms) = (size_MB * 8) / (bandwidth_Gbps * 1000)
  const transferMs = (task.taskSizeMb * 8) / (edge.bandwidthGbps * 1000);
  const rttMs = 2 * edge.latencyMs;
  const netLatencyMs = rttMs + transferMs;
  const networkCost = Number((netLatencyMs * 1.1).toFixed(1));

  // 2. Compute Execution Time on Edge Server (2.4x faster hardware than mobile)
  const baseExecMs = ((task.taskSizeMb / 12) * (task.cpuDemandPct / 68) * 36) / 2.4;
  const edgeLoadFactor = 1 + (edge.cpuLoadPct / 100) * 0.45;
  const estimatedExecMs = baseExecMs * edgeLoadFactor;
  const computeCost = Number((estimatedExecMs * 0.75).toFixed(1));

  // 3. Queue Cost: Edge queue latency (~3.2 ms per queued task)
  const queueLatencyMs = edge.queueLength * 3.2;
  const queueCost = Number((edge.queueLength * 3.5).toFixed(1));

  // 4. Resource Pressure on Edge: based on current CPU load
  const resourcePressure = Number(((edge.cpuLoadPct / 100) * 12.0).toFixed(1));

  // 5. Total Latency & Deadline Risk
  const totalLatencyMs = Number((netLatencyMs + queueLatencyMs + estimatedExecMs).toFixed(1));
  const deadlineSlack = task.deadlineMs - totalLatencyMs;
  let deadlineRisk = 0;
  if (deadlineSlack < 0) {
    deadlineRisk = Number((24 + Math.abs(deadlineSlack) * 1.8).toFixed(1));
  } else if (deadlineSlack < 10) {
    deadlineRisk = Number(((10 - deadlineSlack) * 1.4).toFixed(1));
  } else {
    deadlineRisk = Number((Math.max(1, 3.5 - deadlineSlack * 0.08)).toFixed(1));
  }

  const breakdown: CostBreakdown = {
    computeCost,
    networkCost,
    queueCost,
    resourcePressure,
    deadlineRisk,
    totalCost: Number(
      (
        computeCost * WEIGHTS.compute +
        networkCost * WEIGHTS.network +
        queueCost * WEIGHTS.queue +
        resourcePressure * WEIGHTS.pressure +
        deadlineRisk * WEIGHTS.risk
      ).toFixed(1)
    ),
  };

  return {
    target: "edge",
    displayName: "EDGE",
    score: breakdown.totalCost,
    breakdown,
    estimatedLatencyMs: totalLatencyMs,
    feasible: deadlineSlack >= -10 && edge.cpuLoadPct < 95,
  };
}

/**
 * Evaluates Centralized Cloud Datacenter execution feasibility and cost
 */
function evaluateCloudCandidate(task: TaskState, cloud: CloudState): CandidateScore {
  // 1. Network Delay: WAN round-trip ping + transfer
  const transferMs = (task.taskSizeMb * 8) / (cloud.bandwidthGbps * 1000);
  const rttMs = 2 * cloud.latencyMs;
  const netLatencyMs = rttMs + transferMs;
  // High WAN latency penalty
  const networkCost = Number((Math.min(48, netLatencyMs * 0.45)).toFixed(1));

  // 2. Compute Execution Time in Cloud Cluster (4.0x faster hardware)
  const baseExecMs = ((task.taskSizeMb / 12) * (task.cpuDemandPct / 68) * 36) / 4.0;
  const cloudLoadFactor = 1 + (cloud.cpuLoadPct / 100) * 0.35;
  const estimatedExecMs = baseExecMs * cloudLoadFactor;
  const computeCost = Number((estimatedExecMs * 0.65).toFixed(1));

  // 3. Queue Cost: Large multi-tenant datacenter queue
  const queueLatencyMs = cloud.queueLength * 1.6;
  const queueCost = Number((cloud.queueLength * 1.7).toFixed(1));

  // 4. Resource Pressure in Cloud: resilient datacenter pool
  const resourcePressure = Number(((cloud.cpuLoadPct / 100) * 10.0).toFixed(1));

  // 5. Total Latency & Deadline Risk
  const totalLatencyMs = Number((netLatencyMs + queueLatencyMs + estimatedExecMs).toFixed(1));
  const deadlineSlack = task.deadlineMs - totalLatencyMs;
  let deadlineRisk = 0;
  if (deadlineSlack < 0) {
    deadlineRisk = Number((24 + Math.min(30, Math.abs(deadlineSlack) * 0.75)).toFixed(1));
  } else if (deadlineSlack < 10) {
    deadlineRisk = Number(((10 - deadlineSlack) * 1.4).toFixed(1));
  } else {
    deadlineRisk = Number((Math.max(1, 3 - deadlineSlack * 0.05)).toFixed(1));
  }

  const breakdown: CostBreakdown = {
    computeCost,
    networkCost,
    queueCost,
    resourcePressure,
    deadlineRisk,
    totalCost: Number(
      (
        computeCost * WEIGHTS.compute +
        networkCost * WEIGHTS.network +
        queueCost * WEIGHTS.queue +
        resourcePressure * WEIGHTS.pressure +
        deadlineRisk * WEIGHTS.risk
      ).toFixed(1)
    ),
  };

  return {
    target: "cloud",
    displayName: "CLOUD",
    score: breakdown.totalCost,
    breakdown,
    estimatedLatencyMs: totalLatencyMs,
    feasible: deadlineSlack >= -60,
  };
}

/**
 * Dynamically synthesizes an explainable reason for the selection
 * based directly on computed metrics and relative differentials.
 */
function generateExplainableReason(
  selected: ExecutionTarget,
  candidates: Record<ExecutionTarget, CandidateScore>,
  task: TaskState,
  device: DeviceState,
  edge: EdgeState,
  cloud: CloudState
): string {
  if (selected === "edge") {
    // Edge selected: compare latency with cloud and capacity with local
    if (edge.latencyMs < cloud.latencyMs && edge.cpuLoadPct < 65) {
      return `Lower network latency and available edge capacity provide the lowest simulated execution cost for ${task.id}.`;
    }
    return `Edge execution minimizes round-trip latency (${edge.latencyMs} ms) while offloading local device constraints.`;
  }

  if (selected === "local") {
    // Local selected: local device has healthy capacity and zero network latency
    return `Ample local device resources (${device.cpuAvailablePct}% CPU available) and zero network overhead provide the lowest simulated execution cost for ${task.id}.`;
  }

  // Cloud selected: high compute requirement or edge queue congestion
  if (edge.queueLength > 10 || edge.cpuLoadPct > 80) {
    return `Centralized cloud throughput overcomes local and edge congestion (${edge.queueLength} tasks queued at edge) despite higher WAN latency.`;
  }
  return `High computational demands favor scalable cloud infrastructure with the lowest aggregate execution cost.`;
}

/**
 * Main Pure Decision Function
 * Deterministically evaluates candidates and selects the execution target with the lowest total cost.
 */
export function evaluateOffloadingDecision(
  task: TaskState = DEFAULT_TASK,
  device: DeviceState = DEFAULT_DEVICE,
  edge: EdgeState = DEFAULT_EDGE,
  cloud: CloudState = DEFAULT_CLOUD
): DecisionResult {
  const localCandidate = evaluateLocalCandidate(task, device);
  const edgeCandidate = evaluateEdgeCandidate(task, edge);
  const cloudCandidate = evaluateCloudCandidate(task, cloud);

  const candidateScores: Record<ExecutionTarget, CandidateScore> = {
    local: localCandidate,
    edge: edgeCandidate,
    cloud: cloudCandidate,
  };

  // Select target with the lowest total cost score
  const targets: ExecutionTarget[] = ["local", "edge", "cloud"];
  let bestTarget: ExecutionTarget = "edge";
  let minCost = Infinity;

  for (const t of targets) {
    if (candidateScores[t].score < minCost) {
      minCost = candidateScores[t].score;
      bestTarget = t;
    }
  }

  const selectedCandidate = candidateScores[bestTarget];
  const reason = generateExplainableReason(
    bestTarget,
    candidateScores,
    task,
    device,
    edge,
    cloud
  );

  return {
    taskId: task.id,
    timestamp: Date.now(),
    selectedTarget: bestTarget,
    selectedCandidate,
    candidateScores,
    reason,
    summary: `${selectedCandidate.displayName} selected with total cost score of ${selectedCandidate.score} (est. ${selectedCandidate.estimatedLatencyMs} ms).`,
    isSimulated: true,
  };
}
