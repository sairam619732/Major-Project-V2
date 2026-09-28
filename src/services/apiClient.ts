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

export interface BackendHealthResponse {
  status: string;
  service: string;
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

