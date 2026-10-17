// Phase 11.3: Transition Coordinator
// Manages smooth cinematic signal transition between main story and /simulation

"use client";

export type TransitionMode = "decision_exit" | "direct_nav";

type TransitionListener = (
  progress: number,
  isTransitioning: boolean,
  mode: TransitionMode
) => void;

let isTransitioning = false;
let transitionProgress = 0; // 0.0 -> 1.0
let transitionMode: TransitionMode = "decision_exit";
// Where the signal leaves from, as a fraction of the viewport (the TASK_001 core on screen).
const origin = { x: 0.5, y: 0.5 };
const listeners = new Set<TransitionListener>();

function notify() {
  listeners.forEach((listener) =>
    listener(transitionProgress, isTransitioning, transitionMode)
  );
}

// Hermite smoothstep helper
function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export const transitionStore = {
  getIsTransitioning(): boolean {
    return isTransitioning;
  },

  getProgress(): number {
    return transitionProgress;
  },

  getMode(): TransitionMode {
    return transitionMode;
  },

  /** Viewport-fraction position the overlay's glow and burst start from. */
  getOrigin(): Readonly<{ x: number; y: number }> {
    return origin;
  },

  /** Kept in sync by the 3D scene so the overlay starts exactly on the task core. */
  setOrigin(x: number, y: number): void {
    origin.x = x;
    origin.y = y;
  },

  subscribe(listener: TransitionListener): () => void {
    listeners.add(listener);
    listener(transitionProgress, isTransitioning, transitionMode);
    return () => listeners.delete(listener);
  },

  triggerTransition(
    onNavigate: () => void,
    durationMs = 2100,
    mode: TransitionMode = "decision_exit"
  ): void {
    if (isTransitioning) return;
    isTransitioning = true;
    transitionProgress = 0;
    transitionMode = mode;
    notify();

    const effectiveDuration = mode === "direct_nav" ? Math.min(durationMs, 1100) : durationMs;
    const startTime = performance.now();
    let hasNavigated = false;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const linearT = Math.min(1.0, elapsed / effectiveDuration);
      transitionProgress = smoothstep(0, 1, linearT);
      notify();

      // Trigger navigation handoff when screen reaches deep black (at ~86% progress)
      if (!hasNavigated && linearT >= 0.86) {
        hasNavigated = true;
        try {
          onNavigate();
        } catch (e) {
          console.error("Navigation error during transition:", e);
        }
      }

      if (linearT < 1.0) {
        requestAnimationFrame(frame);
      } else {
        transitionProgress = 1.0;
        notify();

        if (!hasNavigated) {
          hasNavigated = true;
          onNavigate();
        }

        // Dissolve transition overlay after handoff completes
        setTimeout(() => {
          isTransitioning = false;
          transitionProgress = 0;
          transitionMode = "decision_exit";
          notify();
        }, 350);
      }
    };

    requestAnimationFrame(frame);
  },
};
