// Phase 11: Dynamic Offloading Simulation - Reactive State Store
// Manages simulated parameters, triggers deterministic evaluation, and delivers live updates to UI & 3D

"use client";

import { useSyncExternalStore, useCallback } from "react";
import {
  SimulationState,
  SimulationTaskState,
  SimulationDeviceState,
  SimulationEdgeState,
  SimulationCloudState,
  DecisionResult,
} from "./simulationTypes";
import {
  DEFAULT_SIMULATION_TASK,
  DEFAULT_SIMULATION_DEVICE,
  DEFAULT_SIMULATION_EDGE,
  DEFAULT_SIMULATION_CLOUD,
  SCENARIO_PRESETS,
} from "./simulationPresets";
import { evaluateOffloadingDecision } from "@/lib/offloading/decisionEngine";

// Singleton In-Memory Simulation State Container
let currentSimulationState: SimulationState = {
  task: { ...DEFAULT_SIMULATION_TASK },
  device: { ...DEFAULT_SIMULATION_DEVICE },
  edge: { ...DEFAULT_SIMULATION_EDGE },
  cloud: { ...DEFAULT_SIMULATION_CLOUD },
  isSimulated: true,
  activePresetId: "balanced",
  lastEvaluatedAt: Date.now(),
};

// Compute initial decision
let currentDecisionResult: DecisionResult = evaluateOffloadingDecision(
  currentSimulationState.task,
  currentSimulationState.device,
  currentSimulationState.edge,
  currentSimulationState.cloud
);

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function evaluateAndUpdate() {
  currentDecisionResult = evaluateOffloadingDecision(
    currentSimulationState.task,
    currentSimulationState.device,
    currentSimulationState.edge,
    currentSimulationState.cloud
  );
  currentSimulationState = {
    ...currentSimulationState,
    lastEvaluatedAt: Date.now(),
  };
  notify();
}

export const simulationStore = {
  getState(): SimulationState {
    return currentSimulationState;
  },

  getDecision(): DecisionResult {
    return currentDecisionResult;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  updateTask(updates: Partial<SimulationTaskState>) {
    currentSimulationState = {
      ...currentSimulationState,
      task: { ...currentSimulationState.task, ...updates },
      activePresetId: null, // Custom user modification
    };
    evaluateAndUpdate();
  },

  updateDevice(updates: Partial<SimulationDeviceState>) {
    currentSimulationState = {
      ...currentSimulationState,
      device: { ...currentSimulationState.device, ...updates },
      activePresetId: null,
    };
    evaluateAndUpdate();
  },

  updateEdge(updates: Partial<SimulationEdgeState>) {
    currentSimulationState = {
      ...currentSimulationState,
      edge: { ...currentSimulationState.edge, ...updates },
      activePresetId: null,
    };
    evaluateAndUpdate();
  },

  updateCloud(updates: Partial<SimulationCloudState>) {
    currentSimulationState = {
      ...currentSimulationState,
      cloud: { ...currentSimulationState.cloud, ...updates },
      activePresetId: null,
    };
    evaluateAndUpdate();
  },

  applyPreset(presetId: string) {
    const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    currentSimulationState = {
      ...currentSimulationState,
      task: { ...DEFAULT_SIMULATION_TASK, ...preset.state.task },
      device: { ...DEFAULT_SIMULATION_DEVICE, ...preset.state.device },
      edge: { ...DEFAULT_SIMULATION_EDGE, ...preset.state.edge },
      cloud: { ...DEFAULT_SIMULATION_CLOUD, ...preset.state.cloud },
      activePresetId: preset.id,
    };
    evaluateAndUpdate();
  },

  reset() {
    currentSimulationState = {
      task: { ...DEFAULT_SIMULATION_TASK },
      device: { ...DEFAULT_SIMULATION_DEVICE },
      edge: { ...DEFAULT_SIMULATION_EDGE },
      cloud: { ...DEFAULT_SIMULATION_CLOUD },
      isSimulated: true,
      activePresetId: "balanced",
      lastEvaluatedAt: Date.now(),
    };
    evaluateAndUpdate();
  },

  runSimulation() {
    evaluateAndUpdate();
  },
};

// React Hook for ergonomic consumption in functional components
export function useSimulationState() {
  const state = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getState,
    simulationStore.getState
  );

  const decision = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getDecision,
    simulationStore.getDecision
  );

  const updateTask = useCallback((u: Partial<SimulationTaskState>) => simulationStore.updateTask(u), []);
  const updateDevice = useCallback((u: Partial<SimulationDeviceState>) => simulationStore.updateDevice(u), []);
  const updateEdge = useCallback((u: Partial<SimulationEdgeState>) => simulationStore.updateEdge(u), []);
  const updateCloud = useCallback((u: Partial<SimulationCloudState>) => simulationStore.updateCloud(u), []);
  const applyPreset = useCallback((id: string) => simulationStore.applyPreset(id), []);
  const reset = useCallback(() => simulationStore.reset(), []);
  const runSimulation = useCallback(() => simulationStore.runSimulation(), []);

  return {
    state,
    decision,
    updateTask,
    updateDevice,
    updateEdge,
    updateCloud,
    applyPreset,
    reset,
    runSimulation,
  };
}
