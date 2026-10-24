"use client";

import { useEffect, useSyncExternalStore } from "react";
import { fetchModelStatus } from "@/services/apiClient";

export type BackendStatus =
  | { kind: "checking" }
  | { kind: "online"; modelLoaded: boolean }
  | { kind: "offline" };

// One shared poller for every component that shows backend status, so the header,
// sidebar and pages don't each send their own requests.
const CHECKING: BackendStatus = { kind: "checking" };
let current: BackendStatus = CHECKING;
const listeners = new Set<() => void>();
let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function update(next: BackendStatus) {
  const same =
    next.kind === current.kind &&
    (next.kind !== "online" || (current.kind === "online" && current.modelLoaded === next.modelLoaded));
  if (same) return;
  current = next;
  listeners.forEach((listener) => listener());
}

function check() {
  fetchModelStatus()
    .then((s) => update({ kind: "online", modelLoaded: s.model_loaded }))
    .catch(() => update({ kind: "offline" }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether the backend answers and whether the DQN checkpoint is loaded, re-checked every 5 s. */
export function useBackendStatus(): BackendStatus {
  useEffect(() => {
    users += 1;
    if (users === 1) {
      check();
      timer = setInterval(check, 5000);
    }
    return () => {
      users -= 1;
      if (users === 0 && timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return useSyncExternalStore(subscribe, () => current, () => CHECKING);
}
