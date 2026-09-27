// Phase 0 Root Types
export interface EnvironmentConfig {
  apiUrl: string;
}

// Phase 6 Task State Model
export type TaskStatus =
  | "idle"
  | "generated"
  | "processing"
  | "in_transit"
  | "completed";

export interface OffloadingTask {
  id: string; // e.g. "TASK_001"
  name: string; // e.g. "OBJECT DETECTION"
  status: TaskStatus;
  dataSize: string; // e.g. "24.5 MB"
  compute: string; // e.g. "4.8 GFLOPS"
  latency: string; // e.g. "12.4 MS"
}
