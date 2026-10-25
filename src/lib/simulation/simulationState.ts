// Phase 11 & Phase 13: Dynamic Offloading Simulation - Reactive State Store
// Manages simulated parameters, triggers deterministic evaluation, and orchestrates FastAPI backend integration
// Phase 13B: Real Automatic Task Offloading with image upload, DQN destination selection, and CV inference

"use client";

import { useSyncExternalStore, useCallback, useEffect } from "react";
import {
  SimulationState,
  SimulationTaskState,
  SimulationDeviceState,
  SimulationEdgeState,
  SimulationCloudState,
  DecisionResult,
  ExecutionTarget,
  ExperimentConditions,
  WorkloadLevel,
  NetworkConditionLevel,
  WorkloadInputType,
  UploadedFileItem,
  VideoMetadata,
  WorkloadTaskPayload,
} from "./simulationTypes";
import {
  DEFAULT_SIMULATION_TASK,
  DEFAULT_SIMULATION_DEVICE,
  DEFAULT_SIMULATION_EDGE,
  DEFAULT_SIMULATION_CLOUD,
  SCENARIO_PRESETS,
} from "./simulationPresets";
import { evaluateOffloadingDecision } from "@/lib/offloading/decisionEngine";
import { MAX_BATCH_TOTAL_MB, MAX_IMAGE_MB, MAX_VIDEO_MB, MAX_VIDEO_SECONDS, fileMb } from "./workloadLimits";
import {
  submitSimulationToBackend,
  executeTaskOffloading,
  fetchLocalTelemetry,
  fetchNodeTelemetry,
  isNodeLive,
  LocalTelemetryResponse,
  NodeTelemetryResponse,
  SimulationExecutionResult,
} from "@/services/apiClient";

export type SimulationApiStatus = "idle" | "running" | "success" | "error";

export type TaskExecutionStage =
  | "idle"
  | "created"         // TASK CREATED
  | "optimizing"      // DQN DECIDING
  | "offloading"      // OFFLOADING TO [TIER]
  | "executing"       // [TIER] EXECUTING
  | "ready"           // RESULT RETURNED
  | "error";

export interface UploadedImageInfo {
  file: File;
  previewUrl: string;
  name: string;
  sizeBytes: number;
}

export const DEFAULT_EXPERIMENT_CONDITIONS: ExperimentConditions = {
  edgeCongestion: "LOW",
  cloudLoad: "LOW",
  networkCondition: "GOOD",
};

let currentExperimentConditions: ExperimentConditions = { ...DEFAULT_EXPERIMENT_CONDITIONS };
let currentRealLocalTelemetry: LocalTelemetryResponse | null = null;
// Live edge/cloud nodes measured by the backend (null until the first answer or when it is offline).
let currentNodeTelemetry: NodeTelemetryResponse | null = null;
// Why the last upload was refused (too large, too many photos, video too long), shown in the upload panel.
let currentUploadError: string | null = null;
let liveTiers = { edge: false, cloud: false };
let currentTelemetryLoading: boolean = false;
let hasAttemptedTelemetryFetch: boolean = false;
let telemetryPollers = 0;
let telemetryPollTimer: ReturnType<typeof setInterval> | null = null;

export interface SystemLogEvent {
  id: string;
  timestamp: number;
  type: "INFO" | "WARNING" | "ERROR" | "EXECUTION";
  message: string;
  source: string;
  details?: unknown;
}

let sessionLogs: SystemLogEvent[] = [];
let executionHistory: SimulationExecutionResult[] = [];

export function addSessionLog(type: SystemLogEvent["type"], message: string, source: string, details?: unknown) {
  sessionLogs = [{
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    type, message, source, details
  }, ...sessionLogs].slice(0, 200);
}

// Maps presets to experiment conditions for bi-directional synchronization
const PRESET_CONDITION_MAP: Record<string, ExperimentConditions> = {
  balanced: { edgeCongestion: "LOW", cloudLoad: "LOW", networkCondition: "GOOD" },
  edge_congested: { edgeCongestion: "HIGH", cloudLoad: "LOW", networkCondition: "GOOD" },
  low_bandwidth: { edgeCongestion: "LOW", cloudLoad: "MEDIUM", networkCondition: "POOR" },
  cloud_heavy: { edgeCongestion: "HIGH", cloudLoad: "LOW", networkCondition: "GOOD" },
};

// Singleton In-Memory Simulation State Container
let currentSimulationState: SimulationState = {
  task: { ...DEFAULT_SIMULATION_TASK },
  device: { ...DEFAULT_SIMULATION_DEVICE },
  edge: { ...DEFAULT_SIMULATION_EDGE },
  cloud: { ...DEFAULT_SIMULATION_CLOUD },
  isSimulated: true,
  activePresetId: "balanced",
  experimentConditions: { ...DEFAULT_EXPERIMENT_CONDITIONS },
  lastEvaluatedAt: Date.now(),
};

/**
 * Computes deterministic simulated environment state from experiment conditions.
 * The local device always comes from real host telemetry (see realDeviceState).
 */
/**
 * Local device state from this machine's real telemetry. A machine without a battery counts as 100%
 * and the base latency is the backend's fixed dispatch overhead. Before the first reading arrives the
 * current (placeholder) device is kept; the UI marks it as not live.
 */
function realDeviceState(): SimulationDeviceState {
  const t = currentRealLocalTelemetry;
  if (!t?.cpu_is_real) return currentSimulationState.device;
  return {
    ...currentSimulationState.device,
    cpuAvailablePct: t.cpu_available,
    memoryAvailablePct: t.memory_available,
    batteryPct: t.battery_pct ?? 100,
    latencyMs: t.base_latency_ms,
  };
}

function applyConditionsToEnvironment(cond: ExperimentConditions) {
  // 2. Edge (Simulated Fog Environment)
  let edgeCpu = 22;
  let edgeQueue = 1;
  let edgeLat = 10.0;
  let edgeBw = 28.0;

  if (cond.edgeCongestion === "LOW") {
    edgeCpu = 22;
    edgeQueue = 1;
    edgeLat = 10.0;
    edgeBw = 28.0;
  } else if (cond.edgeCongestion === "MEDIUM") {
    edgeCpu = 58;
    edgeQueue = 6;
    edgeLat = 20.0;
    edgeBw = 16.0;
  } else {
    // HIGH
    edgeCpu = 92;
    edgeQueue = 18;
    edgeLat = 45.0;
    edgeBw = 4.5;
  }

  // 3. Cloud (Simulated Datacenter Environment)
  let cloudCpu = 25;
  let cloudQueue = 2;
  let cloudLat = 45.0;
  let cloudBw = 60.0;

  if (cond.cloudLoad === "LOW") {
    cloudCpu = 25;
    cloudQueue = 2;
    cloudLat = 45.0;
    cloudBw = 60.0;
  } else if (cond.cloudLoad === "MEDIUM") {
    cloudCpu = 62;
    cloudQueue = 9;
    cloudLat = 75.0;
    cloudBw = 35.0;
  } else {
    // HIGH
    cloudCpu = 94;
    cloudQueue = 24;
    cloudLat = 125.0;
    cloudBw = 14.0;
  }

  // 4. Network Condition modifier
  if (cond.networkCondition === "LIMITED") {
    edgeLat = Math.round((edgeLat + 10.0) * 10) / 10;
    cloudLat = Math.round((cloudLat + 35.0) * 10) / 10;
    edgeBw = Math.max(1, Math.round(edgeBw * 0.7 * 10) / 10);
    cloudBw = Math.max(2, Math.round(cloudBw * 0.7 * 10) / 10);
  } else if (cond.networkCondition === "POOR") {
    edgeLat = Math.round((edgeLat + 25.0) * 10) / 10;
    cloudLat = Math.round((cloudLat + 110.0) * 10) / 10;
    edgeBw = Math.max(0.5, Math.round(edgeBw * 0.3 * 10) / 10);
    cloudBw = Math.max(1, Math.round(cloudBw * 0.3 * 10) / 10);
  }

  currentSimulationState = {
    ...currentSimulationState,
    experimentConditions: { ...cond },
    device: realDeviceState(),
    edge: {
      ...currentSimulationState.edge,
      cpuLoadPct: edgeCpu,
      queueLength: edgeQueue,
      latencyMs: edgeLat,
      bandwidthGbps: edgeBw,
    },
    cloud: {
      ...currentSimulationState.cloud,
      cpuLoadPct: cloudCpu,
      queueLength: cloudQueue,
      latencyMs: cloudLat,
      bandwidthGbps: cloudBw,
    },
    lastEvaluatedAt: Date.now(),
  };
}

// Start from the selected conditions so the cards, latency panel and DQN inputs match the buttons
// (the raw DEFAULT_SIMULATION_* values are landing-page demo numbers, not any condition).
applyConditionsToEnvironment(currentExperimentConditions);

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

// Phase 13B Automatic CV Task Offloading State
let currentUploadedImage: UploadedImageInfo | null = null;
let currentExecutionStage: TaskExecutionStage = "idle";
let currentStageLabel: string = "";
let currentExecutionDetails: SimulationExecutionResult | null = null;
let currentExecutionError: string | null = null;

// Phase 13B Multi-Image & Video Workload Input State
let currentWorkloadType: WorkloadInputType = "IMAGE";
let currentBatchImages: UploadedFileItem[] = [];
let currentUploadedVideo: UploadedFileItem | null = null;
let currentVideoMetadata: VideoMetadata | null = null;

function computeWorkloadPayload(): WorkloadTaskPayload {
  if (currentWorkloadType === "IMAGE") {
    const files: UploadedFileItem[] = currentUploadedImage
      ? [
          {
            id: "img_single",
            file: currentUploadedImage.file,
            name: currentUploadedImage.name,
            sizeBytes: currentUploadedImage.sizeBytes,
            sizeMb: Math.round((currentUploadedImage.sizeBytes / (1024 * 1024)) * 100) / 100,
            previewUrl: currentUploadedImage.previewUrl,
          },
        ]
      : [];
    return {
      type: "IMAGE",
      files,
      totalSizeMb: files.length > 0 ? files[0].sizeMb : currentSimulationState.task.taskSizeMb,
      imageCount: files.length,
    };
  } else if (currentWorkloadType === "IMAGE_BATCH") {
    const totalBytes = currentBatchImages.reduce((sum, f) => sum + f.sizeBytes, 0);
    const totalSizeMb = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
    return {
      type: "IMAGE_BATCH",
      files: currentBatchImages,
      totalSizeMb,
      imageCount: currentBatchImages.length,
    };
  } else {
    const files = currentUploadedVideo ? [currentUploadedVideo] : [];
    const totalSizeMb = currentUploadedVideo ? currentUploadedVideo.sizeMb : currentSimulationState.task.taskSizeMb;
    return {
      type: "VIDEO",
      files,
      totalSizeMb,
      videoMetadata: currentVideoMetadata ?? undefined,
    };
  }
}

// Cached, referentially stable snapshot for useSyncExternalStore (client and server)
let currentWorkloadPayload: WorkloadTaskPayload = computeWorkloadPayload();

function syncTaskWithWorkload() {
  currentWorkloadPayload = computeWorkloadPayload();
  const payload = currentWorkloadPayload;
  if (currentWorkloadType === "IMAGE") {
    if (currentUploadedImage) {
      const sizeMb = Math.max(0.1, Math.round((currentUploadedImage.sizeBytes / (1024 * 1024)) * 100) / 100);
      currentSimulationState = {
        ...currentSimulationState,
        task: {
          ...currentSimulationState.task,
          name: "OBJECT_DETECTION",
          taskSizeMb: sizeMb,
          cpuDemandPct: Math.min(95, Math.max(35, Math.round(45 + sizeMb * 12))),
          memoryDemandPct: Math.min(90, Math.max(30, Math.round(40 + sizeMb * 10))),
          workloadType: "IMAGE",
          workloadPayload: payload,
        },
      };
    } else {
      currentSimulationState = {
        ...currentSimulationState,
        task: {
          ...currentSimulationState.task,
          name: "OBJECT_DETECTION",
          workloadType: "IMAGE",
          workloadPayload: payload,
        },
      };
    }
  } else if (currentWorkloadType === "IMAGE_BATCH") {
    const count = currentBatchImages.length;
    const totalMb = payload.totalSizeMb;
    currentSimulationState = {
      ...currentSimulationState,
      task: {
        ...currentSimulationState.task,
        id: count > 0 ? `TASK_BATCH_${Math.floor(Math.random() * 900 + 100)}` : currentSimulationState.task.id,
        name: count > 0 ? `IMAGE_BATCH (${count} IMAGES)` : "IMAGE_BATCH",
        taskSizeMb: count > 0 ? Math.max(0.1, totalMb) : 18.4,
        cpuDemandPct: count > 0 ? Math.min(95, Math.max(35, Math.round(40 + Math.min(count, 10) * 3 + totalMb * 1.5))) : currentSimulationState.task.cpuDemandPct,
        memoryDemandPct: count > 0 ? Math.min(95, Math.max(30, Math.round(35 + Math.min(count, 10) * 3 + totalMb * 1.2))) : currentSimulationState.task.memoryDemandPct,
        workloadType: "IMAGE_BATCH",
        workloadPayload: payload,
      },
    };
  } else if (currentWorkloadType === "VIDEO") {
    if (currentUploadedVideo) {
      const sizeMb = currentUploadedVideo.sizeMb;
      const dur = currentVideoMetadata?.durationSeconds ?? 0;
      currentSimulationState = {
        ...currentSimulationState,
        task: {
          ...currentSimulationState.task,
          id: `TASK_VIDEO_${Math.floor(Math.random() * 900 + 100)}`,
          name: "VIDEO_WORKLOAD",
          taskSizeMb: Math.max(0.1, sizeMb),
          cpuDemandPct: Math.min(95, Math.max(45, Math.round(50 + Math.min(25, dur * 0.5) + sizeMb * 0.4))),
          memoryDemandPct: Math.min(90, Math.max(35, Math.round(45 + sizeMb * 0.4))),
          workloadType: "VIDEO",
          workloadPayload: payload,
        },
      };
    } else {
      currentSimulationState = {
        ...currentSimulationState,
        task: {
          ...currentSimulationState.task,
          name: "VIDEO_WORKLOAD",
          workloadType: "VIDEO",
          workloadPayload: payload,
        },
      };
    }
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * A live edge/cloud node replaces that tier's what-if values with its real load, queue, latency
 * and bandwidth. When a node stops being live, the selected conditions are applied again.
 */
function applyLiveNodes() {
  const edge = isNodeLive(currentNodeTelemetry?.edge) ? currentNodeTelemetry!.edge : null;
  const cloud = isNodeLive(currentNodeTelemetry?.cloud) ? currentNodeTelemetry!.cloud : null;
  if ((liveTiers.edge && !edge) || (liveTiers.cloud && !cloud)) {
    applyConditionsToEnvironment(currentExperimentConditions);
  }
  liveTiers = { edge: Boolean(edge), cloud: Boolean(cloud) };
  const live = <T extends SimulationState["edge"] | SimulationState["cloud"]>(tier: T, node: NonNullable<typeof edge>): T => ({
    ...tier,
    cpuLoadPct: Math.round(node.cpu_load ?? 0),
    queueLength: node.task_queue ?? 0,
    latencyMs: Math.round(node.network_latency_ms! * 10) / 10,
    bandwidthGbps: Math.round(node.bandwidth_gbps! * 1000) / 1000,
    memoryAvailablePct: node.memory_used != null ? Math.round(100 - node.memory_used) : tier.memoryAvailablePct,
  });
  if (edge || cloud) {
    currentSimulationState = {
      ...currentSimulationState,
      edge: edge ? live(currentSimulationState.edge, edge) : currentSimulationState.edge,
      cloud: cloud ? live(currentSimulationState.cloud, cloud) : currentSimulationState.cloud,
    };
  }
}

function evaluateAndUpdate() {
  applyLiveNodes();
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

  getUploadedImage(): UploadedImageInfo | null {
    return currentUploadedImage;
  },

  getWorkloadType(): WorkloadInputType {
    return currentWorkloadType;
  },

  getBatchImages(): UploadedFileItem[] {
    return currentBatchImages;
  },

  getUploadedVideo(): UploadedFileItem | null {
    return currentUploadedVideo;
  },

  getVideoMetadata(): VideoMetadata | null {
    return currentVideoMetadata;
  },

  getWorkloadPayload(): WorkloadTaskPayload {
    return currentWorkloadPayload;
  },

  getExecutionStage(): TaskExecutionStage {
    return currentExecutionStage;
  },

  getStageLabel(): string {
    return currentStageLabel;
  },

  getExecutionDetails(): SimulationExecutionResult | null {
    return currentExecutionDetails;
  },

  getExecutionError(): string | null {
    return currentExecutionError;
  },

  getExperimentConditions(): ExperimentConditions {
    return currentExperimentConditions;
  },

  getRealLocalTelemetry(): LocalTelemetryResponse | null {
    return currentRealLocalTelemetry;
  },

  getTelemetryLoading(): boolean {
    return currentTelemetryLoading;
  },

  getNodeTelemetry(): NodeTelemetryResponse | null {
    return currentNodeTelemetry;
  },

  getUploadError(): string | null {
    return currentUploadError;
  },

  getSessionLogs(): SystemLogEvent[] {
    return sessionLogs;
  },

  getExecutionHistory(): SimulationExecutionResult[] {
    return executionHistory;
  },

  setExperimentCondition(key: keyof ExperimentConditions, val: WorkloadLevel | NetworkConditionLevel) {
    currentExperimentConditions = {
      ...currentExperimentConditions,
      [key]: val,
    } as ExperimentConditions;

    // Check if matches an existing preset
    const matchingPreset = Object.entries(PRESET_CONDITION_MAP).find(
      ([, conditions]) =>
        conditions.edgeCongestion === currentExperimentConditions.edgeCongestion &&
        conditions.cloudLoad === currentExperimentConditions.cloudLoad &&
        conditions.networkCondition === currentExperimentConditions.networkCondition
    );

    currentSimulationState = {
      ...currentSimulationState,
      activePresetId: matchingPreset ? matchingPreset[0] : null,
    };

    applyConditionsToEnvironment(currentExperimentConditions);
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  /**
   * Keep local telemetry fresh while a consumer is mounted (shared across callers): fetches now,
   * then every `intervalMs`. Returns the stop function for a useEffect cleanup.
   */
  startTelemetryPolling(intervalMs = 5000): () => void {
    telemetryPollers += 1;
    if (telemetryPollers === 1) {
      simulationStore.fetchRealTelemetry();
      telemetryPollTimer = setInterval(() => simulationStore.fetchRealTelemetry(), intervalMs);
    }
    return () => {
      telemetryPollers -= 1;
      if (telemetryPollers === 0 && telemetryPollTimer !== null) {
        clearInterval(telemetryPollTimer);
        telemetryPollTimer = null;
      }
    };
  },

  async fetchRealTelemetry() {
    if (currentTelemetryLoading) return;
    currentTelemetryLoading = true;
    hasAttemptedTelemetryFetch = true;
    notify();

    const [local, nodes] = await Promise.allSettled([fetchLocalTelemetry(), fetchNodeTelemetry()]);
    // A failed reading means the previous one is no longer live; drop it so the UI shows offline.
    currentNodeTelemetry = nodes.status === "fulfilled" ? nodes.value : null;
    if (local.status === "fulfilled") {
      currentRealLocalTelemetry = local.value;
      currentSimulationState = { ...currentSimulationState, device: realDeviceState() };
    } else {
      console.warn("Could not fetch real local host telemetry:", local.reason);
      currentRealLocalTelemetry = null;
    }
    try {
      evaluateAndUpdate();
    } finally {
      currentTelemetryLoading = false;
      notify();
    }
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

    const matchedCond = PRESET_CONDITION_MAP[presetId] || {
      edgeCongestion: "LOW",
      cloudLoad: "LOW",
      networkCondition: "GOOD",
    };
    currentExperimentConditions = { ...matchedCond };

    currentSimulationState = {
      ...currentSimulationState,
      task: { ...DEFAULT_SIMULATION_TASK, ...preset.state.task },
      device: realDeviceState(),
      edge: { ...DEFAULT_SIMULATION_EDGE, ...preset.state.edge },
      cloud: { ...DEFAULT_SIMULATION_CLOUD, ...preset.state.cloud },
      experimentConditions: { ...currentExperimentConditions },
      activePresetId: preset.id,
    };
    syncTaskWithWorkload();
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  setWorkloadType(type: WorkloadInputType) {
    currentWorkloadType = type;
    currentUploadError = null;
    syncTaskWithWorkload();
    if (type !== "IMAGE") {
      currentExecutionStage = "idle";
      currentStageLabel = "READY FOR WORKLOAD EXECUTION";
      currentExecutionDetails = null;
      currentExecutionError = null;
    } else {
      if (currentUploadedImage) {
        currentExecutionStage = "created";
        currentStageLabel = "TASK CREATED";
      } else {
        currentExecutionStage = "idle";
        currentStageLabel = "";
      }
    }
    evaluateAndUpdate();
  },

  setUploadedImage(file: File) {
    if (fileMb(file) > MAX_IMAGE_MB) {
      currentUploadError = `${file.name} is ${fileMb(file).toFixed(1)} MB; a photo can be up to ${MAX_IMAGE_MB} MB.`;
      notify();
      return;
    }
    currentUploadError = null;
    if (currentUploadedImage?.previewUrl) {
      URL.revokeObjectURL(currentUploadedImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    currentUploadedImage = {
      file,
      previewUrl,
      name: file.name,
      sizeBytes: file.size,
    };
    currentWorkloadType = "IMAGE";

    syncTaskWithWorkload();

    currentExecutionStage = "created";
    currentStageLabel = "TASK CREATED";
    currentExecutionDetails = null;
    currentExecutionError = null;
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  clearUploadedImage() {
    if (currentUploadedImage?.previewUrl) {
      URL.revokeObjectURL(currentUploadedImage.previewUrl);
    }
    currentUploadedImage = null;
    syncTaskWithWorkload();
    currentExecutionStage = "idle";
    currentStageLabel = "";
    currentExecutionDetails = null;
    currentExecutionError = null;
    evaluateAndUpdate();
  },

  addBatchImages(files: FileList | File[]) {
    const problems: string[] = [];
    const small = Array.from(files).filter((file) => {
      if (fileMb(file) <= MAX_IMAGE_MB) return true;
      problems.push(`${file.name} is over ${MAX_IMAGE_MB} MB`);
      return false;
    });
    // Any number of photos, up to MAX_BATCH_TOTAL_MB in total.
    let totalMb = currentBatchImages.reduce((sum, img) => sum + img.sizeBytes / (1024 * 1024), 0);
    const fileList: File[] = [];
    let skipped = 0;
    for (const file of small) {
      if (totalMb + fileMb(file) > MAX_BATCH_TOTAL_MB) {
        skipped += 1;
        continue;
      }
      totalMb += fileMb(file);
      fileList.push(file);
    }
    if (skipped) {
      problems.push(`a batch can be up to ${MAX_BATCH_TOTAL_MB} MB in total, so ${skipped} photo(s) were not added`);
    }
    currentUploadError = problems.length ? `Not added: ${problems.join("; ")}.` : null;
    if (fileList.length === 0) {
      notify();
      return;
    }
    const newItems: UploadedFileItem[] = fileList.map((file) => {
      const previewUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : undefined;
      const sizeMb = Math.round((file.size / (1024 * 1024)) * 100) / 100;
      return {
        id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        sizeBytes: file.size,
        sizeMb,
        previewUrl,
      };
    });

    currentBatchImages = [...currentBatchImages, ...newItems];
    currentWorkloadType = "IMAGE_BATCH";
    syncTaskWithWorkload();

    currentExecutionStage = "created";
    currentStageLabel = "TASK CREATED";
    currentExecutionDetails = null;
    currentExecutionError = null;
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  removeBatchImage(id: string) {
    const item = currentBatchImages.find((img) => img.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    currentBatchImages = currentBatchImages.filter((img) => img.id !== id);
    syncTaskWithWorkload();

    if (currentBatchImages.length === 0) {
      currentExecutionStage = "idle";
      currentStageLabel = "";
    }
    evaluateAndUpdate();
  },

  clearBatchImages() {
    currentBatchImages.forEach((img) => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });
    currentBatchImages = [];
    syncTaskWithWorkload();

    currentExecutionStage = "idle";
    currentStageLabel = "";
    currentExecutionDetails = null;
    currentExecutionError = null;
    evaluateAndUpdate();
  },

  setUploadedVideo(file: File) {
    if (fileMb(file) > MAX_VIDEO_MB) {
      currentUploadError = `${file.name} is ${fileMb(file).toFixed(1)} MB; a video can be up to ${MAX_VIDEO_MB} MB.`;
      notify();
      return;
    }
    currentUploadError = null;
    if (currentUploadedVideo?.previewUrl) {
      URL.revokeObjectURL(currentUploadedVideo.previewUrl);
    }

    const previewUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : "";
    const sizeMb = Math.max(0.1, Math.round((file.size / (1024 * 1024)) * 100) / 100);

    currentUploadedVideo = {
      id: `video_${Date.now()}`,
      file,
      name: file.name,
      sizeBytes: file.size,
      sizeMb,
      previewUrl,
    };
    currentVideoMetadata = null;
    currentWorkloadType = "VIDEO";

    // Extract HTML5 video duration and dimensions
    if (typeof window !== "undefined" && previewUrl) {
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.src = previewUrl;
      videoEl.onloadedmetadata = () => {
        // The user may have picked another video (or cleared it) while this one was loading.
        if (currentUploadedVideo?.file !== file) return;
        const durationSeconds = Math.round(videoEl.duration * 10) / 10;
        // Longer videos are too heavy for laptops and free CPU servers: refuse them before upload.
        if (durationSeconds > MAX_VIDEO_SECONDS + 0.1) {
          simulationStore.clearUploadedVideo();
          currentUploadError = `${file.name} is ${durationSeconds} s long; videos can be up to ${MAX_VIDEO_SECONDS} s.`;
          notify();
          return;
        }
        const width = videoEl.videoWidth;
        const height = videoEl.videoHeight;
        currentVideoMetadata = {
          durationSeconds: isNaN(durationSeconds) ? undefined : durationSeconds,
          width: width || undefined,
          height: height || undefined,
          resolution: width && height ? `${width}×${height}` : undefined,
        };
        syncTaskWithWorkload();
        notify();
      };
    }

    syncTaskWithWorkload();

    currentExecutionStage = "created";
    currentStageLabel = "TASK CREATED";
    currentExecutionDetails = null;
    currentExecutionError = null;
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  clearUploadedVideo() {
    if (currentUploadedVideo?.previewUrl) {
      URL.revokeObjectURL(currentUploadedVideo.previewUrl);
    }
    currentUploadedVideo = null;
    currentVideoMetadata = null;
    syncTaskWithWorkload();

    currentExecutionStage = "idle";
    currentStageLabel = "";
    currentExecutionDetails = null;
    currentExecutionError = null;
    evaluateAndUpdate();
  },

  /**
   * Complete end-to-end automatic task offloading execution:
   * 1. TASK CREATED (image selected)
   * 2. DQN OPTIMIZING (submits to FastAPI backend)
   * 3. OFFLOADING TO [LOCAL / EDGE / CLOUD] (animates 3D packet toward selected destination)
   * 4. EXECUTING (real PyTorch object detection in selected tier)
   * 5. RESULT READY (renders detections, bounding boxes, and empirical metrics)
   */
  async executeUploadedTask(imageFile?: File): Promise<SimulationExecutionResult | null> {
    // One task at a time: a second click while the first is running would upload everything again.
    if (currentApiStatus === "running") return null;
    let targetFiles: File[] = [];
    let effectiveWorkloadType: "IMAGE" | "IMAGE_BATCH" | "VIDEO" = currentWorkloadType;

    if (imageFile) {
      if (!currentUploadedImage || currentUploadedImage.file !== imageFile) {
        simulationStore.setUploadedImage(imageFile);
      }
      targetFiles = [imageFile];
      effectiveWorkloadType = "IMAGE";
    } else if (currentWorkloadType === "IMAGE") {
      if (!currentUploadedImage?.file) {
        return null;
      }
      targetFiles = [currentUploadedImage.file];
    } else if (currentWorkloadType === "IMAGE_BATCH") {
      if (currentBatchImages.length === 0) {
        return null;
      }
      targetFiles = currentBatchImages.map((b) => b.file);
      effectiveWorkloadType = "IMAGE_BATCH";
    } else if (currentWorkloadType === "VIDEO") {
      if (!currentUploadedVideo?.file) {
        return null;
      }
      targetFiles = [currentUploadedVideo.file];
      effectiveWorkloadType = "VIDEO";
    }

    if (targetFiles.length === 0) {
      return null;
    }

    currentExecutionStage = "optimizing";
    currentStageLabel = "DQN DECIDING";
    currentExecutionError = null;
    currentApiStatus = "running";
    notify();

    try {
      // STEP C: Call backend execution endpoint with multi-workload offloading
      const result = await executeTaskOffloading({
        files: targetFiles,
        workloadType: effectiveWorkloadType,
        state: currentSimulationState,
      });

      const targetTier = result.decision.toLowerCase() as ExecutionTarget;

      // STEP D: Update DQN decision to trigger 3D task packet animation
      currentExecutionStage = "offloading";
      currentStageLabel = `OFFLOADING TO ${result.decision.toUpperCase()}`;

      currentDecisionResult = {
        taskId: result.task_id,
        timestamp: Date.now(),
        selectedTarget: targetTier,
        selectedCandidate: result.candidateScores
          ? result.candidateScores[targetTier]
          : {
              target: targetTier,
              displayName: result.decision,
              score: result.cost,
              breakdown: {
                computeCost: result.cost,
                networkCost: result.latency_ms * 0.1,
                queueCost: 0,
                resourcePressure: 0,
                deadlineRisk: result.deadline_penalty,
                totalCost: result.cost,
              },
              estimatedLatencyMs: result.latency_ms,
              feasible: result.feasible,
            },
        candidateScores: result.candidateScores || currentDecisionResult.candidateScores,
        reason:
          result.reason ||
          `DQN policy selected ${result.decision} with ${(result.confidence * 100).toFixed(1)}% confidence.`,
        summary: result.summary || `${result.decision} selected via trained DQN Policy.`,
        isSimulated: true,
        method: "dqn",
        confidence: result.confidence,
        qValues: result.q_values,
      };
      currentDecisionSource = "backend";
      currentApiStatus = "success";
      notify();

      // Brief delay so user sees task packet physically routing in 3D
      await new Promise((resolve) => setTimeout(resolve, 800));

      // STEP E & F: Show execution stage
      currentExecutionStage = "executing";
      if (result.decision === "EDGE") {
        currentStageLabel = "EDGE EXECUTING";
      } else if (result.decision === "CLOUD") {
        currentStageLabel = "CLOUD EXECUTING";
      } else {
        currentStageLabel = "LOCAL EXECUTING";
      }
      notify();

      // Stage holds while remote execution returns
      await new Promise((resolve) => setTimeout(resolve, 600));

      // STEP G: Ready stage with real detection results
      currentExecutionDetails = result;
      currentExecutionStage = "ready";
      currentStageLabel = "RESULT RETURNED";
      
      executionHistory = [result, ...executionHistory].slice(0, 50);
      addSessionLog("EXECUTION", `Task ${result.task_id} completed on ${result.decision} in ${result.execution_time_ms}ms`, "DQN_EXECUTOR", {
        ...result,
        // The annotated image is shown in the results panel; a base64 copy here would bloat the log page.
        annotated_image_base64: result.annotated_image_base64 ? "(image omitted)" : undefined,
      });
      
      notify();

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution error";

      currentExecutionStage = "error";
      currentStageLabel = "EXECUTION FAILED";
      currentExecutionError = msg;
      currentApiStatus = "error";
      currentApiError = msg;
      notify();
      return null;
    }
  },

  reset() {
    if (currentUploadedImage?.previewUrl) {
      URL.revokeObjectURL(currentUploadedImage.previewUrl);
    }
    currentUploadedImage = null;

    currentBatchImages.forEach((img) => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });
    currentBatchImages = [];

    if (currentUploadedVideo?.previewUrl) {
      URL.revokeObjectURL(currentUploadedVideo.previewUrl);
    }
    currentUploadedVideo = null;
    currentVideoMetadata = null;
    currentWorkloadType = "IMAGE";

    currentExecutionStage = "idle";
    currentStageLabel = "";
    currentExecutionDetails = null;
    currentExecutionError = null;
    currentExperimentConditions = { ...DEFAULT_EXPERIMENT_CONDITIONS };

    currentSimulationState = {
      task: { ...DEFAULT_SIMULATION_TASK },
      device: { ...DEFAULT_SIMULATION_DEVICE },
      edge: { ...DEFAULT_SIMULATION_EDGE },
      cloud: { ...DEFAULT_SIMULATION_CLOUD },
      isSimulated: true,
      activePresetId: "balanced",
      experimentConditions: { ...DEFAULT_EXPERIMENT_CONDITIONS },
      lastEvaluatedAt: Date.now(),
    };
    // Keep the real local readings (reset only clears the what-if settings).
    currentSimulationState = { ...currentSimulationState, device: realDeviceState() };
    syncTaskWithWorkload();
    applyConditionsToEnvironment(currentExperimentConditions);
    currentApiStatus = "idle";
    currentApiError = null;
    evaluateAndUpdate();
  },

  /**
   * Orchestrates simulation evaluation with the FastAPI backend.
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
      const msg = err instanceof Error ? err.message : "Backend unavailable";
      currentApiStatus = "error";
      currentApiError = msg;
      currentDecisionSource = "client";

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

  const uploadedImage = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getUploadedImage,
    simulationStore.getUploadedImage
  );

  const workloadType = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getWorkloadType,
    simulationStore.getWorkloadType
  );

  const batchImages = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getBatchImages,
    simulationStore.getBatchImages
  );

  const uploadedVideo = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getUploadedVideo,
    simulationStore.getUploadedVideo
  );

  const videoMetadata = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getVideoMetadata,
    simulationStore.getVideoMetadata
  );

  const workloadPayload = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getWorkloadPayload,
    simulationStore.getWorkloadPayload
  );

  const executionStage = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getExecutionStage,
    simulationStore.getExecutionStage
  );

  const stageLabel = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getStageLabel,
    simulationStore.getStageLabel
  );

  const executionDetails = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getExecutionDetails,
    simulationStore.getExecutionDetails
  );

  const executionError = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getExecutionError,
    simulationStore.getExecutionError
  );

  const experimentConditions = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getExperimentConditions,
    simulationStore.getExperimentConditions
  );

  const realLocalTelemetry = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getRealLocalTelemetry,
    simulationStore.getRealLocalTelemetry
  );

  const uploadError = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getUploadError,
    simulationStore.getUploadError
  );

  const nodeTelemetry = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getNodeTelemetry,
    simulationStore.getNodeTelemetry
  );

  const telemetryLoading = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getTelemetryLoading,
    simulationStore.getTelemetryLoading
  );

  const sessionLogs = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getSessionLogs,
    simulationStore.getSessionLogs
  );

  const executionHistory = useSyncExternalStore(
    simulationStore.subscribe,
    simulationStore.getExecutionHistory,
    simulationStore.getExecutionHistory
  );

  useEffect(() => {
    if (!hasAttemptedTelemetryFetch) {
      simulationStore.fetchRealTelemetry();
    }
  }, []);

  const updateTask = useCallback((u: Partial<SimulationTaskState>) => simulationStore.updateTask(u), []);
  const updateEdge = useCallback((u: Partial<SimulationEdgeState>) => simulationStore.updateEdge(u), []);
  const updateCloud = useCallback((u: Partial<SimulationCloudState>) => simulationStore.updateCloud(u), []);
  const applyPreset = useCallback((id: string) => simulationStore.applyPreset(id), []);
  const reset = useCallback(() => simulationStore.reset(), []);
  const runSimulation = useCallback(() => simulationStore.runSimulation(), []);
  const setUploadedImage = useCallback((file: File) => simulationStore.setUploadedImage(file), []);
  const clearUploadedImage = useCallback(() => simulationStore.clearUploadedImage(), []);
  const setWorkloadType = useCallback((type: WorkloadInputType) => simulationStore.setWorkloadType(type), []);
  const addBatchImages = useCallback((files: FileList | File[]) => simulationStore.addBatchImages(files), []);
  const removeBatchImage = useCallback((id: string) => simulationStore.removeBatchImage(id), []);
  const clearBatchImages = useCallback(() => simulationStore.clearBatchImages(), []);
  const setUploadedVideo = useCallback((file: File) => simulationStore.setUploadedVideo(file), []);
  const clearUploadedVideo = useCallback(() => simulationStore.clearUploadedVideo(), []);
  const executeUploadedTask = useCallback((file?: File) => simulationStore.executeUploadedTask(file), []);
  const setExperimentCondition = useCallback(
    (key: keyof ExperimentConditions, val: WorkloadLevel | NetworkConditionLevel) =>
      simulationStore.setExperimentCondition(key, val),
    []
  );
  const fetchRealTelemetry = useCallback(() => simulationStore.fetchRealTelemetry(), []);

  return {
    state,
    decision,
    apiStatus,
    apiError,
    decisionSource,
    uploadedImage,
    workloadType,
    batchImages,
    uploadedVideo,
    videoMetadata,
    workloadPayload,
    executionStage,
    stageLabel,
    executionDetails,
    executionError,
    experimentConditions,
    realLocalTelemetry,
    nodeTelemetry,
    uploadError,
    telemetryLoading,
    sessionLogs,
    executionHistory,
    updateTask,
    updateEdge,
    updateCloud,
    applyPreset,
    reset,
    runSimulation,
    setUploadedImage,
    clearUploadedImage,
    setWorkloadType,
    addBatchImages,
    removeBatchImage,
    clearBatchImages,
    setUploadedVideo,
    clearUploadedVideo,
    executeUploadedTask,
    setExperimentCondition,
    fetchRealTelemetry,
  };
}
