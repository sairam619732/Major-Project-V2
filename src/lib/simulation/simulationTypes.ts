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

// Extended Simulation Task State with Priority
export interface SimulationTaskState extends TaskState {
  priority: number; // 1-5, default 3
}

// Extended Simulation Device (Local) State
export interface SimulationDeviceState extends DeviceState {}

// Extended Simulation Edge State
export interface SimulationEdgeState extends EdgeState {
  memoryAvailablePct: number; // 0-100%, default 64%
}

// Extended Simulation Cloud State
export interface SimulationCloudState extends CloudState {
  memoryAvailablePct: number; // 0-100%, default 78%
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
    device: Partial<SimulationDeviceState>;
    edge: Partial<SimulationEdgeState>;
    cloud: Partial<SimulationCloudState>;
  };
}

export type { ExecutionTarget, CandidateScore, DecisionResult };
