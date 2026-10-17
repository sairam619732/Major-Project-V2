"use client";

import { useEffect, useState, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";

// Integrated / software GPUs that struggle with full-resolution PBR scenes.
const WEAK_GPU = /swiftshader|llvmpipe|software|basic render|intel.*\b(hd|uhd)\b|mali-[gt]?[0-9]{1,2}\b|adreno.*\b[1-5][0-9]{2}\b/i;

let cachedLowEnd: boolean | null = null;

/** Best-effort, client-only check for "potato" hardware. Cached after the first call. */
export function isLowEndDevice(): boolean {
  if (cachedLowEnd !== null) return cachedLowEnd;
  if (typeof window === "undefined") return false;

  const nav = navigator as Navigator & { deviceMemory?: number };
  let lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;

  if (!lowEnd) {
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      const renderer = info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
      lowEnd = WEAK_GPU.test(renderer);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // Detection is a hint only; keep defaults if WebGL probing fails.
    }
  }

  cachedLowEnd = lowEnd;
  return lowEnd;
}

/** Initial <Canvas> settings: capped DPR everywhere, no MSAA on weak GPUs. */
export function canvasQuality() {
  const lowEnd = isLowEndDevice();
  return {
    lowEnd,
    dpr: (lowEnd ? [0.75, 1] : [1, 1.5]) as [number, number],
    antialias: !lowEnd,
  };
}

/**
 * Drop-in child of <Canvas>: lowers the render resolution while the frame rate is poor and
 * raises it again when there is headroom. Settles at the minimum if quality keeps flip-flopping.
 */
export function AdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr);
  const [min, max] = canvasQuality().dpr;
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
