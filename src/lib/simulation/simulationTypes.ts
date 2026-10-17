// Phase 11: Dynamic Offloading Simulation - Types
// Structured simulation state interfaces designed for direct compatibility with future backend telemetry

import {
  TaskState,
  DeviceState,
  EdgeState,
  CloudState,
  ExecutionTarget,
  CandidateScore,
  DecisionResult,
} from "@/lib/offloading/types";

// Workload Input Types (Phase 13B)
export type WorkloadInputType = "IMAGE" | "IMAGE_BATCH" | "VIDEO";

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  sizeMb: number;
  previewUrl?: string;
}

export interface VideoMetadata {
  durationSeconds?: number;
  width?: number;
  height?: number;
  resolution?: string;
}

export interface WorkloadTaskPayload {
  type: WorkloadInputType;
  files: UploadedFileItem[];
  totalSizeMb: number;
  imageCount?: number;
  videoMetadata?: VideoMetadata;
}

// Extended Simulation Task State with Priority & Workload Payload
export interface SimulationTaskState extends TaskState {
  priority: number; // 1-5, default 3
  workloadType?: WorkloadInputType;
  workloadPayload?: WorkloadTaskPayload;
}

// Extended Simulation Device (Local) State
export type SimulationDeviceState = DeviceState;

// Extended Simulation Edge State
export interface SimulationEdgeState extends EdgeState {
  memoryAvailablePct: number; // 0-100%, default 64%
}

// Extended Simulation Cloud State
export interface SimulationCloudState extends CloudState {
  memoryAvailablePct: number; // 0-100%, default 78%
}

export type WorkloadLevel = "LOW" | "MEDIUM" | "HIGH";
export type NetworkConditionLevel = "GOOD" | "LIMITED" | "POOR";

// Explicit Simulation Scenario Input Controls (Phase 13D)
// Local device values are never simulated: they always come from this machine's real telemetry.
export interface ExperimentConditions {
  edgeCongestion: WorkloadLevel;
  cloudLoad: WorkloadLevel;
  networkCondition: NetworkConditionLevel;
}

// Complete Simulation Input State (Future-compatible with TelemetryState)
export interface SimulationState {
  task: SimulationTaskState;
  device: SimulationDeviceState;
  edge: SimulationEdgeState;
  cloud: SimulationCloudState;
  isSimulated: boolean;
  activePresetId: string | null;
  lastEvaluatedAt: number;
  experimentConditions?: ExperimentConditions;
}

// Future Backend Telemetry Structure (Compatible interface)
export interface TelemetryState {
  task: SimulationTaskState;
  device: SimulationDeviceState;
  edge: SimulationEdgeState;
  cloud: SimulationCloudState;
  isSimulated: false;
  collectedAt: number;
  source: string;
}

// Scenario Preset Definition
export interface ScenarioPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  expectedWinner?: ExecutionTarget;
  state: {
    task: Partial<SimulationTaskState>;
    edge: Partial<SimulationEdgeState>;
    cloud: Partial<SimulationCloudState>;
  };
}

export type { ExecutionTarget, CandidateScore, DecisionResult };
