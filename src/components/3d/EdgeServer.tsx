"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, PointLight, MeshBasicMaterial } from "three";
import { scrollState } from "@/store/scrollStore";

interface EdgeServerProps {
  position?: [number, number, number];
}

export function EdgeServer({ position = [8.2, 0.0, -1.0] }: EdgeServerProps) {
  const groupRef = useRef<Group>(null);
  const pointLightRef = useRef<PointLight>(null);
  const upperLightRef = useRef<PointLight>(null);
  const lowerLightRef = useRef<PointLight>(null);
  const haloMatRef = useRef<MeshBasicMaterial>(null);

  // References to emissive materials for synchronized processing pulse
  const emmisMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Safe R3F model loading using the user's authentic Edge 3D GLB asset
  const { scene } = useGLTF("/assets/edge/data_center_rack.glb");

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

  // Cloned scene configured with realistic dark metallic PBR materials & high-contrast emerald emissive LEDs
  const clonedScene = useMemo(() => {
    emmisMatsRef.current = [];

    const cl = scene.clone(true);
    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial;

            // Preserve authentic PBR textures with solid depth and clear contrast
            mat.envMapIntensity = 1.4;

            // 1. Chassis frame / outer body: deep space dark metallic finish
            if (mat.name === "material") {
              mat.roughness = 0.38;
              mat.metalness = 0.75;
              mat.color = new THREE.Color("#11151e");
              mat.needsUpdate = true;
            }
            // 2. Acrylic / tinted glass door: crystal clear transparency so glowing blades are vivid
            else if (mat.name === "Mat_1") {
              mat.transparent = true;
              mat.opacity = 0.18;
              mat.roughness = 0.08;
              mat.metalness = 0.15;
              mat.color = new THREE.Color("#0a0f18");
              mat.needsUpdate = true;
            }
            // 3. Server blades & high-resolution LED status indicators
            else {
              mat.roughness = 0.28;
              mat.metalness = 0.50;

              const isEmissive =
                mat.name === "Mat_2" ||
                (mat.emissive && mat.emissive.getHex() > 0) ||
                mat.emissiveMap !== null ||
                (mat.name && mat.name.toLowerCase().includes("emmis")) ||
                (mesh.name && mesh.name.toLowerCase().includes("emmis"));

              if (isEmissive) {
                // Vibrant, technical emerald status LED glow (individual LEDs remain pin-sharp via emissiveMap)
                mat.emissive = new THREE.Color("#05df72");
                mat.emissiveIntensity = 2.4;
                mat.needsUpdate = true;
                emmisMatsRef.current.push(mat);
              }
            }
          });
        }
      }
    });

    return cl;
  }, [scene]);

  // Frame-rate independent visual progress damping layer
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

    // Subtle idle floating & 3D breathing rotation for isometric depth (front server face angled toward camera)
    groupRef.current.position.y = position[1] + Math.sin(t * 0.65) * 0.02;
    groupRef.current.rotation.y = -1.75 + Math.sin(t * 0.35) * 0.012;
    groupRef.current.rotation.x = 0.08 + Math.cos(t * 0.35) * 0.006;

    // Edge Processing Response: activates when task arrives and settles (0.60 -> 0.72)
    const processingT = smoothstep(0.60, 0.68, p) * (1 - smoothstep(0.72, 0.78, p));
    const syncPulse = Math.sin(t * 3.5);
    const ledWave = Math.sin(t * 5.0) * 0.5 + 0.5;

    // Active status indication: Status LEDs switch from standby (2.4) to active processing cadence (up to 4.6)
    const emissiveIntensity =
      2.4 + 1.8 * processingT + (0.6 * syncPulse + 0.4 * ledWave) * processingT;

    for (let i = 0; i < emmisMatsRef.current.length; i++) {
      emmisMatsRef.current[i].emissiveIntensity = emissiveIntensity;
    }

    // 1. Primary Central Processing Light: strong but controlled green glow with physical rack spill
    if (pointLightRef.current) {
      pointLightRef.current.intensity =
        3.6 + 2.4 * processingT + 1.0 * syncPulse * processingT;
    }

    // 2. Upper and lower rack module accent spills
    if (upperLightRef.current) {
      upperLightRef.current.intensity = 1.8 + 1.2 * processingT;
    }
    if (lowerLightRef.current) {
      lowerLightRef.current.intensity = 1.5 + 0.9 * processingT;
    }

    // 3. Volumetric soft halo breathing opacity
    if (haloMatRef.current) {
      haloMatRef.current.opacity =
        0.28 + 0.24 * processingT + 0.08 * syncPulse * processingT;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0.08, -1.75, 0]}
      scale={0.90}
    >
      {/* Real Imported Edge Server Rack 3D Model centered at origin */}
      <primitive object={clonedScene} position={[0, -1.157, 0]} />

      {/* Soft Volumetric Emerald Halo hovering in front of active server bay */}
      {haloTexture && (
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
      )}

      {/* Cinematic Lighting for Edge Computing Pod */}
      {/* 1. Primary Central Processing Light in front of rack blades (+X local face) */}
      <pointLight
        ref={pointLightRef}
        color="#10f08e"
        intensity={3.6}
        distance={4.8}
        decay={2.0}
        position={[0.60, 0.15, 0.0]}
      />

      {/* 2. Upper Rack Module Accent Spill */}
      <pointLight
        ref={upperLightRef}
        color="#05df72"
        intensity={1.8}
        distance={3.5}
        decay={2.0}
        position={[0.55, 0.70, 0.0]}
      />

      {/* 3. Lower Rack Module Accent Spill */}
      <pointLight
        ref={lowerLightRef}
        color="#10b981"
        intensity={1.5}
        distance={3.2}
        decay={2.0}
        position={[0.55, -0.60, 0.0]}
      />

      {/* 4. Soft Cyan Rim Accent (-X local rear / top) */}
      <pointLight
        color="#06b6d4"
        intensity={2.6}
        distance={5.0}
        decay={1.8}
        position={[-0.9, 1.1, 0.0]}
      />

      {/* 5. Soft Front Key Light for dark metallic chassis highlights */}
      <pointLight
        color="#f1f5f9"
        intensity={1.8}
        distance={6.0}
        decay={1.8}
        position={[1.8, 0.8, -0.6]}
      />
    </group>
  );
}

// Preload real Edge Server GLB model asset for instant hydration without hitching
useGLTF.preload("/assets/edge/data_center_rack.glb");
