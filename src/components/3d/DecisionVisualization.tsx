// Phase 10.1: Clean Decision Scene Composition
// Renders an independent, clean 3D chapter with TASK_001 at the center
// and three minimal candidate nodes (LOCAL top, EDGE lower-left, CLOUD lower-right)
// arranged in a clean, non-clipped constellation with generous negative space.

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Group, Points, PointLight } from "three";
import { scrollState } from "@/store/scrollStore";
import {
  evaluateOffloadingDecision,
  DEFAULT_TASK,
  DEFAULT_DEVICE,
  DEFAULT_EDGE,
  DEFAULT_CLOUD,
} from "@/lib/offloading/decisionEngine";

// Smooth Hermite interpolation helper
function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function DecisionVisualization() {
  const rootGroupRef = useRef<Group>(null);

  // Candidate Node Meshes
  const localNodeRef = useRef<Group>(null);
  const edgeNodeRef = useRef<Group>(null);
  const cloudNodeRef = useRef<Group>(null);

  // Candidate Lights
  const edgePulseLightRef = useRef<PointLight>(null);
  const localLightRef = useRef<PointLight>(null);
  const cloudLightRef = useRef<PointLight>(null);

  // Streaming Quanta Particles along the selected path
  const quantaRef = useRef<Points>(null);

  // Evaluate deterministic decision result directly from engine
  const decisionResult = useMemo(
    () =>
      evaluateOffloadingDecision(
        DEFAULT_TASK,
        DEFAULT_DEVICE,
        DEFAULT_EDGE,
        DEFAULT_CLOUD
      ),
    []
  );

  // Dedicated Decision Center Coordinates (isolated from previous showcase geometry)
  const decisionCenter = useMemo(() => new THREE.Vector3(26.0, 0.40, 0.0), []);

  // Inverted-Y / Radial Constellation:
  // LOCAL: directly above TASK_001
  // EDGE: lower-left
  // CLOUD: lower-right
  const localPos = useMemo(() => new THREE.Vector3(26.0, 1.85, -0.15), []);
  const edgePos = useMemo(() => new THREE.Vector3(24.6, -0.65, -0.15), []);
  const cloudPos = useMemo(() => new THREE.Vector3(27.4, -0.65, -0.15), []);

  // 1. Thin Technical Evaluation Paths from TASK_001
  const localLineData = useMemo(() => {
    const points = [decisionCenter, localPos];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      linewidth: 1,
    });
    return { geo, mat };
  }, [decisionCenter, localPos]);

  const edgeLineData = useMemo(() => {
    const points = [decisionCenter, edgePos];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: "#10b981",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      linewidth: 2,
    });
    return { geo, mat };
  }, [decisionCenter, edgePos]);

  const cloudLineData = useMemo(() => {
    const points = [decisionCenter, cloudPos];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: "#8b5cf6",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      linewidth: 1,
    });
    return { geo, mat };
  }, [decisionCenter, cloudPos]);

  const localLine = useMemo(
    () => new THREE.Line(localLineData.geo, localLineData.mat),
    [localLineData]
  );
  const edgeLine = useMemo(
    () => new THREE.Line(edgeLineData.geo, edgeLineData.mat),
    [edgeLineData]
  );
  const cloudLine = useMemo(
    () => new THREE.Line(cloudLineData.geo, cloudLineData.mat),
    [cloudLineData]
  );

  // 2. Streaming Data Particles along the Selected Path
  const selectedTargetPos =
    decisionResult.selectedTarget === "edge"
      ? edgePos
      : decisionResult.selectedTarget === "local"
      ? localPos
      : cloudPos;

  const [quantaGeo, quantaMat] = useMemo(() => {
    const count = 12;
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: "#34d399",
      size: 0.040,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    return [geo, mat];
  }, []);

  // 3. Candidate Node Materials
  // Dark metallic chassis
  const chassisMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#080c16",
        roughness: 0.25,
        metalness: 0.88,
      }),
    []
  );

  // Amber Local Glow
  const localGlowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        emissive: "#d97706",
        emissiveIntensity: 1.8,
        roughness: 0.2,
      }),
    []
  );

  // Emerald Edge Glow
  const edgeGlowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#10b981",
        emissive: "#059669",
        emissiveIntensity: 2.2,
        roughness: 0.2,
      }),
    []
  );

  // Violet Cloud Glow
  const cloudGlowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8b5cf6",
        emissive: "#6d28d9",
        emissiveIntensity: 1.8,
        roughness: 0.2,
      }),
    []
  );

  // Selection Halo Geometry
  const haloGeo = useMemo(() => new THREE.RingGeometry(0.24, 0.26, 32), []);
  const edgeHaloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#34d399",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  useFrame((state) => {
    const p = scrollState.visualProgress;
    const t = state.clock.getElapsedTime();

    // 1. Reveal Envelope: Fades in as user scrolls into Decision section (1.04 -> 1.16)
    const revealT = smoothstep(1.04, 1.16, p);

    if (revealT <= 0.001) {
      if (rootGroupRef.current) rootGroupRef.current.visible = false;
      return;
    }

    if (rootGroupRef.current) rootGroupRef.current.visible = true;

    // 2. Evaluation Progress (1.18 -> 1.30)
    // Standby -> Evaluated State
    const evalT = smoothstep(1.18, 1.30, p);
    const syncPulse = Math.sin(t * 3.6);

    // Dynamic Micro-Floating for spatial aliveness
    if (localNodeRef.current) {
      localNodeRef.current.position.y = localPos.y + Math.sin(t * 1.5 + 1.0) * 0.015;
    }
    if (edgeNodeRef.current) {
      edgeNodeRef.current.position.y = edgePos.y + Math.sin(t * 1.6 + 2.0) * 0.018;
    }
    if (cloudNodeRef.current) {
      cloudNodeRef.current.position.y = cloudPos.y + Math.sin(t * 1.4 + 3.0) * 0.015;
    }

    // Node Emissive Responses based on evaluated decision
    const isEdgeSelected = decisionResult.selectedTarget === "edge";
    const isLocalSelected = decisionResult.selectedTarget === "local";
    const isCloudSelected = decisionResult.selectedTarget === "cloud";

    // Edge Node
    edgeGlowMat.emissiveIntensity =
      (1.8 + (isEdgeSelected ? evalT * 1.8 + syncPulse * 0.45 * evalT : -evalT * 0.9)) *
      revealT;
    if (edgePulseLightRef.current) {
      edgePulseLightRef.current.intensity =
        (0.6 + (isEdgeSelected ? evalT * 2.2 + syncPulse * 0.5 * evalT : -evalT * 0.3)) *
        revealT;
    }
    edgeHaloMat.opacity =
      (isEdgeSelected ? 0.15 + evalT * 0.65 + syncPulse * 0.18 * evalT : 0) * revealT;

    // Local Node
    localGlowMat.emissiveIntensity =
      (1.8 + (isLocalSelected ? evalT * 1.8 : -evalT * 1.1)) * revealT;
    if (localLightRef.current) {
      localLightRef.current.intensity =
        (0.6 + (isLocalSelected ? evalT * 1.8 : -evalT * 0.3)) * revealT;
    }

    // Cloud Node
    cloudGlowMat.emissiveIntensity =
      (1.8 + (isCloudSelected ? evalT * 1.8 : -evalT * 1.1)) * revealT;
    if (cloudLightRef.current) {
      cloudLightRef.current.intensity =
        (0.6 + (isCloudSelected ? evalT * 1.8 : -evalT * 0.3)) * revealT;
    }

    // 3. Technical Path Opacities
    // Selected path becomes bright; unselected paths become subdued
    localLineData.mat.opacity =
      (0.50 + (isLocalSelected ? evalT * 0.45 : -evalT * 0.28)) * revealT;
    edgeLineData.mat.opacity =
      (0.50 + (isEdgeSelected ? evalT * 0.48 : -evalT * 0.28)) * revealT;
    cloudLineData.mat.opacity =
      (0.50 + (isCloudSelected ? evalT * 0.45 : -evalT * 0.28)) * revealT;

    // 4. Animate Streaming Quanta along the Selected Path
    if (quantaRef.current) {
      quantaMat.opacity = evalT * 0.92 * revealT;
      const posAttr = quantaGeo.attributes.position as THREE.BufferAttribute;
      const count = 12;

      for (let i = 0; i < count; i++) {
        const u = (t * 0.9 + i / count) % 1.0;
        const x = THREE.MathUtils.lerp(decisionCenter.x, selectedTargetPos.x, u);
        const y = THREE.MathUtils.lerp(decisionCenter.y, selectedTargetPos.y, u);
        const z = THREE.MathUtils.lerp(decisionCenter.z, selectedTargetPos.z, u);
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group ref={rootGroupRef} visible={false}>
      {/* ==================================================
          1. THREE EVALUATION PATHS FROM TASK_001
          ================================================== */}
      {/* Path 1: Task -> Local */}
      <primitive object={localLine} />

      {/* Path 2: Task -> Edge (Selected in demo state) */}
      <primitive object={edgeLine} />

      {/* Path 3: Task -> Cloud */}
      <primitive object={cloudLine} />

      {/* Streaming Quanta along Selected Path */}
      <points ref={quantaRef} geometry={quantaGeo} material={quantaMat} />

      {/* ==================================================
          2. LOCAL CANDIDATE NODE (Top Center)
          ================================================== */}
      <group ref={localNodeRef} position={localPos}>
        {/* Chassis: Compact Rounded Tablet Form */}
        <mesh material={chassisMat} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.25, 0.035]} />
        </mesh>
        {/* Screen / Amber Accent */}
        <mesh material={localGlowMat} position={[0, 0, 0.02]}>
          <planeGeometry args={[0.32, 0.19]} />
        </mesh>
        {/* Subtle Technical Frame */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.40, 0.27, 0.04]} />
          <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.25} />
        </mesh>
        <pointLight ref={localLightRef} color="#f59e0b" distance={1.8} intensity={0.6} />
      </group>

      {/* ==================================================
          3. EDGE CANDIDATE NODE (Lower-Left · Selected)
          ================================================== */}
      <group ref={edgeNodeRef} position={edgePos}>
        {/* Chassis: Compact Server Blade */}
        <mesh material={chassisMat} castShadow receiveShadow>
          <boxGeometry args={[0.24, 0.40, 0.24]} />
        </mesh>
        {/* Front Server Grille / Emerald LEDs */}
        <mesh material={edgeGlowMat} position={[0, 0, 0.122]}>
          <planeGeometry args={[0.16, 0.32]} />
        </mesh>
        {/* Emerald Perimeter Accent Strips */}
        <mesh position={[-0.10, 0, 0.124]}>
          <boxGeometry args={[0.012, 0.34, 0.005]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
        <mesh position={[0.10, 0, 0.124]}>
          <boxGeometry args={[0.012, 0.34, 0.005]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
        {/* Active Selection Halo Ring */}
        <mesh geometry={haloGeo} material={edgeHaloMat} position={[0, 0, -0.05]} />
        {/* Restrained Emerald Processing Glow */}
        <pointLight ref={edgePulseLightRef} color="#10b981" distance={2.6} intensity={1.6} />
      </group>

      {/* ==================================================
          4. CLOUD CANDIDATE NODE (Lower-Right)
          ================================================== */}
      <group ref={cloudNodeRef} position={cloudPos}>
        {/* Primary Datacenter Block */}
        <mesh material={chassisMat} position={[-0.07, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.34, 0.22]} />
        </mesh>
        {/* Secondary Datacenter Block */}
        <mesh material={chassisMat} position={[0.10, -0.04, -0.03]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 0.24, 0.18]} />
        </mesh>
        {/* Violet Optical Waveguides */}
        <mesh material={cloudGlowMat} position={[-0.07, 0, 0.112]}>
          <planeGeometry args={[0.14, 0.26]} />
        </mesh>
        <mesh material={cloudGlowMat} position={[0.10, -0.04, 0.062]}>
          <planeGeometry args={[0.12, 0.16]} />
        </mesh>
        <pointLight ref={cloudLightRef} color="#8b5cf6" distance={1.8} intensity={0.6} />
      </group>
    </group>
  );
}
