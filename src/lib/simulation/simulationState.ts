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
import {
  submitSimulationToBackend,
  executeTaskOffloading,
  fetchLocalTelemetry,
  LocalTelemetryResponse,
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
  localWorkload: "LOW",
  edgeCongestion: "LOW",
  cloudLoad: "LOW",
  networkCondition: "GOOD",
};

let currentExperimentConditions: ExperimentConditions = { ...DEFAULT_EXPERIMENT_CONDITIONS };
let currentRealLocalTelemetry: LocalTelemetryResponse | null = null;
let currentTelemetryLoading: boolean = false;
let hasAttemptedTelemetryFetch: boolean = false;

export interface SystemLogEvent {
  id: string;
  timestamp: number;
  type: "INFO" | "WARNING" | "ERROR" | "EXECUTION";
  message: string;
  source: string;
  details?: any;
}

let sessionLogs: SystemLogEvent[] = [];
let executionHistory: SimulationExecutionResult[] = [];

export function addSessionLog(type: SystemLogEvent["type"], message: string, source: string, details?: any) {
  sessionLogs = [{
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    type, message, source, details
  }, ...sessionLogs].slice(0, 200);
}

// Maps presets to experiment conditions for bi-directional synchronization
const PRESET_CONDITION_MAP: Record<string, ExperimentConditions> = {
  balanced: { localWorkload: "LOW", edgeCongestion: "LOW", cloudLoad: "LOW", networkCondition: "GOOD" },
  local_constrained: { localWorkload: "HIGH", edgeCongestion: "LOW", cloudLoad: "LOW", networkCondition: "GOOD" },
  edge_congested: { localWorkload: "LOW", edgeCongestion: "HIGH", cloudLoad: "LOW", networkCondition: "GOOD" },
  low_bandwidth: { localWorkload: "LOW", edgeCongestion: "LOW", cloudLoad: "MEDIUM", networkCondition: "POOR" },
  cloud_heavy: { localWorkload: "HIGH", edgeCongestion: "HIGH", cloudLoad: "LOW", networkCondition: "GOOD" },
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
 * Respects real host telemetry for Local Device when available and in LOW workload mode.
 */
function applyConditionsToEnvironment(cond: ExperimentConditions) {
  // 1. Device (Local)
  let devCpu = 85;
  let devMem = 70;
  let devBat = 90;
  let devLat = 1.2;

  if (cond.localWorkload === "LOW") {
    if (currentRealLocalTelemetry?.cpu_is_real) {
      devCpu = currentRealLocalTelemetry.cpu_available;
      devMem = currentRealLocalTelemetry.memory_available;
      devBat = currentRealLocalTelemetry.battery_pct ?? 100;
      devLat = currentRealLocalTelemetry.base_latency_ms;
    } else {
      devCpu = 82;
      devMem = 74;
      devBat = 88;
      devLat = 1.2;
    }
  } else if (cond.localWorkload === "MEDIUM") {
    devCpu = 46;
    devMem = 50;
    devBat = 65;
    devLat = 2.4;
  } else {
    // HIGH
    devCpu = 16;
    devMem = 25;
    devBat = 30;
    devLat = 5.2;
  }

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
    device: {
      ...currentSimulationState.device,
      cpuAvailablePct: devCpu,
      memoryAvailablePct: devMem,
      batteryPct: devBat,
      latencyMs: devLat,
    },
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
        conditions.localWorkload === currentExperimentConditions.localWorkload &&
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

  async fetchRealTelemetry() {
    if (currentTelemetryLoading) return;
    currentTelemetryLoading = true;
    hasAttemptedTelemetryFetch = true;
    notify();

    try {
      const data = await fetchLocalTelemetry();
      currentRealLocalTelemetry = data;
      if (currentExperimentConditions.localWorkload === "LOW") {
        applyConditionsToEnvironment(currentExperimentConditions);
        evaluateAndUpdate();
      }
    } catch (err) {
      console.warn("Could not fetch real local host telemetry:", err);
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

    const matchedCond = PRESET_CONDITION_MAP[presetId] || {
      localWorkload: "LOW",
      edgeCongestion: "LOW",
      cloudLoad: "LOW",
      networkCondition: "GOOD",
    };
    currentExperimentConditions = { ...matchedCond };

    currentSimulationState = {
      ...currentSimulationState,
      task: { ...DEFAULT_SIMULATION_TASK, ...preset.state.task },
      device: { ...DEFAULT_SIMULATION_DEVICE, ...preset.state.device },
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
    const fileList = Array.from(files);
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
        const durationSeconds = Math.round(videoEl.duration * 10) / 10;
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
      addSessionLog("EXECUTION", `Task ${result.task_id} completed on ${result.decision} in ${result.execution_time_ms}ms`, "DQN_EXECUTOR", result);
      
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
  const updateDevice = useCallback((u: Partial<SimulationDeviceState>) => simulationStore.updateDevice(u), []);
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
    telemetryLoading,
    sessionLogs,
    executionHistory,
    updateTask,
    updateDevice,
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
