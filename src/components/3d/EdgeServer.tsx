"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Group } from "three";
import { scrollState } from "@/store/scrollStore";

interface EdgeServerProps {
  position?: [number, number, number];
}

export function EdgeServer({ position = [8.2, 0.0, -1.0] }: EdgeServerProps) {
  const groupRef = useRef<Group>(null);

  // Smooth Hermite interpolation helper
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  // Materials for the compact metallic computing pod with continuous transparency support
  const chassisMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a0f18",
        roughness: 0.32,
        metalness: 0.88,
        envMapIntensity: 1.2,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const innerBayMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#04070d",
        roughness: 0.55,
        metalness: 0.75,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const bladeFaceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#111827",
        roughness: 0.28,
        metalness: 0.92,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const ventFinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0f172a",
        roughness: 0.45,
        metalness: 0.85,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  // Subtle Emerald Status Lights (Restrained emissive lighting)
  const emeraldLedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#10b981",
        emissive: "#059669",
        emissiveIntensity: 0,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const fiberGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#34d399",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Modular Server Blade Geometries
  const chassisGeo = useMemo(() => new THREE.BoxGeometry(1.24, 1.95, 0.92), []);
  const innerBayGeo = useMemo(() => new THREE.BoxGeometry(1.08, 1.75, 0.86), []);
  const bladeGeo = useMemo(() => new THREE.BoxGeometry(1.02, 0.36, 0.84), []);
  const finGeo = useMemo(() => new THREE.BoxGeometry(0.04, 1.70, 0.78), []);
  const ledGeo = useMemo(() => new THREE.BoxGeometry(0.024, 0.016, 0.012), []);
  const fiberLineGeo = useMemo(() => new THREE.BoxGeometry(0.85, 0.006, 0.008), []);
  const basePedestalGeo = useMemo(() => new THREE.BoxGeometry(1.42, 0.12, 1.10), []);

  // Frame-rate independent visual progress damping layer
  useFrame((state) => {
    if (!groupRef.current) return;
    // Phase 7.6: Single master visual timeline p in [0, 1]
    const p = Math.min(Math.max(scrollState.visualProgress, 0), 1);
    const t = state.clock.getElapsedTime();

    // Section 9: edgeReveal = smoothstep(0.78, 0.96, p)
    const edgeReveal = smoothstep(0.78, 0.96, p);

    if (edgeReveal <= 0.001) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    // 1. Continuous Opacity: opacity = edgeReveal
    chassisMaterial.opacity = edgeReveal;
    innerBayMaterial.opacity = edgeReveal;
    bladeFaceMaterial.opacity = edgeReveal;
    ventFinMaterial.opacity = edgeReveal;
    emeraldLedMaterial.opacity = edgeReveal;
    fiberGlowMaterial.opacity = 0.55 * edgeReveal;

    // 2. Continuous Scale: scale = lerp(0.82, 1.0, edgeReveal)
    const currentScale = THREE.MathUtils.lerp(0.82, 1.0, edgeReveal) * 0.95;
    groupRef.current.scale.setScalar(currentScale);

    // 3. Continuous Position: position = lerp(farPosition, finalPosition, edgeReveal)
    const finalPos = position;
    const farPos = [position[0] + 0.6, position[1], position[2] - 2.2];

    groupRef.current.position.x = THREE.MathUtils.lerp(farPos[0], finalPos[0], edgeReveal);
    groupRef.current.position.y =
      THREE.MathUtils.lerp(farPos[1], finalPos[1], edgeReveal) + Math.sin(t * 0.65) * 0.025;
    groupRef.current.position.z = THREE.MathUtils.lerp(farPos[2], finalPos[2], edgeReveal);

    // 4. Orientation facing inward toward incoming data signal
    groupRef.current.rotation.y = -0.38 + Math.sin(t * 0.4) * 0.015;

    // 5. Continuous Emerald Lighting & Status LEDs
    const pulse = Math.sin(t * 8.0) * 0.25 * edgeReveal;
    emeraldLedMaterial.emissiveIntensity = edgeReveal * (1.2 + pulse);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0.08, -0.38, 0]}
      scale={0.95}
    >
      {/* 1. Heavy Industrial Base Pedestal */}
      <mesh
        geometry={basePedestalGeo}
        material={chassisMaterial}
        position={[0, -1.02, 0]}
        castShadow
        receiveShadow
      />

      {/* 2. Outer Protective Server Pod Shell */}
      <mesh
        geometry={chassisGeo}
        material={chassisMaterial}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      />

      {/* 3. Inset Blade Bay Cavity */}
      <mesh
        geometry={innerBayGeo}
        material={innerBayMaterial}
        position={[0, 0, 0.04]}
      />

      {/* 4. Four High-Density Computing Blade Modules */}
      {[-0.57, -0.19, 0.19, 0.57].map((yOffset, i) => (
        <group key={`blade-${i}`} position={[0, yOffset, 0.06]}>
          {/* Blade Module Body */}
          <mesh
            geometry={bladeGeo}
            material={bladeFaceMaterial}
            position={[0, 0, 0]}
          />

          {/* Glowing Optical Data Channel */}
          <mesh
            geometry={fiberLineGeo}
            material={fiberGlowMaterial}
            position={[0, -0.08, 0.43]}
          />

          {/* Matrix of Emerald Status LEDs across blade front */}
          {[-0.42, -0.34, -0.26, -0.18, 0.18, 0.26, 0.34, 0.42].map((xOffset, j) => (
            <mesh
              key={`led-${i}-${j}`}
              geometry={ledGeo}
              material={emeraldLedMaterial}
              position={[xOffset, 0.10, 0.43]}
            />
          ))}

          {/* Central Module Activity Indicator Bar */}
          <mesh
            position={[0, 0.10, 0.43]}
            geometry={new THREE.BoxGeometry(0.12, 0.016, 0.012)}
            material={emeraldLedMaterial}
          />
        </group>
      ))}

      {/* 5. Lateral Heat Dissipation Vents (Left & Right fins) */}
      {[-0.64, 0.64].map((xOffset, sideIdx) => (
        <group key={`vent-side-${sideIdx}`} position={[xOffset, 0, 0]}>
          {[-0.25, -0.10, 0.05, 0.20].map((zOffset, finIdx) => (
            <mesh
              key={`fin-${finIdx}`}
              geometry={finGeo}
              material={ventFinMaterial}
              position={[0, 0, zOffset]}
            />
          ))}
        </group>
      ))}

      {/* 6. Restrained Localized Emerald Lighting */}
      <pointLight
        color="#10b981"
        intensity={2.2}
        distance={3.2}
        decay={2}
        position={[0, 0.2, 0.7]}
      />

      {/* 7. Subtle Back Rim Light for Silhouette Definition */}
      <directionalLight
        position={[3, 2, -2]}
        intensity={1.8}
        color="#34d399"
      />
    </group>
  );
}
