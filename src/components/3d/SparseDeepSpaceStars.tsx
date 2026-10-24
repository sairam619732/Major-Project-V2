"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Points } from "three";

export function SparseDeepSpaceStars() {
  const pointsRef = useRef<Points>(null);

  // Soft circular star texture for natural optical pinpoints (no square pixel edges)
  const starTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.25, "rgba(230, 240, 255, 0.8)");
    grad.addColorStop(0.65, "rgba(148, 163, 184, 0.2)");
    grad.addColorStop(1, "rgba(2, 4, 10, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // 120 sparse particles distributed across deep 3D space with natural voids
  const { positions, colors } = useMemo(() => {
    const count = 120;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    // Seeded-style pseudo random for consistent pleasing distribution with cosmic voids
    // Seed kept in a local object: same fixed sequence on every render.
    const rng = { seed: 42 };
    const random = () => {
      rng.seed = (rng.seed * 9301 + 49297) % 233280;
      return rng.seed / 233280;
    };

    for (let i = 0; i < count; i++) {
      // Wide 3D volume distribution
      const x = (random() - 0.5) * 44;
      const y = (random() - 0.5) * 28;
      const z = -4 - random() * 22; // Behind the device in deep space

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // 85% dim soft blue-gray / muted white, 15% slightly brighter crisp white
      const isBrighter = random() > 0.85;
      if (isBrighter) {
        col[i * 3] = 0.8 + random() * 0.15;     // R
        col[i * 3 + 1] = 0.88 + random() * 0.1; // G
        col[i * 3 + 2] = 1.0;                   // B (crisp cool white)
      } else {
        const dim = 0.35 + random() * 0.25;
        col[i * 3] = dim * 0.75;                // R
        col[i * 3 + 1] = dim * 0.85;            // G
        col[i * 3 + 2] = dim * 1.1;             // B (soft dim blue-gray)
      }
    }

    return { positions: pos, colors: col };
  }, []);

  // Very subtle celestial drift
  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    pointsRef.current.rotation.y = t * 0.002;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        map={starTexture ?? undefined}
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
