"use client";

/* eslint-disable react-hooks/immutability -- R3F owns these mutable Three.js objects; frame callbacks update GPU resources without React renders. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, PointLight } from "three";
import { scrollState } from "@/store/scrollStore";
import { HOLOGRAM_LANDING, addHologramLayer, createHologramMaterial } from "@/lib/three/hologram";

interface CloudDatacenterProps {
  position?: [number, number, number];
}

interface EmissiveTrackItem {
  mat: THREE.MeshStandardMaterial;
  baseIntensity: number;
}

export function CloudDatacenter({
  position = [16.70, -0.70, -2.10],
}: CloudDatacenterProps) {
  const groupRef = useRef<Group>(null);
  const aisleLightRef = useRef<PointLight>(null);

  // References to emissive materials with their normalized baseline intensities
  const emmisItemsRef = useRef<EmissiveTrackItem[]>([]);
  // Front faces only: the dense hall's stacked additive layers would otherwise blow out to white.
  const hologram = useMemo(() => (HOLOGRAM_LANDING ? createHologramMaterial("#a78bfa", THREE.FrontSide) : null), []);

  // Load custom Blender Cloud datacenter asset
  const { scene } = useGLTF("/assets/cloud/cloud_datacenter_clean.glb");

  // Smooth Hermite interpolation helper
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  // Cloned scene configured with realistic dark metallic PBR materials & selected emissive glows
  const clonedScene = useMemo(() => {
    emmisItemsRef.current = [];

    const cl = scene.clone(true);
    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material && !Array.isArray(mesh.material)) {
          const mat = mesh.material as THREE.MeshStandardMaterial;

          // Preserve authentic PBR textures with solid depth and clear metallic contrast
          mat.envMapIntensity = 1.4;

          // Identify authored emissive components (LEDs, status lights, perimeter strips, light guides)
          const isEmissive =
            (mat.emissive && mat.emissive.getHex() > 0) ||
            (mat.name && mat.name.toUpperCase().includes("EMISSIVE")) ||
            (mesh.name && mesh.name.toUpperCase().includes("EMISSIVE"));

          if (isEmissive) {
            // Normalize authored intensities to a controlled, non-washed-out baseline (1.2 to 2.8)
            const rawIntensity = mat.emissiveIntensity || 1.0;
            const baseIntensity = Math.min(Math.max(rawIntensity, 1.2), 2.8);
            mat.emissiveIntensity = baseIntensity;
            mat.needsUpdate = true;
            emmisItemsRef.current.push({ mat, baseIntensity });
          } else {
            // Keep rack bodies, utility walls, and satin titanium floor dark metallic
            mat.roughness = Math.max(0.20, Math.min(mat.roughness ?? 0.35, 0.60));
            mat.metalness = Math.max(0.25, Math.min(mat.metalness ?? 0.60, 0.75));
            mat.needsUpdate = true;
          }
        }
      }
    });

    // Hologram twin outside the hover lens; the real model above shows inside it.
    if (hologram) addHologramLayer(cl, hologram);
    return cl;
  }, [scene, hologram]);

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
    const exitFade = 1 - cloudExit;

    // Subtle idle floating & 3D breathing rotation for isometric depth (sinks gracefully if exiting)
    groupRef.current.position.y =
      position[1] - cloudExit * 1.8 + Math.sin(t * 0.50) * 0.015;
    groupRef.current.rotation.y = -1.15 + Math.sin(t * 0.28) * 0.006;
    groupRef.current.rotation.x = 0.03 + Math.cos(t * 0.32) * 0.004;

    // Cloud Processing Response: activates when task arrives and settles (0.90 -> 0.97)
    const processingT = smoothstep(0.90, 0.97, p);
    const syncPulse = Math.sin(t * 3.2);
    const ledCadence = Math.sin(t * 6.0) * 0.5 + 0.5;

    // Restrained compute pulse: smooth ~1.4x acceleration at peak compute without bloom blowout
    const pulseFactor =
      1.0 + 0.35 * processingT + (0.18 * syncPulse + 0.12 * ledCadence) * processingT;

    for (let i = 0; i < emmisItemsRef.current.length; i++) {
      const item = emmisItemsRef.current[i];
      item.mat.emissiveIntensity = item.baseIntensity * pulseFactor * exitFade;
    }

    if (hologram) {
      hologram.uniforms.uTime.value = t;
      hologram.uniforms.uIntensity.value = (0.75 + 0.35 * processingT + 0.08 * syncPulse * processingT) * exitFade;
    }

    // Localized violet/indigo point light in the server aisle
    if (aisleLightRef.current) {
      aisleLightRef.current.intensity =
        (3.0 + 1.6 * processingT + 0.8 * syncPulse * processingT) * exitFade;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0.03, -1.15, 0.0]}
      scale={0.29}
    >
      {/* Custom Blender Enterprise Cloud Datacenter 3D Model */}
      <primitive object={clonedScene} />

      {/* Cinematic Lighting for Custom Isometric Datacenter Facility */}
      {/* 1. Primary Violet Aisle Point Light (Deep violet/purple datacenter corridor glow) */}
      <pointLight
        ref={aisleLightRef}
        color="#8b5cf6"
        intensity={3.2}
        distance={8.5}
        decay={1.8}
        position={[0, 1.4, 0]}
      />

      {/* 2. Secondary Front/Aisle Cyan Fill Light (Technical cyan server LED accent) */}
      <pointLight
        color="#21ceff"
        intensity={1.8}
        distance={6.5}
        decay={1.8}
        position={[-1.5, 1.0, 3.8]}
      />

      {/* 3. Overhead Cool Neutral Key Light (Illuminates cable ladders, conduits & gantry) */}
      <pointLight
        color="#f1f5f9"
        intensity={2.6}
        distance={10.0}
        decay={1.8}
        position={[-2.0, 4.5, 1.0]}
      />

      {/* 4. Soft Violet Rim Light (Sharp silhouette separation from deep space) */}
      <pointLight
        color="#aa35ff"
        intensity={3.4}
        distance={9.0}
        decay={1.8}
        position={[2.5, 3.5, -4.5]}
      />

      {/* 5. Soft Lower Platform Fill Light (Cutaway edge & satin titanium floor tiles) */}
      <pointLight
        color="#94a3b8"
        intensity={1.6}
        distance={7.0}
        decay={1.8}
        position={[1.8, 0.6, 4.5]}
      />
    </group>
  );
}

// Preload custom Cloud GLB model asset for instant hydration without hitching
useGLTF.preload("/assets/cloud/cloud_datacenter_clean.glb");
