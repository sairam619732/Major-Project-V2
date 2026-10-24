// Phase 10.2.2: Fix Decision Asset Orientation, Scale, Framing, and Physical Connectivity
//
// 1. LOCAL TABLET: Correct orientation with upright screen facing camera via [Math.PI/2, 0, 0]
// 2. EDGE SERVER: Substantially enlarged (~2.7x) with front-facing server blades & emerald LEDs
// 3. CLOUD DATACENTER: Balanced footprint with isometric orientation
// 4. PHYSICAL CONNECTIVITY: Derives world-space anchor points from where each model sits in its image
//    Lines and streaming quanta physically touch the model surfaces without empty space or gaps.
// The candidates are pre-rendered model images shown as holograms (see HologramImage).

"use client";

 

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Group, Points, Mesh } from "three";
import { scrollState } from "@/store/scrollStore";
import {
  evaluateOffloadingDecision,
  DEFAULT_TASK,
  DEFAULT_DEVICE,
  DEFAULT_EDGE,
  DEFAULT_CLOUD,
} from "@/lib/offloading/decisionEngine";
import { simulationStore } from "@/lib/simulation/simulationState";
import { transitionStore } from "@/lib/transition/transitionStore";
import { createHologramScreenMaterial } from "@/lib/three/hologram";
import { HOLOGRAM_VIEWS, viewPoint, viewQuaternion, type HologramViewId } from "@/lib/three/hologramViews";
import { HologramImage, useHologramImage } from "./HologramImage";

// Image layout of each candidate, for anchoring the evaluation paths on the model itself.
function candidateView(id: HologramViewId) {
  const view = HOLOGRAM_VIEWS[id];
  const [minU, minV, maxU, maxV] = view.content;
  return { view, quaternion: viewQuaternion(view), minU, minV, maxU, maxV, midU: (minU + maxU) / 2 };
}
const LOCAL_VIEW = candidateView("decision-local");
const EDGE_VIEW = candidateView("decision-edge");
const CLOUD_VIEW = candidateView("decision-cloud");

/** World point at image coordinates (u, v) of a candidate whose group is `node`. */
function candidatePoint(c: ReturnType<typeof candidateView>, node: Group, u: number, v: number, target: THREE.Vector3) {
  return viewPoint(c.view, c.quaternion, u, v, target).multiplyScalar(node.scale.x).add(node.position);
}

// Smooth Hermite interpolation helper
function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function renderTabletCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  device: { cpuAvailablePct: number; memoryAvailablePct: number; batteryPct: number; latencyMs: number },
  score: number,
  isSelected: boolean
) {
  ctx.fillStyle = "#0c0803";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(245, 158, 11, 0.14)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= width; x += 36) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y <= height; y += 36) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  ctx.strokeStyle = isSelected ? "rgba(245, 158, 11, 0.95)" : "rgba(245, 158, 11, 0.65)";
  ctx.lineWidth = isSelected ? 4 : 3;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 34px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("LOCAL RUNTIME // ON-CHIP NPU", 56, 92);

  ctx.strokeStyle = "rgba(245, 158, 11, 0.40)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 120);
  ctx.lineTo(width - 56, 120);
  ctx.stroke();

  ctx.fillStyle = "rgba(253, 230, 138, 0.95)";
  ctx.font = "bold 30px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText(`CPU AVAIL:  ${device.cpuAvailablePct}%`, 56, 190);
  ctx.fillText(`MEM AVAIL:  ${device.memoryAvailablePct}%`, 56, 260);

  ctx.fillStyle = device.batteryPct < 25 ? "#ef4444" : "#f59e0b";
  ctx.fillText(`BATTERY:    ${device.batteryPct}% [${device.batteryPct < 30 ? "DRAIN RISK" : "NOMINAL"}]`, 56, 330);

  ctx.fillStyle = "rgba(253, 230, 138, 0.95)";
  ctx.fillText(`LATENCY:    ${device.latencyMs} MS`, 56, 400);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 32px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText(`COST SCORE: ${score}`, 56, 480);

  ctx.fillStyle = isSelected ? "#34d399" : "rgba(245, 158, 11, 0.85)";
  ctx.font = "24px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText(isSelected ? "STATUS: >> ACTIVE OFFLOAD TARGET <<" : "STATUS: EVALUATION CANDIDATE", 56, 570);
}

export function DecisionVisualization() {
  const rootGroupRef = useRef<Group>(null);

  // Dynamic tablet canvas and texture refs for live simulated updates
  const tabletCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tabletTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastTabletStateRef = useRef<string>("");

  // Candidate Node Groups
  const localNodeRef = useRef<Group>(null);
  const edgeNodeRef = useRef<Group>(null);
  const cloudNodeRef = useRef<Group>(null);

  // Halo Mesh Ref
  const haloMeshRef = useRef<Mesh>(null);

  // Streaming Quanta Particles along the selected path
  const quantaRef = useRef<Points>(null);

  // 1. Candidate holograms in each candidate's panel colour (pre-rendered model images)
  const holo = {
    local: useHologramImage("decision-local", "#fbbf24"),
    edge: useHologramImage("decision-edge", "#34d399"),
    cloud: useHologramImage("decision-cloud", "#a78bfa"),
  };

  // 2. Evaluate Deterministic Decision Result
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

  // 3. Dedicated Spatial Coordinates around Centered TASK_001

  // Balanced Triangular Constellation (Phase 10.2.2):
  // LOCAL: Upper-center, upright with front OLED screen facing camera
  // EDGE: Lower-left, front server face visible, substantially enlarged
  // CLOUD: Lower-right, 3/4 isometric orientation
  // Kept tall and narrow so it fits the gap between the text column and the candidate cards
  // (ScrollCameraController frames it there; update DECISION_* there if this extent changes).
  const localPos = useMemo(() => new THREE.Vector3(26.00, 1.85, 0.00), []);
  const edgePos = useMemo(() => new THREE.Vector3(25.05, -0.95, 0.00), []);
  const cloudPos = useMemo(() => new THREE.Vector3(26.95, -1.05, 0.00), []);

  // Distinct Anchors originating from TASK_001's outer lattice vertices
  const taskTopAnchor = useMemo(() => new THREE.Vector3(26.00, 0.58, 0.02), []);
  const taskLeftAnchor = useMemo(() => new THREE.Vector3(25.86, 0.28, 0.02), []);
  const taskRightAnchor = useMemo(() => new THREE.Vector3(26.14, 0.28, 0.02), []);

  // Dynamic World-Space Target Anchors (computed every frame from where each model sits in its image)
  const localAnchor = useRef(new THREE.Vector3(26.00, 1.63, 0.05));
  const edgeAnchor = useRef(new THREE.Vector3(25.05, -0.62, 0.05));
  const cloudAnchor = useRef(new THREE.Vector3(26.70, -0.65, 0.05));
  const edgeBase = useRef(new THREE.Vector3());

  // 4. High-Resolution Tablet OLED Screen Texture (Amber Identity)
  const tabletScreenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    renderTabletCanvas(
      ctx,
      canvas.width,
      canvas.height,
      DEFAULT_DEVICE,
      decisionResult.candidateScores.local.score,
      false
    );

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    return tex;
  }, [decisionResult.candidateScores.local.score]);

  // 5. Tablet screen drawn live over the LOCAL hologram (redrawn with real readings in simulation)
  const screenMaterial = useMemo(
    () => (tabletScreenTexture ? createHologramScreenMaterial(tabletScreenTexture, "#fcd34d") : undefined),
    [tabletScreenTexture]
  );
  useEffect(() => {
    // The live redraw (useFrame) paints onto this canvas/texture.
    tabletCanvasRef.current = (tabletScreenTexture?.image as HTMLCanvasElement | undefined) ?? null;
    tabletTextureRef.current = tabletScreenTexture;
    return () => {
      tabletScreenTexture?.dispose();
      screenMaterial?.dispose();
    };
  }, [tabletScreenTexture, screenMaterial]);

  // 6. Dynamic Evaluation Line Geometries (Updated dynamically each frame to touch models)
  const localLineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const edgeLineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const cloudLineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const localLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#f59e0b",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        linewidth: 1.5,
      }),
    []
  );

  const edgeLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#10b981",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        linewidth: 2.5,
      }),
    []
  );

  const cloudLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#8b5cf6",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        linewidth: 1.5,
      }),
    []
  );

  const localLine = useMemo(
    () => new THREE.Line(localLineGeo, localLineMat),
    [localLineGeo, localLineMat]
  );
  const edgeLine = useMemo(
    () => new THREE.Line(edgeLineGeo, edgeLineMat),
    [edgeLineGeo, edgeLineMat]
  );
  const cloudLine = useMemo(
    () => new THREE.Line(cloudLineGeo, cloudLineMat),
    [cloudLineGeo, cloudLineMat]
  );

  // 7. Streaming Quanta Particles along Selected Path (EDGE)
  const [quantaGeo, quantaMat] = useMemo(() => {
    const count = 16;
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: "#34d399",
      size: 0.046,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return [geo, mat];
  }, []);

  // Selection Halo Geometry (matched to enlarged server footprint)
  const haloGeo = useMemo(() => new THREE.RingGeometry(0.55, 0.64, 32), []);
  const edgeHaloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#34d399",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Frame Update Loop
  useFrame((state) => {
    const fullP = Math.max(scrollState.visualProgress, 0);
    const t = state.clock.getElapsedTime();

    // ==================================================
    // 1. REVEAL ENVELOPE (1.10 -> 1.18)
    // Smoothly emerges as Cloud -> Decision cosmic travel culminates
    // ==================================================
    const revealT = smoothstep(1.10, 1.18, fullP);

    if (revealT <= 0.001) {
      if (rootGroupRef.current) rootGroupRef.current.visible = false;
      return;
    }

    if (rootGroupRef.current) rootGroupRef.current.visible = true;

    // ==================================================
    // ==================================================
    // 2. EVALUATION & SIMULATION MODE DETECTION
    // Phase 10: 1.20 -> 1.34 evaluated baseline
    // Phase 11.1: >= 1.40 dynamic simulated offloading
    // ==================================================
    const evalT = smoothstep(1.20, 1.34, fullP);
    const syncPulse = Math.sin(t * 3.6);

    const isSimMode = fullP >= 1.40;
    const currentDecision = isSimMode
      ? simulationStore.getDecision()
      : decisionResult;

    const activeTarget = currentDecision.selectedTarget;
    const isEdgeSelected = activeTarget === "edge";
    const isLocalSelected = activeTarget === "local";
    const isCloudSelected = activeTarget === "cloud";

    // Pacing: 0.20-0.40 candidate layout settles into open research configuration (p: 1.47 -> 1.54)
    const simLayoutT = smoothstep(1.47, 1.54, fullP);

    // Subtle micro-floating for analytical liveliness + open test configuration in simulation
    if (localNodeRef.current) {
      localNodeRef.current.position.y =
        localPos.y + Math.sin(t * 1.5 + 1.0) * 0.012 + simLayoutT * 0.16;
      localNodeRef.current.position.z = localPos.z + simLayoutT * 0.05;
    }
    if (edgeNodeRef.current) {
      edgeNodeRef.current.position.x = edgePos.x - simLayoutT * 0.28;
      edgeNodeRef.current.position.y =
        edgePos.y + Math.sin(t * 1.6 + 2.0) * 0.015 - simLayoutT * 0.06;
    }
    if (cloudNodeRef.current) {
      cloudNodeRef.current.position.x = cloudPos.x + simLayoutT * 0.35;
      cloudNodeRef.current.position.y =
        cloudPos.y + Math.sin(t * 1.4 + 3.0) * 0.012 - simLayoutT * 0.06;
    }

    // Dynamic Tablet OLED Screen live redraw during simulation
    if (isSimMode && tabletCanvasRef.current && tabletTextureRef.current) {
      const dev = simulationStore.getState().device;
      const score = currentDecision.candidateScores.local.score;
      const key = `${dev.cpuAvailablePct}_${dev.memoryAvailablePct}_${dev.batteryPct}_${dev.latencyMs}_${score}_${isLocalSelected}`;
      if (key !== lastTabletStateRef.current) {
        lastTabletStateRef.current = key;
        const ctx = tabletCanvasRef.current.getContext("2d");
        if (ctx) {
          renderTabletCanvas(ctx, 1024, 640, dev, score, isLocalSelected);
          tabletTextureRef.current.needsUpdate = true;
        }
      }
    }

    // ==================================================
    // 3. PHYSICAL CONNECTIVITY — ANCHORS ON THE MODELS
    // Points on each image where the model itself is (its bounds inside the image)
    // ==================================================
    if (localNodeRef.current) {
      // Bottom center of the tablet
      candidatePoint(LOCAL_VIEW, localNodeRef.current, LOCAL_VIEW.midU, LOCAL_VIEW.minV, localAnchor.current).y += 0.015;
    }

    if (edgeNodeRef.current) {
      // Top center of the server rack, and its base for the selection halo
      candidatePoint(EDGE_VIEW, edgeNodeRef.current, EDGE_VIEW.midU, EDGE_VIEW.maxV, edgeAnchor.current).y -= 0.015;
      candidatePoint(EDGE_VIEW, edgeNodeRef.current, EDGE_VIEW.midU, EDGE_VIEW.minV, edgeBase.current);
    }

    if (cloudNodeRef.current) {
      // Front upper-left entryway of datacenter facing TASK_001
      candidatePoint(CLOUD_VIEW, cloudNodeRef.current, CLOUD_VIEW.minU, CLOUD_VIEW.maxV, cloudAnchor.current);
      cloudAnchor.current.x += 0.12;
      cloudAnchor.current.y -= 0.06;
    }

    // Dynamic Selection Halo Ring repositioning & styling
    if (haloMeshRef.current) {
      edgeHaloMat.opacity =
        (0.25 + evalT * 0.70 + syncPulse * 0.18 * evalT) * revealT;

      if (isEdgeSelected) {
        haloMeshRef.current.position.set(edgeBase.current.x, edgeBase.current.y + 0.01, edgeBase.current.z);
        haloMeshRef.current.scale.setScalar(1.0);
        edgeHaloMat.color.set("#34d399");
      } else if (isLocalSelected) {
        haloMeshRef.current.position.set(
          localAnchor.current.x,
          localAnchor.current.y - 0.22,
          localAnchor.current.z - 0.08
        );
        haloMeshRef.current.scale.setScalar(0.72);
        edgeHaloMat.color.set("#fbbf24");
      } else {
        haloMeshRef.current.position.set(
          cloudAnchor.current.x + 0.20,
          cloudAnchor.current.y - 0.38,
          cloudAnchor.current.z - 0.15
        );
        haloMeshRef.current.scale.setScalar(1.35);
        edgeHaloMat.color.set("#c084fc");
      }
    }

    // Update Local Connection Path
    const localPosAttr = localLineGeo.attributes.position as THREE.BufferAttribute;
    localPosAttr.setXYZ(0, taskTopAnchor.x, taskTopAnchor.y, taskTopAnchor.z);
    localPosAttr.setXYZ(1, localAnchor.current.x, localAnchor.current.y, localAnchor.current.z);
    localPosAttr.needsUpdate = true;

    // Update Edge Connection Path
    const edgePosAttr = edgeLineGeo.attributes.position as THREE.BufferAttribute;
    edgePosAttr.setXYZ(0, taskLeftAnchor.x, taskLeftAnchor.y, taskLeftAnchor.z);
    edgePosAttr.setXYZ(1, edgeAnchor.current.x, edgeAnchor.current.y, edgeAnchor.current.z);
    edgePosAttr.needsUpdate = true;

    // Update Cloud Connection Path
    const cloudPosAttr = cloudLineGeo.attributes.position as THREE.BufferAttribute;
    cloudPosAttr.setXYZ(0, taskRightAnchor.x, taskRightAnchor.y, taskRightAnchor.z);
    cloudPosAttr.setXYZ(1, cloudAnchor.current.x, cloudAnchor.current.y, cloudAnchor.current.z);
    cloudPosAttr.needsUpdate = true;

    // ==================================================
    // 4. STREAMING QUANTA ALONG DYNAMIC SELECTED PATH
    // Streams from TASK_001 anchor to the winning candidate anchor
    // ==================================================
    if (quantaRef.current) {
      quantaMat.opacity = evalT * 0.95 * revealT;

      if (isEdgeSelected) {
        quantaMat.color.set("#34d399");
      } else if (isLocalSelected) {
        quantaMat.color.set("#fbbf24");
      } else {
        quantaMat.color.set("#c084fc");
      }

      const posAttr = quantaGeo.attributes.position as THREE.BufferAttribute;
      const count = 16;
      const startPt = isEdgeSelected
        ? taskLeftAnchor
        : isLocalSelected
        ? taskTopAnchor
        : taskRightAnchor;
      const endPt = isEdgeSelected
        ? edgeAnchor.current
        : isLocalSelected
        ? localAnchor.current
        : cloudAnchor.current;

      for (let i = 0; i < count; i++) {
        const u = (t * 0.85 + i / count) % 1.0;
        const x = THREE.MathUtils.lerp(startPt.x, endPt.x, u);
        const y = THREE.MathUtils.lerp(startPt.y, endPt.y, u);
        const z = THREE.MathUtils.lerp(startPt.z, endPt.z, u);
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // Candidate Evaluation Path Opacities
    localLineMat.opacity =
      (0.35 + (isLocalSelected ? evalT * 0.55 : -evalT * 0.15)) * revealT;
    edgeLineMat.opacity =
      (0.35 + (isEdgeSelected ? evalT * 0.55 : -evalT * 0.15)) * revealT;
    cloudLineMat.opacity =
      (0.35 + (isCloudSelected ? evalT * 0.55 : -evalT * 0.15)) * revealT;

    // Phase 11.2: Smooth Signal Detachment during Transition to /simulation
    const isTrans = transitionStore.getIsTransitioning();
    const transP = isTrans ? transitionStore.getProgress() : 0;
    if (transP > 0.001) {
      const lineFade = 1 - smoothstep(0.00, 0.35, transP);
      localLineMat.opacity *= lineFade;
      edgeLineMat.opacity *= lineFade;
      cloudLineMat.opacity *= lineFade;
      quantaMat.opacity *= lineFade;
      edgeHaloMat.opacity *= lineFade;

    }

    // Holograms: fade in with the reveal, the selected candidate projects brighter,
    // and all fade out during the transition to /simulation.
    const fade = revealT * (1 - smoothstep(0.20, 0.60, transP));
    const emphasis = (selected: boolean) =>
      (0.6 + (selected ? 0.5 * evalT + 0.1 * syncPulse * evalT : -0.15 * evalT)) * fade;
    holo.local.uniforms.uTime.value = t;
    holo.edge.uniforms.uTime.value = t;
    holo.cloud.uniforms.uTime.value = t;
    holo.local.uniforms.uIntensity.value = emphasis(isLocalSelected);
    holo.edge.uniforms.uIntensity.value = emphasis(isEdgeSelected);
    holo.cloud.uniforms.uIntensity.value = emphasis(isCloudSelected);
    if (screenMaterial) screenMaterial.opacity = Math.min(1, emphasis(isLocalSelected) * 1.3);
  });

  return (
    <group ref={rootGroupRef} visible={false}>
      {/* ==================================================
          1. THREE EVALUATION PATHS FROM TASK_001
          Physically connected to model anchors
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
          2. LOCAL CANDIDATE: TABLET (screen drawn live on top)
          ================================================== */}
      <group ref={localNodeRef} position={localPos} scale={0.22}>
        <HologramImage id="decision-local" material={holo.local} screenMaterial={screenMaterial} />
      </group>

      {/* ==================================================
          3. EDGE CANDIDATE: EDGE SERVER RACK
          ================================================== */}
      <group ref={edgeNodeRef} position={edgePos} scale={0.26}>
        <HologramImage id="decision-edge" material={holo.edge} />
      </group>

      {/* Selection Halo Ring at Server Base */}
      <mesh
        ref={haloMeshRef}
        geometry={haloGeo}
        material={edgeHaloMat}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* ==================================================
          4. CLOUD CANDIDATE: CLOUD DATACENTER
          ================================================== */}
      <group ref={cloudNodeRef} position={cloudPos} scale={0.058}>
        <HologramImage id="decision-cloud" material={holo.cloud} />
      </group>
    </group>
  );
}

