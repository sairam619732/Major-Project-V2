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
      if (p <= 0.18) {
        // 1. HERO → LOCAL (0.00–0.18): Wide establishing shot glides toward Local framing
        const t = smoothstep(0.00, 0.18, p);
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
      } else if (p <= 0.34) {
        // 2. APPROACH TABLET (0.18–0.34): Camera smoothly approaches tablet
        const t = smoothstep(0.18, 0.34, p);
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
      } else if (p <= 0.44) {
        // 3. TASK REVEAL (0.34–0.44): Camera holds near tablet, framing task materialization & rise
        const t = smoothstep(0.34, 0.44, p);
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
      } else if (p <= 0.60) {
        // 4. PULL BACK & FOLLOW TASK TO EDGE (0.44–0.60): Tracking shot across transit 1
        const t = smoothstep(0.44, 0.60, p);
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
      } else if (p <= 0.72) {
        // 5. SETTLE ON EDGE (0.60–0.72): Camera gently settles into Edge composition
        const t = smoothstep(0.60, 0.72, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(6.00, 6.35, t),
          THREE.MathUtils.lerp(0.22, 0.16, t),
          THREE.MathUtils.lerp(5.40, 5.15, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(7.10, 7.45, t),
          THREE.MathUtils.lerp(0.18, 0.14, t),
          THREE.MathUtils.lerp(-0.30, -0.45, t)
        );
      } else if (p <= 0.88) {
        // 6. FOLLOW TASK TO CLOUD (0.72–0.88): Tracking shot across deep space, elevating toward Cloud isometric framing
        const t = smoothstep(0.72, 0.88, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(6.35, 13.15, t),
          THREE.MathUtils.lerp(0.16, 1.65, t),
          THREE.MathUtils.lerp(5.15, 4.90, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(7.45, 14.90, t),
          THREE.MathUtils.lerp(0.14, 0.22, t),
          THREE.MathUtils.lerp(-0.45, -1.40, t)
        );
      } else {
        // 7. SETTLE ON CLOUD (0.88–1.00): Camera gently settles into cinematic 3/4 isometric datacenter composition
        const t = smoothstep(0.88, 1.00, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(13.15, 13.45, t),
          THREE.MathUtils.lerp(1.65, 2.20, t),
          THREE.MathUtils.lerp(4.90, 4.65, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(14.90, 15.35, t),
          THREE.MathUtils.lerp(0.22, 0.20, t),
          THREE.MathUtils.lerp(-1.40, -1.55, t)
        );
      }
    } else {
      // Mobile responsive choreography across 6 stages
      if (p <= 0.18) {
        const t = smoothstep(0.00, 0.18, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.0, 0.05, t),
          THREE.MathUtils.lerp(0.0, deviceY * 0.30, t),
          THREE.MathUtils.lerp(7.20, 6.70, t)
        );
        targetLook.current.set(0.0, THREE.MathUtils.lerp(0.0, deviceY * 0.35, t), 0.0);
      } else if (p <= 0.34) {
        const t = smoothstep(0.18, 0.34, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(0.05, 0.10, t),
          THREE.MathUtils.lerp(deviceY * 0.30, deviceY * 0.68, t),
          THREE.MathUtils.lerp(6.70, 5.65, t)
        );
        targetLook.current.set(0.0, THREE.MathUtils.lerp(deviceY * 0.35, deviceY * 0.72, t), 0.0);
      } else if (p <= 0.44) {
        const t = smoothstep(0.34, 0.44, p);
        targetPos.current.set(
          0.10,
          THREE.MathUtils.lerp(deviceY * 0.68, deviceY * 0.72, t),
          THREE.MathUtils.lerp(5.65, 5.60, t)
        );
        targetLook.current.set(0.0, THREE.MathUtils.lerp(deviceY * 0.72, deviceY * 0.76, t), 0.0);
      } else if (p <= 0.60) {
        const t = smoothstep(0.44, 0.60, p);
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
      } else if (p <= 0.72) {
        const t = smoothstep(0.60, 0.72, p);
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
      } else if (p <= 0.88) {
        const t = smoothstep(0.72, 0.88, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(6.20, 10.50, t),
          THREE.MathUtils.lerp(-0.15, 0.35, t),
          THREE.MathUtils.lerp(5.10, 5.80, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(7.50, 11.80, t),
          0.0,
          THREE.MathUtils.lerp(-0.60, -0.80, t)
        );
      } else {
        const t = smoothstep(0.88, 1.00, p);
        targetPos.current.set(
          THREE.MathUtils.lerp(10.50, 13.80, t),
          THREE.MathUtils.lerp(0.35, 0.90, t),
          THREE.MathUtils.lerp(5.80, 5.20, t)
        );
        targetLook.current.set(
          THREE.MathUtils.lerp(11.80, 15.20, t),
          THREE.MathUtils.lerp(0.0, 0.15, t),
          THREE.MathUtils.lerp(-0.80, -1.50, t)
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
