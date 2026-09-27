// Lightweight mutable scroll state container (Phase 7.6: Single master scroll timeline)

export interface ScrollState {
  scrollY: number;
  scrollProgress: number; // Raw target scroll progress from native scroll [0, 1]
  visualProgress: number; // Single master damped visual timeline [0, 1]
}

export const scrollState: ScrollState = {
  scrollY: 0,
  scrollProgress: 0,
  visualProgress: 0,
};

type ScrollListener = (state: ScrollState) => void;
const listeners = new Set<ScrollListener>();

export function subscribeScroll(listener: ScrollListener): () => void {
  listeners.add(listener);
  listener(scrollState);
  return () => listeners.delete(listener);
}

export function notifyScrollListeners() {
  listeners.forEach((listener) => listener(scrollState));
}

export function updateScrollTarget(y: number, progress: number) {
  scrollState.scrollY = y;
  scrollState.scrollProgress = progress;
}
