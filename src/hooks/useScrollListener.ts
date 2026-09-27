"use client";

import { useEffect } from "react";
import {
  updateScrollTarget,
  scrollState,
  notifyScrollListeners,
} from "@/store/scrollStore";

declare global {
  interface Window {
    __SCROLL_STATE__?: typeof scrollState;
  }
}

export function useScrollListener() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.__SCROLL_STATE__ = scrollState;

    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const maxScroll = docHeight - winHeight;

      // Phase 10: Calibrate timeline so the approved 4-tier journey (Hero -> Local -> Edge -> Cloud)
      // occupies [0.0, 1.0] across 650vh, and the new Decision section extends smoothly [1.0, ~1.46]
      const baseMaxScroll = winHeight * 6.5;
      const rawProgress = baseMaxScroll > 0 ? scrollY / baseMaxScroll : 0;
      const maxProgress = maxScroll > 0 ? maxScroll / baseMaxScroll : 1.0;
      const scrollProgress = Math.max(0, Math.min(rawProgress, maxProgress));

      updateScrollTarget(scrollY, scrollProgress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    // Initial sync
    handleScroll();
    scrollState.visualProgress = scrollState.scrollProgress;
    notifyScrollListeners();

    // Central frame-rate independent damping loop (Section 12: smooth + responsive, zero lag)
    let rafId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Damping factor: 7.2 gives immediate tactile responsiveness while eliminating mouse wheel stepping
      const factor = 1 - Math.exp(-7.2 * delta);
      const diff = scrollState.scrollProgress - scrollState.visualProgress;

      if (Math.abs(diff) > 0.00002) {
        scrollState.visualProgress += diff * factor;
        notifyScrollListeners();
      } else if (scrollState.visualProgress !== scrollState.scrollProgress) {
        scrollState.visualProgress = scrollState.scrollProgress;
        notifyScrollListeners();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return scrollState;
}
