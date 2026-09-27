"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "@/store/scrollStore";

export function ScrollCameraController() {
  const { viewport } = useThree();
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

  const isDesktop = viewport.width > 6.8;
  const deviceY = isDesktop ? 0 : -Math.min(1.8, viewport.height * 0.22);

  // Smooth Hermite interpolation helper
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  // Dedicated Vectors to avoid per-frame allocations
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());

  // R3F Render Loop: Driven by single master visualProgress (Section 1 & 11)
  useFrame((state) => {
    // Phase 7.6: One master visual timeline p in [0, 1]
    const p = Math.min(Math.max(scrollState.visualProgress, 0), 1);

    if (isDesktop) {
      if (p <= 0.30) {
        // 1. HERO → LOCAL (0.00–0.30): Wide establishing shot glides toward Local framing
        const t = smoothstep(0.00, 0.30, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.0, 0.15, t),
          THREE.MathUtils.lerp(0.0, 0.03, t),
          THREE.MathUtils.lerp(7.20, 6.80, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(0.0, 0.25, t),
          THREE.MathUtils.lerp(0.0, 0.02, t),
          0.0
        );
      } else if (p <= 0.58) {
        // 2. APPROACH TABLET (0.30–0.58): Camera smoothly approaches tablet
        const t = smoothstep(0.30, 0.58, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.15, 0.42, t),
          THREE.MathUtils.lerp(0.03, 0.10, t),
          THREE.MathUtils.lerp(6.80, 5.70, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(0.25, 0.55, t),
          THREE.MathUtils.lerp(0.02, 0.05, t),
          0.0
        );
      } else if (p <= 0.72) {
        // 3. TASK REVEAL (0.58–0.72): Camera holds near tablet, framing task materialization & rise
        const t = smoothstep(0.58, 0.72, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.42, 0.48, t),
          THREE.MathUtils.lerp(0.10, 0.14, t),
          THREE.MathUtils.lerp(5.70, 5.75, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(0.55, 0.60, t),
          THREE.MathUtils.lerp(0.05, 0.10, t),
          0.0
        );
      } else if (p <= 0.94) {
        // 4. PULL BACK & FOLLOW TASK (0.72–0.94):
        // Single continuous tracking shot across the entire transit without any intermediate hitch
        const t = smoothstep(0.72, 0.94, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.48, 6.00, t),
          THREE.MathUtils.lerp(0.14, 0.22, t),
          THREE.MathUtils.lerp(5.75, 5.40, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(0.60, 7.10, t),
          THREE.MathUtils.lerp(0.10, 0.18, t),
          THREE.MathUtils.lerp(0.0, -0.30, t)
        );
      } else {
        // 5. SETTLE ON EDGE (0.94–1.00): Camera gently settles into final Edge composition
        const t = smoothstep(0.94, 1.00, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(6.00, 6.40, t),
          THREE.MathUtils.lerp(0.22, 0.15, t),
          THREE.MathUtils.lerp(5.40, 4.90, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(7.10, 7.50, t),
          THREE.MathUtils.lerp(0.18, 0.12, t),
          THREE.MathUtils.lerp(-0.30, -0.50, t)
        );
      }
    } else {
      // Mobile responsive choreography matching Phase 7.6 sequence
      if (p <= 0.30) {
        const t = smoothstep(0.00, 0.30, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.0, 0.05, t),
          THREE.MathUtils.lerp(0.0, deviceY * 0.30, t),
          THREE.MathUtils.lerp(7.20, 6.70, t)
        );
        targetLook.current.set(0.0, THREE.MathUtils.lerp(0.0, deviceY * 0.35, t), 0.0);
      } else if (p <= 0.58) {
        const t = smoothstep(0.30, 0.58, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.05, 0.10, t),
          THREE.MathUtils.lerp(deviceY * 0.30, deviceY * 0.68, t),
          THREE.MathUtils.lerp(6.70, 5.65, t)
        );
        targetLook.current.set(0.0, THREE.MathUtils.lerp(deviceY * 0.35, deviceY * 0.72, t), 0.0);
      } else if (p <= 0.72) {
        const t = smoothstep(0.58, 0.72, p);
        targetPos.current.set(
          0.10,
          THREE.MathUtils.lerp(deviceY * 0.68, deviceY * 0.72, t),
          THREE.MathUtils.lerp(5.65, 5.60, t)
        );
        targetLook.current.set(0.0, THREE.MathUtils.lerp(deviceY * 0.72, deviceY * 0.76, t), 0.0);
      } else if (p <= 0.94) {
        const t = smoothstep(0.72, 0.94, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.10, 3.20, t),
          THREE.MathUtils.lerp(deviceY * 0.72, 0.14, t),
          THREE.MathUtils.lerp(5.60, 6.00, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(0.0, 4.00, t),
          THREE.MathUtils.lerp(deviceY * 0.76, 0.0, t),
          THREE.MathUtils.lerp(0.0, -0.10, t)
        );
      } else {
        const t = smoothstep(0.94, 1.00, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(3.20, 6.20, t),
          THREE.MathUtils.lerp(0.14, -0.15, t),
          THREE.MathUtils.lerp(6.00, 5.10, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(4.00, 7.50, t),
          0.0,
          THREE.MathUtils.lerp(-0.10, -0.60, t)
        );
      }
    }

    // Apply exact camera transforms
    state.camera.position.copy(targetPos.current);
    lookAtTarget.current.copy(targetLook.current);
    state.camera.lookAt(lookAtTarget.current);
  });

  return null;
}
