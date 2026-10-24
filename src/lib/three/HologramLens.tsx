"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { hologramLens } from "./hologram";

/**
 * Child of <Canvas>: opens the hover-reveal spotlight around the pointer while it is over the canvas.
 * Works even when the canvas itself has pointer-events: none (listens on window).
 * The reveal's size (where it has faded to nothing) is `radiusFraction` of the canvas height, or a
 * fixed `radius` in CSS pixels. The spotlight trails the pointer slightly for a fluid feel.
 */
export function HologramLens({ radius = 200, radiusFraction }: { radius?: number; radiusFraction?: number }) {
  const gl = useThree((s) => s.gl);
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
    const tx = (x - rect.left) * dpr;
    const ty = (rect.bottom - y) * dpr;
    const center = hologramLens.uLensCenter.value;
    if (hologramLens.uLensRadius.value === 0) center.set(tx, ty);
    else center.set(THREE.MathUtils.damp(center.x, tx, 14, delta), THREE.MathUtils.damp(center.y, ty, 14, delta));

    const cssRadius = radiusFraction ? rect.height * radiusFraction : radius;
    const target = active ? cssRadius * dpr : 0;
    const current = THREE.MathUtils.damp(hologramLens.uLensRadius.value, target, 8, delta);
    hologramLens.uLensRadius.value = current < 0.5 ? 0 : current;
    hologramLens.uLensTime.value += delta;
  });

  return null;
}
