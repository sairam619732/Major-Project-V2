"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { ComputingDevice } from "./ComputingDevice";
import { SparseDeepSpaceStars } from "./SparseDeepSpaceStars";
import { ScrollCameraController } from "./ScrollCameraController";
import { HolographicTask } from "./HolographicTask";
import { EdgeServer } from "./EdgeServer";
import { CloudDatacenter } from "./CloudDatacenter";
import { CosmicTransition } from "./CosmicTransition";
import { CloudToDecisionCosmic } from "./CloudToDecisionCosmic";
import { DecisionVisualization } from "./DecisionVisualization";
import { AdaptiveQuality, canvasQuality } from "@/lib/three/renderQuality";
import { HOLOGRAM_LANDING } from "@/lib/three/hologram";
import { HologramLens } from "@/lib/three/HologramLens";

export function SceneCanvas() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const quality = canvasQuality();

  return (
    <div className="h-full w-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 7.2], fov: 36 }}
        dpr={quality.dpr}
        frameloop={quality.frameloop}
        gl={{
          antialias: quality.antialias,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <AdaptiveQuality />
        {/* The hover reveal draws a second, real copy of each model; skip it on weak hardware. */}
        {HOLOGRAM_LANDING && !quality.lowEnd && <HologramLens radiusFraction={0.6} />}

        {/* Deep navy-black background */}
        <color attach="background" args={["#02040A"]} />

        {/* Dynamic scroll-driven camera controller */}
        <ScrollCameraController />

        {/* 100-150 custom high-efficiency Points starfield across 3D volume */}
        <SparseDeepSpaceStars />

        {/* Balanced Ambient Environment for clean shadow legibility across all sections */}
        <ambientLight intensity={1.1} color="#334155" />

        {/* Brighter Soft Neutral Key Light (Top-Front-Right) */}
        <directionalLight
          position={[4, 5, 5]}
          intensity={3.8}
          color="#ffffff"
        />

        {/* Soft Front Face Key Light (Illuminates tablet front chassis, screws & bezel) */}
        <directionalLight
          position={[1.5, 1.5, 4.5]}
          intensity={2.2}
          color="#f8fafc"
        />

        {/* Controlled Cool Rim Light (Sharp silhouette separation from dark space) */}
        <directionalLight
          position={[5, 2, -3]}
          intensity={4.8}
          color="#38bdf8"
        />

        {/* Subtle Top-Back Cyan Accent */}
        <directionalLight
          position={[-3, 4, -4]}
          intensity={1.8}
          color="#0284c7"
        />

        {/* Subtle Neutral Fill Light from left */}
        <directionalLight
          position={[-4, 0, 3]}
          intensity={1.2}
          color="#94a3b8"
        />

        {/* Soft Atmospheric Depth Light behind the device */}
        <pointLight
          position={[2.5, 0, -1.0]}
          intensity={1.6}
          distance={5.0}
          color="#0284c7"
        />

        {/* Recognizable Procedural Computing Device */}
        <Suspense fallback={null}>
          <ComputingDevice />
          {/* Holographic Computational Task originating from device */}
          <HolographicTask />
          {/* Distributed Edge Server computing pod */}
          <EdgeServer />
          {/* Centralized Cloud Datacenter infrastructure */}
          <CloudDatacenter />
          {/* Subtle cosmic constellation transition in Edge -> Cloud WAN corridor */}
          <CosmicTransition />
          {/* Cinematic star-stream & galaxy transition in Cloud -> Decision WAN corridor */}
          <CloudToDecisionCosmic />
          {/* Dynamic offloading decision engine 3D candidate network */}
          <DecisionVisualization />
        </Suspense>
      </Canvas>
    </div>
  );
}
