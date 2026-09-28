// Phase 11 & Phase 13: Dynamic Offloading Simulation - Reactive State Store
// Manages simulated parameters, triggers deterministic evaluation, and orchestrates FastAPI backend integration

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
import { submitSimulationToBackend } from "@/services/apiClient";

export type SimulationApiStatus = "idle" | "running" | "success" | "error";

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

// Compute initial decision via deterministic engine
let currentDecisionResult: DecisionResult = evaluateOffloadingDecision(
  currentSimulationState.task,
  currentSimulationState.device,
  currentSimulationState.edge,
  currentSimulationState.cloud
);

let currentApiStatus: SimulationApiStatus = "idle";
let currentApiError: string | null = null;
let currentDecisionSource: "client" | "backend" = "client";

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
  currentDecisionSource = "client";
  notify();
}

export const simulationStore = {
  getState(): SimulationState {
    return currentSimulationState;
  },

  getDecision(): DecisionResult {
    return currentDecisionResult;
  },

  getApiStatus(): SimulationApiStatus {
    return currentApiStatus;
  },

  getApiError(): string | null {
    return currentApiError;
  },

  getDecisionSource(): "client" | "backend" {
    return currentDecisionSource;
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
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  updateDevice(updates: Partial<SimulationDeviceState>) {
    currentSimulationState = {
      ...currentSimulationState,
      device: { ...currentSimulationState.device, ...updates },
      activePresetId: null,
    };
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  updateEdge(updates: Partial<SimulationEdgeState>) {
    currentSimulationState = {
      ...currentSimulationState,
      edge: { ...currentSimulationState.edge, ...updates },
      activePresetId: null,
    };
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  updateCloud(updates: Partial<SimulationCloudState>) {
    currentSimulationState = {
      ...currentSimulationState,
      cloud: { ...currentSimulationState.cloud, ...updates },
      activePresetId: null,
    };
    currentApiStatus = "idle";
    currentApiError = null;
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
    currentApiStatus = "idle";
    currentApiError = null;
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
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  /**
   * Orchestrates simulation execution with the FastAPI backend.
   * If the backend is running, updates state with live backend decision JSON.
   * If the backend is unreachable or returns an error, safely falls back
   * to deterministic client evaluation without crashing the application.
   */
  async runSimulation(): Promise<DecisionResult> {
    if (currentApiStatus === "running") {
      return currentDecisionResult;
    }

    currentApiStatus = "running";
    currentApiError = null;
    notify();

    try {
      const backendDecision = await submitSimulationToBackend(currentSimulationState);
      currentDecisionResult = backendDecision;
      currentApiStatus = "success";
      currentDecisionSource = "backend";
      currentApiError = null;
      currentSimulationState = {
        ...currentSimulationState,
        lastEvaluatedAt: Date.now(),
      };
      notify();
      return backendDecision;
    } catch (err: unknown) {
      // Graceful offline fallback: Never crash the frontend if backend is offline
      const msg = err instanceof Error ? err.message : "Backend unavailable";
      currentApiStatus = "error";
      currentApiError = msg;
      currentDecisionSource = "client";

      // Compute local evaluation as reliable fallback
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
      return currentDecisionResult;
    }
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

  const apiStatus = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getApiStatus,
    simulationStore.getApiStatus
  );

  const apiError = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getApiError,
    simulationStore.getApiError
  );

  const decisionSource = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getDecisionSource,
    simulationStore.getDecisionSource
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
    apiStatus,
    apiError,
    decisionSource,
    updateTask,
    updateDevice,
    updateEdge,
    updateCloud,
    applyPreset,
    reset,
    runSimulation,
  };
}
