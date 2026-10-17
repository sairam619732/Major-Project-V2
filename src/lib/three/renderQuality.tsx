"use client";

import { useEffect, useState, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { isLowEndDevice } from "./device";

export { isLowEndDevice };

/** Frame rate low-end devices render at (halves GPU work vs 60 Hz). */
const LOW_END_FPS = 30;

/**
 * Initial <Canvas> settings: capped DPR everywhere, no MSAA on weak GPUs, and on-demand frames on
 * weak GPUs so <AdaptiveQuality /> can cap the frame rate.
 */
export function canvasQuality() {
  const lowEnd = isLowEndDevice();
  return {
    lowEnd,
    dpr: (lowEnd ? [0.75, 1] : [1, 1.5]) as [number, number],
    antialias: !lowEnd,
    frameloop: (lowEnd ? "demand" : "always") as "demand" | "always",
  };
}

/**
 * Drop-in child of <Canvas>: lowers the render resolution while the frame rate is poor and raises it
 * again when there is headroom (settling at the minimum if it keeps flip-flopping). On low-end
 * devices it also drives the canvas at a fixed 30 FPS; give the canvas `frameloop={quality.frameloop}`.
 */
export function AdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr);
  const invalidate = useThree((s) => s.invalidate);
  const frameloop = useThree((s) => s.frameloop);
  const [min, max] = canvasQuality().dpr;

  useEffect(() => {
    if (frameloop !== "demand") return;
    const id = window.setInterval(() => invalidate(), 1000 / LOW_END_FPS);
    return () => window.clearInterval(id);
  }, [frameloop, invalidate]);

  return (
    <PerformanceMonitor
      flipflops={3}
      onChange={({ factor }) => setDpr(Math.round(THREE.MathUtils.lerp(min, max, factor) * 4) / 4)}
      onFallback={() => setDpr(min)}
    />
  );
}

/** True while the element is (nearly) on screen; use to pause a canvas with frameloop="never". */
export function useInView(ref: RefObject<Element | null>, rootMargin = "100px") {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
