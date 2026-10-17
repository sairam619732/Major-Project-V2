"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { REAL_MODEL_LAYER, hologramLens } from "./hologram";

/**
 * Child of <Canvas>: opens the hologram scanner lens around the pointer while it is over the canvas.
 * Works even when the canvas itself has pointer-events: none (listens on window).
 * `radius` is in CSS pixels.
 */
export function HologramLens({ radius = 140 }: { radius?: number }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const pointer = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      pointer.current.active =
        e.pointerType !== "touch" &&
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    };
    const onLeave = () => {
      pointer.current.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      hologramLens.uLensRadius.value = 0;
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dpr = gl.getPixelRatio();
    const rect = gl.domElement.getBoundingClientRect();
    const { x, y, active } = pointer.current;
    // gl_FragCoord space: drawing-buffer pixels with the origin at the bottom-left.
    hologramLens.uLensCenter.value.set((x - rect.left) * dpr, (rect.bottom - y) * dpr);
    const target = active ? radius * dpr : 0;
    const current = THREE.MathUtils.damp(hologramLens.uLensRadius.value, target, 10, delta);
    hologramLens.uLensRadius.value = current < 0.5 ? 0 : current;

    // Only render the real-model copies while the lens is open.
    if (hologramLens.uLensRadius.value > 0) camera.layers.enable(REAL_MODEL_LAYER);
    else camera.layers.disable(REAL_MODEL_LAYER);
  });

  return null;
}
