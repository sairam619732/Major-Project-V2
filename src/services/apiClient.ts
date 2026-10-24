// Phase 13: Frontend API Client for FastAPI Backend Communication
// Pure TypeScript HTTP service for task offloading simulation and validation

import { SimulationState, DecisionResult, ExecutionTarget, CandidateScore } from "@/lib/simulation/simulationTypes";

export interface BackendSimulationResponse {
  status: string;
  taskId: string;
  timestamp: number;
  selectedTarget: ExecutionTarget;
  selectedCandidate: CandidateScore;
  candidateScores: Record<ExecutionTarget, CandidateScore>;
  reason: string;
  summary: string;
  isSimulated: boolean;
  source: string;
  method?: string;
  confidence?: number;
  q_values?: Record<string, number>;
  is_fallback?: boolean;
}

export interface ObjectDetectionItem {
  label: string;
  confidence: number;
  box_normalized: [number, number, number, number];
  box_pixels?: [number, number, number, number];
}

export interface ImageMetadata {
  width: number;
  height: number;
  size_bytes: number;
  size_mb: number;
  format: string;
  mode: string;
  pixel_count: number;
  estimated_cpu_demand: number;
  estimated_memory_demand: number;
}

export interface BatchItemResult {
  filename: string;
  size_mb: number;
  detection_count: number;
  inference_time_ms: number;
  detections: ObjectDetectionItem[];
}

export interface SimulationExecutionResult {
  task_id: string;
  task_type: string;
  decision: "LOCAL" | "EDGE" | "CLOUD";
  action_index: number;
  confidence: number;
  q_values: Record<string, number>;
  execution_environment: string;
  environment_description: string;
  is_simulated_distributed: boolean;
  detections: ObjectDetectionItem[];
  detection_count: number;
  annotated_image_base64?: string;
  image_metadata: ImageMetadata;
  execution_time_ms: number;
  latency_ms: number;
  energy: number;
  cost: number;
  reward: number;
  deadline_penalty: number;
  feasible: boolean;
  success: boolean;
  model_architecture: string;
  candidateScores?: Record<ExecutionTarget, CandidateScore>;
  reason?: string;
  summary?: string;
  // Phase 14: Real Task Execution & Offloaded Metrics
  execution_worker?: string;
  workload_type?: string;
  input_size_mb?: number;
  processing_time_ms?: number;
  network_transfer_ms?: number;
  processed_count?: number;
  batch_items?: BatchItemResult[];
  status?: string;
  error_message?: string;
}

export interface LocalTelemetryResponse {
  status: string;
  timestamp: number;
  platform: string;
  cpu_count: number;
  cpu_available: number;
  cpu_load: number;
  cpu_is_real: boolean;
  memory_available: number;
  memory_total_gb: number;
  memory_is_real: boolean;
  battery_pct: number | null;
  battery_status: string;
  battery_is_real: boolean;
  base_latency_ms: number;
  base_latency_status: string;
  base_latency_is_real: boolean;
}

export interface BackendHealthResponse {
  status: string;
  service: string;
}

/** Live telemetry of one offloading node (edge PC or cloud server), from the backend's monitor. */
export interface NodeTelemetry {
  tier: "EDGE" | "CLOUD";
  configured: boolean;
  online: boolean;
  url: string | null;
  node_id: string | null;
  platform: string | null;
  cpu_count: number | null;
  cpu_load: number | null;
  memory_used: number | null;
  memory_total_gb: number | null;
  task_queue: number | null;
  model_ready: boolean | null;
  /** Set when the node adds an emulated network delay (all tiers on one machine); null = real network. */
  network_emulation?: { rtt_ms: number; jitter_ms: number; bandwidth_mbps: number | null } | null;
  network_latency_ms: number | null;
  bandwidth_gbps: number | null;
  last_seen: number | null;
  error: string | null;
}

export interface NodeTelemetryResponse {
  edge: NodeTelemetry;
  cloud: NodeTelemetry;
}

/** A node is live once it answers and its latency and bandwidth have been measured. */
export function isNodeLive(node: NodeTelemetry | null | undefined): boolean {
  return Boolean(node?.configured && node.online && node.network_latency_ms != null && node.bandwidth_gbps != null);
}

/** Where a tier's values come from: a live node, a configured node that is not answering, or the what-if settings. */
export function nodeSource(node: NodeTelemetry | null | undefined): "live" | "offline" | "sim" {
  if (isNodeLive(node)) return "live";
  return node?.configured ? "offline" : "sim";
}

/**
 * Where a tier's latency and bandwidth come from. Same as nodeSource, except a live node on an
 * emulated link (single-machine demo) is "emu": measured, but over an emulated network delay.
 */
export function linkSource(node: NodeTelemetry | null | undefined): "live" | "emu" | "offline" | "sim" {
  const source = nodeSource(node);
  return source === "live" && node?.network_emulation ? "emu" : source;
}

/** Fetches the edge/cloud node telemetry measured by the backend. */
export async function fetchNodeTelemetry(timeoutMs = 3000): Promise<NodeTelemetryResponse> {
  const baseUrl = getBackendBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/api/simulation/telemetry/nodes`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new BackendApiError(`Node telemetry request failed with status ${res.status}`, res.status);
    return (await res.json()) as NodeTelemetryResponse;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof BackendApiError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown network error";
    throw new BackendApiError(`Backend unreachable at ${baseUrl}: ${msg}`);
  }
}

export interface ModelStatusResponse {
  status: string;
  model_loaded: boolean;
  model_path: string;
  device: string;
}

export class BackendApiError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "BackendApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Resolves the backend base URL using project environment conventions.
 * Defaults to http://localhost:8000 for local development.
 */
export function getBackendBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, "");
  }
  return "http://localhost:8000";
}

/**
 * Checks backend health probe.
 */
export async function checkBackendHealth(timeoutMs = 3000): Promise<BackendHealthResponse> {
  const baseUrl = getBackendBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new BackendApiError(`Health check failed with status ${res.status}`, res.status);
    }
    return (await res.json()) as BackendHealthResponse;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof BackendApiError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown network error";
    throw new BackendApiError(`Backend unreachable at ${baseUrl}: ${msg}`);
  }
}

/**
 * Submits the current simulation parameters to FastAPI for evaluation.
 * Collects task size, CPU demand, memory demand, deadline, priority,
 * and three-tier telemetry (local device, edge server, cloud cluster).
 */
export async function submitSimulationToBackend(
  state: SimulationState,
  timeoutMs = 5000
): Promise<DecisionResult> {
  const baseUrl = getBackendBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const payload = {
    task: {
      task_id: state.task.id || "TASK_001",
      task_type: state.task.name || "OBJECT_DETECTION",
      data_size_mb: state.task.taskSizeMb,
      cpu_demand_percent: state.task.cpuDemandPct,
      memory_demand_percent: state.task.memoryDemandPct,
      deadline_ms: state.task.deadlineMs,
      priority: state.task.priority,
    },
    local: {
      cpu_available: state.device.cpuAvailablePct,
      memory_available: state.device.memoryAvailablePct,
      battery_level: state.device.batteryPct,
      base_latency: state.device.latencyMs,
    },
    edge: {
      cpu_load: state.edge.cpuLoadPct,
      task_queue: state.edge.queueLength,
      network_latency: state.edge.latencyMs,
      bandwidth: state.edge.bandwidthGbps,
    },
    cloud: {
      cpu_load: state.cloud.cpuLoadPct,
      task_queue: state.cloud.queueLength,
      network_latency: state.cloud.latencyMs,
      bandwidth: state.cloud.bandwidthGbps,
    },
  };

  try {
    const res = await fetch(`${baseUrl}/api/simulation/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorDetails: unknown = null;
      let errorMsg = `Backend simulation failed with status ${res.status}`;
      try {
        errorDetails = await res.json();
        if (typeof errorDetails === "object" && errorDetails !== null && "detail" in errorDetails) {
          const detail = (errorDetails as { detail: unknown }).detail;
          if (Array.isArray(detail)) {
            errorMsg = `Validation error: ${detail.map((d: { msg?: string; loc?: string[] }) => d.msg || "Invalid field").join("; ")}`;
          } else if (typeof detail === "string") {
            errorMsg = detail;
          }
        }
      } catch {
        // Response was not JSON
      }
      throw new BackendApiError(errorMsg, res.status, errorDetails);
    }

    const data = (await res.json()) as BackendSimulationResponse;

    // Convert backend payload into strongly-typed frontend DecisionResult
    return {
      taskId: data.taskId,
      timestamp: data.timestamp ? Math.round(data.timestamp * 1000) : Date.now(),
      selectedTarget: data.selectedTarget,
      selectedCandidate: data.selectedCandidate,
      candidateScores: data.candidateScores,
      reason: data.reason,
      summary: data.summary,
      isSimulated: true,
      method: data.method,
      confidence: data.confidence,
      qValues: data.q_values,
      isFallback: data.is_fallback,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof BackendApiError) {
      throw err;
    }
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    const msg = isAbort
      ? `Backend request timed out after ${timeoutMs}ms`
      : err instanceof Error
      ? err.message
      : "Network connection refused";
    throw new BackendApiError(`FastAPI backend connection error: ${msg}`);
  }
}

/**
 * Submits an uploaded workload task (single image, image batch, or video) for
 * real neural execution and automatic DQN offloading.
 * Automatically extracts features on the backend, selects LOCAL, EDGE, or CLOUD via trained DQN,
 * runs the neural processing in-process on the local host (EDGE/CLOUD costs come from the cost model),
 * and returns real empirical latency, processing times and detections.
 */
export async function executeTaskOffloading(
  fileOrFiles:
    | File
    | Blob
    | (File | Blob)[]
    | {
        files: File | Blob | (File | Blob)[];
        workloadType?: "IMAGE" | "IMAGE_BATCH" | "VIDEO";
        state: SimulationState;
      },
  stateFallback?: SimulationState,
  // Above the backend's 120 s node timeout, so a slow node reports its own error first.
  timeoutMs = 130000
): Promise<SimulationExecutionResult> {
  const baseUrl = getBackendBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let rawFiles: (File | Blob)[] = [];
  let workloadType = "IMAGE";
  let state: SimulationState;

  if (fileOrFiles && typeof fileOrFiles === "object" && "state" in fileOrFiles) {
    state = fileOrFiles.state;
    workloadType = fileOrFiles.workloadType || "IMAGE";
    const f = fileOrFiles.files;
    rawFiles = Array.isArray(f) ? f : [f];
  } else if (Array.isArray(fileOrFiles)) {
    rawFiles = fileOrFiles;
    state = stateFallback!;
    workloadType = "IMAGE_BATCH";
  } else {
    rawFiles = [fileOrFiles as File | Blob];
    state = stateFallback!;
    workloadType = "IMAGE";
  }

  const formData = new FormData();
  for (let i = 0; i < rawFiles.length; i++) {
    const item = rawFiles[i];
    const defaultName = workloadType === "VIDEO" ? "video.mp4" : `task_image_${i + 1}.jpg`;
    const fname = item instanceof File ? item.name : defaultName;
    // Sent once, as "files" (the backend's single "file" field is only a fallback for other callers).
    formData.append("files", item, fname);
  }

  formData.append("workload_type", workloadType);
  formData.append("task_id", state.task.id || "TASK_CV_001");
  formData.append("deadline_ms", state.task.deadlineMs.toString());
  formData.append("priority", state.task.priority.toString());
  // Local device values are read by the backend itself (real telemetry), so they are not sent.
  formData.append("edge_cpu_load", state.edge.cpuLoadPct.toString());
  formData.append("edge_task_queue", state.edge.queueLength.toString());
  formData.append("edge_network_latency", state.edge.latencyMs.toString());
  formData.append("edge_bandwidth", state.edge.bandwidthGbps.toString());
  formData.append("cloud_cpu_load", state.cloud.cpuLoadPct.toString());
  formData.append("cloud_task_queue", state.cloud.queueLength.toString());
  formData.append("cloud_network_latency", state.cloud.latencyMs.toString());
  formData.append("cloud_bandwidth", state.cloud.bandwidthGbps.toString());

  try {
    const res = await fetch(`${baseUrl}/api/simulation/execute`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMsg = `Simulation task execution failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.detail) {
          errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {}
      throw new BackendApiError(errorMsg, res.status);
    }

    const data = (await res.json()) as SimulationExecutionResult;
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof BackendApiError) {
      throw err;
    }
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    const msg = isAbort
      ? `Task execution request timed out after ${timeoutMs}ms`
      : err instanceof Error
      ? err.message
      : "Network connection refused";
    throw new BackendApiError(`FastAPI execution connection error: ${msg}`);
  }
}

/**
 * Fetches whether the backend is up and whether the DQN checkpoint is loaded
 * (if not, the backend answers with its rule-based fallback).
 */
export async function fetchModelStatus(timeoutMs = 3000): Promise<ModelStatusResponse> {
  const baseUrl = getBackendBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/api/optimization/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new BackendApiError(`Model status request failed with status ${res.status}`, res.status);
    }
    return (await res.json()) as ModelStatusResponse;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof BackendApiError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown network error";
    throw new BackendApiError(`Backend unreachable at ${baseUrl}: ${msg}`);
  }
}

/**
 * Fetches real local machine hardware telemetry from the FastAPI backend.
 * Uses psutil to sample actual CPU %, RAM %, and power/battery status.
 */
export async function fetchLocalTelemetry(timeoutMs = 3000): Promise<LocalTelemetryResponse> {
  const baseUrl = getBackendBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/api/simulation/telemetry/local`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new BackendApiError(`Local telemetry request failed with status ${res.status}`, res.status);
    }

    return (await res.json()) as LocalTelemetryResponse;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof BackendApiError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Failed to fetch local telemetry";
    throw new BackendApiError(msg);
  }
}

/**
 * Fetches the Phase 15 empirical benchmark report from the FastAPI backend.
 * If backend is offline, falls back to the exact Phase 15 static benchmark files in public/data.
 * If both are unavailable, throws an error so the UI displays the research unavailable message.
 */
export async function fetchBenchmarkReport(timeoutMs = 4000): Promise<import("@/types/benchmark").BenchmarkReportData> {
  const baseUrl = getBackendBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // 1. Try Live FastAPI Backend
  try {
    const res = await fetch(`${baseUrl}/api/optimization/benchmark-report`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as import("@/types/benchmark").BenchmarkReportData;
      return {
        ...data,
        dataSource: "live_api",
      };
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // 2. Fallback to exact Phase 15 benchmark files
  try {
    const res = await fetch("/data/benchmark_summary.json");
    if (!res.ok) {
      throw new Error(`HTTP status ${res.status}`);
    }
    const data = (await res.json()) as import("@/types/benchmark").BenchmarkReportData;

    try {
      const histRes = await fetch("/data/training_history.json");
      if (histRes.ok) {
        data.training_history = (await histRes.json()) as import("@/types/benchmark").TrainingEpisodeRecord[];
      }
    } catch {
      // Training history non-fatal
    }

    return {
      ...data,
      dataSource: "static_snapshot",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new BackendApiError(`Experimental data unavailable: ${msg}`);
  }
}

