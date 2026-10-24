"use client";

/* eslint-disable react-hooks/immutability -- R3F owns these mutable Three.js objects; frame callbacks update GPU resources without React renders. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Group, MeshBasicMaterial } from "three";
import { scrollState } from "@/store/scrollStore";
import { HologramImage, useHologramImage } from "./HologramImage";

interface EdgeServerProps {
  position?: [number, number, number];
}

/** The edge server rack image as a hologram, with its real look under the hover spotlight. */
export function EdgeServer({ position = [8.2, 0.0, -1.0] }: EdgeServerProps) {
  const groupRef = useRef<Group>(null);
  const haloMatRef = useRef<MeshBasicMaterial>(null);
  const material = useHologramImage("landing-edge", "#34d399", true);

  // Smooth Hermite interpolation helper
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  // SSR-safe soft radial halo texture for cinematic atmospheric glow around active server modules
  const haloTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(16, 240, 142, 0.85)");
      grad.addColorStop(0.35, "rgba(5, 223, 114, 0.40)");
      grad.addColorStop(0.70, "rgba(6, 182, 212, 0.12)");
      grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const fullP = Math.max(scrollState.visualProgress, 0);
    const p = Math.min(fullP, 1);
    const t = state.clock.getElapsedTime();

    // Phase 10.1: Cleanly hide Edge Server during Decision section
    if (fullP > 1.04) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.65) * 0.02;

    // Edge Processing Response: activates when task arrives and settles (0.60 -> 0.72)
    const processingT = smoothstep(0.60, 0.68, p) * (1 - smoothstep(0.72, 0.78, p));
    const syncPulse = Math.sin(t * 3.5);

    material.uniforms.uTime.value = t;
    material.uniforms.uIntensity.value = 0.75 + 0.45 * processingT + 0.1 * syncPulse * processingT;

    // Volumetric soft halo breathing opacity
    if (haloMatRef.current) {
      haloMatRef.current.opacity = 0.28 + 0.24 * processingT + 0.08 * syncPulse * processingT;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={0.9}>
      <HologramImage id="landing-edge" material={material} />

      {/* Soft Volumetric Emerald Halo hovering in front of active server bay (in the rack's frame) */}
      {haloTexture && (
        <group rotation={[0.08, -1.75, 0]}>
          <mesh position={[0.47, 0.15, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.78, 1.85]} />
            <meshBasicMaterial
              ref={haloMatRef}
              map={haloTexture}
              transparent
              opacity={0.28}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
