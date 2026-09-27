// Phase 10: Dynamic Offloading Decision Engine - Types
// Pure TypeScript data definitions for task offloading optimization

export type ExecutionTarget = "local" | "edge" | "cloud";

export interface TaskState {
  id: string;
  name: string;
  taskSizeMb: number; // Task payload size in MB (e.g. 12 MB)
  cpuDemandPct: number; // Required CPU workload intensity (0-100%)
  memoryDemandPct: number; // Required Memory allocation (0-100%)
  deadlineMs: number; // Max allowable completion latency in ms (e.g. 45 ms)
}

export interface DeviceState {
  cpuAvailablePct: number; // Available CPU capacity (0-100%)
  memoryAvailablePct: number; // Available RAM capacity (0-100%)
  batteryPct: number; // Battery level (0-100%)
  latencyMs: number; // Bus / internal communication latency in ms
}

export interface EdgeState {
  cpuLoadPct: number; // Current CPU utilization on Edge server (0-100%)
  queueLength: number; // Number of tasks waiting in queue
  latencyMs: number; // Network round-trip ping to Edge node in ms
  bandwidthGbps: number; // Network throughput to Edge in Gbps
}

export interface CloudState {
  cpuLoadPct: number; // Current CPU utilization in Cloud cluster (0-100%)
  queueLength: number; // Number of tasks waiting in queue
  latencyMs: number; // Network round-trip ping to Cloud in ms
  bandwidthGbps: number; // Network throughput to Cloud in Gbps
}

export interface CostBreakdown {
  computeCost: number; // Cost of compute time and relative compute deficit
  networkCost: number; // Cost of network latency and data transfer time
  queueCost: number; // Latency incurred from queued backlog
  resourcePressure: number; // Stress on memory, thermal, or battery reserves
  deadlineRisk: number; // Penalty when estimated completion approaches or exceeds deadline
  totalCost: number; // Weighted sum of all cost components (lower is better)
}

export interface CandidateScore {
  target: ExecutionTarget;
  displayName: string;
  score: number; // Normalized total cost index [0-100]
  breakdown: CostBreakdown;
  estimatedLatencyMs: number; // Estimated total completion time in ms
  feasible: boolean; // Whether the candidate meets absolute constraints
}

export interface DecisionResult {
  taskId: string;
  timestamp: number;
  selectedTarget: ExecutionTarget;
  selectedCandidate: CandidateScore;
  candidateScores: Record<ExecutionTarget, CandidateScore>;
  reason: string;
  summary: string;
  isSimulated: boolean;
}
