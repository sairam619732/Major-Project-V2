import { SimulationExecutionResult } from "@/services/apiClient";

export interface SystemLogEvent {
  id: string;
  timestamp: number;
  type: "INFO" | "WARNING" | "ERROR" | "EXECUTION" | "DECISION";
  message: string;
  source: string;
  details?: any;
}

class SessionLogger {
  private logs: SystemLogEvent[] = [];
  private history: SimulationExecutionResult[] = [];
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public addLog(type: SystemLogEvent["type"], message: string, source: string, details?: any) {
    this.logs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type,
      message,
      source,
      details,
    });
    if (this.logs.length > 500) this.logs.length = 500;
    this.notify();
  }

  public addExecution(res: SimulationExecutionResult) {
    this.history.unshift(res);
    if (this.history.length > 50) this.history.length = 50;
    this.addLog("EXECUTION", `Task ${res.task_id} completed on ${res.decision} in ${res.execution_time_ms}ms`, "DQN_EXECUTOR", res);
  }

  public getLogs() {
    return this.logs;
  }

  public getHistory() {
    return this.history;
  }
}

export const sessionLogger = new SessionLogger();

// Add some initial startup logs
if (typeof window !== "undefined") {
  sessionLogger.addLog("INFO", "Client application initialized", "System");
  sessionLogger.addLog("INFO", "DQN Offloading Engine Ready", "DQN_AGENT");
}
