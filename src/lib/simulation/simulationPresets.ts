// Phase 11: Dynamic Offloading Simulation - Presets
// Deterministic scenario presets demonstrating decision shifts across changing workload and network conditions

import {
  SimulationTaskState,
  SimulationDeviceState,
  SimulationEdgeState,
  SimulationCloudState,
  ScenarioPreset,
} from "./simulationTypes";

// Baseline Default State (Phase 10 standard specifications)
export const DEFAULT_SIMULATION_TASK: SimulationTaskState = {
  id: "TASK_001",
  name: "OBJECT DETECTION",
  taskSizeMb: 12,
  cpuDemandPct: 68,
  memoryDemandPct: 52,
  deadlineMs: 45,
  priority: 3,
};

// Placeholder until the first real telemetry reading arrives (local values are never simulated).
export const DEFAULT_SIMULATION_DEVICE: SimulationDeviceState = {
  cpuAvailablePct: 38,
  memoryAvailablePct: 48,
  batteryPct: 72,
  latencyMs: 0.8,
};

export const DEFAULT_SIMULATION_EDGE: SimulationEdgeState = {
  cpuLoadPct: 41,
  queueLength: 2,
  latencyMs: 3.8,
  bandwidthGbps: 10,
  memoryAvailablePct: 64,
};

export const DEFAULT_SIMULATION_CLOUD: SimulationCloudState = {
  cpuLoadPct: 67,
  queueLength: 18,
  latencyMs: 42,
  bandwidthGbps: 25,
  memoryAvailablePct: 78,
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "balanced",
    name: "BALANCED",
    badge: "BASELINE",
    description: "Standard operating parameters. Edge node offers optimal balance of low latency and compute capacity.",
    state: {
      task: {
        taskSizeMb: 12,
        cpuDemandPct: 68,
        memoryDemandPct: 52,
        deadlineMs: 45,
        priority: 3,
      },
      edge: {
        cpuLoadPct: 41,
        queueLength: 2,
        latencyMs: 3.8,
        bandwidthGbps: 10,
        memoryAvailablePct: 64,
      },
      cloud: {
        cpuLoadPct: 67,
        queueLength: 18,
        latencyMs: 42,
        bandwidthGbps: 25,
        memoryAvailablePct: 78,
      },
    },
  },
  {
    id: "edge_congested",
    name: "EDGE CONGESTED",
    badge: "QUEUE SPIKE",
    description: "Multi-tenant traffic causes massive queue backlog (26 tasks) and high CPU load at the local edge server.",
    state: {
      task: {
        taskSizeMb: 16,
        cpuDemandPct: 72,
        memoryDemandPct: 55,
        deadlineMs: 85,
        priority: 3,
      },
      edge: {
        cpuLoadPct: 94,
        queueLength: 26,
        latencyMs: 18,
        bandwidthGbps: 3,
        memoryAvailablePct: 20,
      },
      cloud: {
        cpuLoadPct: 44,
        queueLength: 4,
        latencyMs: 36,
        bandwidthGbps: 40,
        memoryAvailablePct: 88,
      },
    },
  },
  {
    id: "low_bandwidth",
    name: "LOW BANDWIDTH",
    badge: "DEGRADED RAN",
    description: "Cellular connectivity drops to 1.5 Gbps with elevated RF latency. Large payload favors local execution.",
    state: {
      task: {
        taskSizeMb: 38,
        cpuDemandPct: 54,
        memoryDemandPct: 48,
        deadlineMs: 125,
        priority: 2,
      },
      edge: {
        cpuLoadPct: 45,
        queueLength: 4,
        latencyMs: 32,
        bandwidthGbps: 1.5,
        memoryAvailablePct: 62,
      },
      cloud: {
        cpuLoadPct: 58,
        queueLength: 16,
        latencyMs: 88,
        bandwidthGbps: 4,
        memoryAvailablePct: 75,
      },
    },
  },
  {
    id: "cloud_heavy",
    name: "CLOUD HEAVY",
    badge: "BATCH COMPUTE",
    description: "Intense machine learning batch payload requiring immense computational throughput suited for cloud datacenter clusters.",
    state: {
      task: {
        taskSizeMb: 48,
        cpuDemandPct: 95,
        memoryDemandPct: 88,
        deadlineMs: 145,
        priority: 5,
      },
      edge: {
        cpuLoadPct: 82,
        queueLength: 15,
        latencyMs: 8.5,
        bandwidthGbps: 12,
        memoryAvailablePct: 34,
      },
      cloud: {
        cpuLoadPct: 35,
        queueLength: 5,
        latencyMs: 35,
        bandwidthGbps: 65,
        memoryAvailablePct: 95,
      },
    },
  },
  {
    id: "deadline_critical",
    name: "DEADLINE CRITICAL",
    badge: "22MS SLA",
    description: "Ultra-low latency mission-critical loop. Strict 22ms deadline eliminates WAN cloud transfer.",
    state: {
      task: {
        taskSizeMb: 6,
        cpuDemandPct: 45,
        memoryDemandPct: 32,
        deadlineMs: 22,
        priority: 5,
      },
      edge: {
        cpuLoadPct: 26,
        queueLength: 1,
        latencyMs: 2.2,
        bandwidthGbps: 22,
        memoryAvailablePct: 80,
      },
      cloud: {
        cpuLoadPct: 50,
        queueLength: 12,
        latencyMs: 44,
        bandwidthGbps: 30,
        memoryAvailablePct: 82,
      },
    },
  },
];
