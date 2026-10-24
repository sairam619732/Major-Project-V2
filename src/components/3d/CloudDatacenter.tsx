"use client";

/* eslint-disable react-hooks/immutability -- R3F owns these mutable Three.js objects; frame callbacks update GPU resources without React renders. */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { scrollState } from "@/store/scrollStore";
import { HologramImage, useHologramImage } from "./HologramImage";

interface CloudDatacenterProps {
  position?: [number, number, number];
}

/** The cloud datacenter image as a hologram, with its real look under the hover spotlight. */
export function CloudDatacenter({ position = [16.70, -0.70, -2.10] }: CloudDatacenterProps) {
  const groupRef = useRef<Group>(null);
  const material = useHologramImage("landing-cloud", "#a78bfa", true);

  // Smooth Hermite interpolation helper
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  useFrame((state) => {
    if (!groupRef.current) return;
    const fullP = Math.max(scrollState.visualProgress, 0);
    const p = Math.min(fullP, 1);
    const t = state.clock.getElapsedTime();

    // Phase 10.1: Clean exit transition when leaving Cloud toward Decision (1.00 -> 1.06)
    if (fullP > 1.06) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const cloudExit = smoothstep(1.00, 1.06, fullP);
    // Idle float; sinks gracefully while exiting
    groupRef.current.position.y = position[1] - cloudExit * 1.8 + Math.sin(t * 0.50) * 0.015;

    // Cloud Processing Response: activates when task arrives and settles (0.90 -> 0.97)
    const processingT = smoothstep(0.90, 0.97, p);
    const syncPulse = Math.sin(t * 3.2);

    material.uniforms.uTime.value = t;
    material.uniforms.uIntensity.value = 0.75 + 0.35 * processingT + 0.08 * syncPulse * processingT;
    material.uniforms.uFade.value = 1 - cloudExit;
  });

  return (
    <group ref={groupRef} position={position} scale={0.29}>
      <HologramImage id="landing-cloud" material={material} />
    </group>
  );
}
