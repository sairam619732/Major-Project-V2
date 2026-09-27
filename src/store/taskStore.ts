import { OffloadingTask, TaskStatus } from "@/types";

export const initialTask: OffloadingTask = {
  id: "TASK_001",
  name: "OBJECT DETECTION",
  status: "idle",
  dataSize: "24.5 MB",
  compute: "4.8 GFLOPS",
  latency: "12.4 MS",
};

export const taskState = {
  currentTask: { ...initialTask },
};

type TaskListener = (task: OffloadingTask) => void;
const listeners = new Set<TaskListener>();

export function subscribeTask(listener: TaskListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateTaskStatus(status: TaskStatus) {
  if (taskState.currentTask.status !== status) {
    taskState.currentTask.status = status;
    listeners.forEach((listener) => listener(taskState.currentTask));
  }
}
