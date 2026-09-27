// Phase 10.2.2: Fix Decision Asset Orientation, Scale, Framing, and Physical Connectivity
//
// 1. LOCAL TABLET: Correct orientation with upright screen facing camera via [Math.PI/2, 0, 0]
// 2. EDGE SERVER: Substantially enlarged (~2.7x) with front-facing server blades & emerald LEDs
// 3. CLOUD DATACENTER: Balanced footprint with isometric orientation
// 4. PHYSICAL CONNECTIVITY: Dynamically derives exact world-space anchor points from candidate bounding boxes
//    Lines and streaming quanta physically touch the model surfaces without empty space or gaps.

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Points, PointLight, MeshBasicMaterial, Mesh } from "three";
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

  // Candidate Node Groups
  const localNodeRef = useRef<Group>(null);
  const edgeNodeRef = useRef<Group>(null);
  const cloudNodeRef = useRef<Group>(null);

  // Candidate Lights
  const localLightRef = useRef<PointLight>(null);
  const edgePulseLightRef = useRef<PointLight>(null);
  const cloudLightRef = useRef<PointLight>(null);

  // Halo Mesh Ref
  const haloMeshRef = useRef<Mesh>(null);
  const edgeHaloMatRef = useRef<MeshBasicMaterial>(null);

  // Streaming Quanta Particles along the selected path
  const quantaRef = useRef<Points>(null);

  // Track dynamic emissive materials for each real candidate asset
  const tabletEmissivesRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const edgeEmissivesRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const cloudEmissivesRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // 1. Load Authentic GLB Assets (cached in memory from earlier sections)
  const { scene: tabletScene } = useGLTF("/assets/device/sci_fi_tablet.glb");
  const { scene: edgeScene } = useGLTF("/assets/edge/data_center_rack.glb");
  const { scene: cloudScene } = useGLTF("/assets/cloud/cloud_datacenter_clean.glb");

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
  const decisionCenter = useMemo(() => new THREE.Vector3(26.00, 0.40, 0.00), []);

  // Balanced Triangular Constellation (Phase 10.2.2):
  // LOCAL: Upper-center, upright with front OLED screen facing camera
  // EDGE: Lower-left, front server face visible, substantially enlarged
  // CLOUD: Lower-right, 3/4 isometric orientation
  const localPos = useMemo(() => new THREE.Vector3(26.00, 1.70, 0.00), []);
  const edgePos = useMemo(() => new THREE.Vector3(24.25, -0.55, 0.00), []);
  const cloudPos = useMemo(() => new THREE.Vector3(27.65, -0.65, 0.00), []);

  // Distinct Anchors originating from TASK_001's outer lattice vertices
  const taskTopAnchor = useMemo(() => new THREE.Vector3(26.00, 0.58, 0.02), []);
  const taskLeftAnchor = useMemo(() => new THREE.Vector3(25.86, 0.28, 0.02), []);
  const taskRightAnchor = useMemo(() => new THREE.Vector3(26.14, 0.28, 0.02), []);

  // Dynamic World-Space Target Anchors (computed every frame from bounding boxes)
  const localAnchor = useRef(new THREE.Vector3(26.00, 1.48, 0.05));
  const edgeAnchor = useRef(new THREE.Vector3(24.25, -0.22, 0.05));
  const cloudAnchor = useRef(new THREE.Vector3(27.40, -0.25, 0.05));

  // Scratch objects for zero-allocation per-frame bounding box calculations
  const tempBox = useRef(new THREE.Box3());
  const tempCenter = useRef(new THREE.Vector3());

  // 4. High-Resolution Tablet OLED Screen Texture (Amber Identity)
  const tabletScreenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Dark OLED amber background
    ctx.fillStyle = "#0c0803";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fine technical grid
    ctx.strokeStyle = "rgba(245, 158, 11, 0.14)";
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= canvas.width; x += 36) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 36) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Outer border & technical corner brackets
    ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

    // Title / Architecture
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 34px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText("LOCAL RUNTIME // ON-CHIP NPU", 56, 92);

    // Separator line
    ctx.strokeStyle = "rgba(245, 158, 11, 0.40)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(56, 120);
    ctx.lineTo(canvas.width - 56, 120);
    ctx.stroke();

    // Metrics (High-contrast legible telemetry)
    ctx.fillStyle = "rgba(253, 230, 138, 0.95)";
    ctx.font = "bold 30px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText(`CPU AVAIL:  ${DEFAULT_DEVICE.cpuAvailablePct}%`, 56, 190);
    ctx.fillText(`MEM AVAIL:  ${DEFAULT_DEVICE.memoryAvailablePct}%`, 56, 260);

    ctx.fillStyle = "#f59e0b";
    ctx.fillText(`BATTERY:    ${DEFAULT_DEVICE.batteryPct}% [DRAIN RISK]`, 56, 330);

    ctx.fillStyle = "rgba(253, 230, 138, 0.95)";
    ctx.fillText(`LATENCY:    ${DEFAULT_DEVICE.latencyMs} MS`, 56, 400);

    // Cost Score
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 32px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText(`COST SCORE: ${decisionResult.candidateScores.local.score}`, 56, 480);

    // Status footer
    ctx.fillStyle = "rgba(245, 158, 11, 0.85)";
    ctx.font = "24px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText("STATUS: EVALUATION CANDIDATE · UNSELECTED", 56, 570);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    return tex;
  }, [decisionResult.candidateScores.local.score]);

  // 5. Cloned & Isolated Models
  // 5A. Cloned Compact Tablet (LOCAL - Front screen configured)
  const clonedTablet = useMemo(() => {
    tabletEmissivesRef.current = [];
    const cl = tabletScene.clone(true);

    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const mat = (origMat as THREE.MeshStandardMaterial).clone();
          mat.envMapIntensity = 1.3;

          const isScreen = mesh.name.toLowerCase().includes("screen");
          if (isScreen && tabletScreenTexture) {
            mat.map = tabletScreenTexture;
            mat.emissiveMap = tabletScreenTexture;
            mat.emissive = new THREE.Color("#ffffff");
            mat.emissiveIntensity = 1.2;
            mat.roughness = 0.10;
            mat.metalness = 0.05;
            mat.needsUpdate = true;
            tabletEmissivesRef.current.push(mat);
          } else {
            mat.roughness = 0.35;
            mat.metalness = 0.70;
            mat.color = new THREE.Color("#181d29");
            mat.needsUpdate = true;
          }
          mesh.material = mat;
        }
      }
    });

    return cl;
  }, [tabletScene, tabletScreenTexture]);

  // 5B. Cloned Compact Edge Server (EDGE - Substantially enlarged)
  const clonedEdge = useMemo(() => {
    edgeEmissivesRef.current = [];
    const cl = edgeScene.clone(true);

    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const mat = (origMat as THREE.MeshStandardMaterial).clone();
          mat.envMapIntensity = 1.4;

          // Chassis body: deep space dark metallic finish
          if (mat.name === "material") {
            mat.roughness = 0.32;
            mat.metalness = 0.80;
            mat.color = new THREE.Color("#0c1018");
            mat.needsUpdate = true;
          }
          // Acrylic door: clear transparent
          else if (mat.name === "Mat_1") {
            mat.transparent = true;
            mat.opacity = 0.18;
            mat.roughness = 0.08;
            mat.metalness = 0.15;
            mat.color = new THREE.Color("#0a0f18");
            mat.needsUpdate = true;
          }
          // Status indicators & LEDs: Emerald accent
          else {
            mat.roughness = 0.25;
            mat.metalness = 0.50;
            mat.color = new THREE.Color("#10b981");
            mat.emissive = new THREE.Color("#05df72");
            mat.emissiveIntensity = 2.4;
            mat.needsUpdate = true;
            edgeEmissivesRef.current.push(mat);
          }
          mesh.material = mat;
        }
      }
    });

    return cl;
  }, [edgeScene]);

  // 5C. Cloned Compact Cloud Datacenter (CLOUD - Visual balance)
  const clonedCloud = useMemo(() => {
    cloudEmissivesRef.current = [];
    const cl = cloudScene.clone(true);

    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const mat = (origMat as THREE.MeshStandardMaterial).clone();
          mat.envMapIntensity = 1.3;

          const isEmissive =
            (mat.emissive && mat.emissive.getHex() > 0) ||
            (mat.name && mat.name.toUpperCase().includes("EMISSIVE")) ||
            (mesh.name && mesh.name.toUpperCase().includes("EMISSIVE"));

          if (isEmissive) {
            mat.color = new THREE.Color("#a855f7");
            mat.emissive = new THREE.Color("#8b5cf6");
            mat.emissiveIntensity = 1.6;
            mat.needsUpdate = true;
            cloudEmissivesRef.current.push(mat);
          } else {
            mat.roughness = 0.35;
            mat.metalness = 0.70;
            mat.color = new THREE.Color("#0c0f1d");
            mat.needsUpdate = true;
          }
          mesh.material = mat;
        }
      }
    });

    return cl;
  }, [cloudScene]);

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
    // 2. EVALUATION PROGRESS (1.20 -> 1.34)
    // Transitions candidate assets from standby to evaluated selection state
    // ==================================================
    const evalT = smoothstep(1.20, 1.34, fullP);
    const syncPulse = Math.sin(t * 3.6);

    // Subtle micro-floating for analytical liveliness
    if (localNodeRef.current) {
      localNodeRef.current.position.y = localPos.y + Math.sin(t * 1.5 + 1.0) * 0.012;
    }
    if (edgeNodeRef.current) {
      edgeNodeRef.current.position.y = edgePos.y + Math.sin(t * 1.6 + 2.0) * 0.015;
    }
    if (cloudNodeRef.current) {
      cloudNodeRef.current.position.y = cloudPos.y + Math.sin(t * 1.4 + 3.0) * 0.012;
    }

    // ==================================================
    // 3. PHYSICAL CONNECTIVITY — DYNAMIC ANCHOR EXTRACTION
    // Derives visible surface anchors directly from the candidate transformed bounding boxes
    // ==================================================
    if (localNodeRef.current) {
      localNodeRef.current.updateWorldMatrix(true, false);
      tempBox.current.setFromObject(localNodeRef.current);
      tempBox.current.getCenter(tempCenter.current);
      // Bottom center of the front tablet face
      localAnchor.current.set(
        tempCenter.current.x,
        tempBox.current.min.y + 0.015,
        tempBox.current.max.z + 0.015
      );
    }

    if (edgeNodeRef.current) {
      edgeNodeRef.current.updateWorldMatrix(true, false);
      tempBox.current.setFromObject(edgeNodeRef.current);
      tempBox.current.getCenter(tempCenter.current);
      // Top center of the front server rack
      edgeAnchor.current.set(
        tempCenter.current.x,
        tempBox.current.max.y - 0.015,
        tempBox.current.max.z + 0.015
      );
      if (haloMeshRef.current) {
        haloMeshRef.current.position.set(
          tempCenter.current.x,
          tempBox.current.min.y + 0.01,
          tempCenter.current.z
        );
      }
    }

    if (cloudNodeRef.current) {
      cloudNodeRef.current.updateWorldMatrix(true, false);
      tempBox.current.setFromObject(cloudNodeRef.current);
      tempBox.current.getCenter(tempCenter.current);
      // Front upper-left entryway of datacenter facing TASK_001
      cloudAnchor.current.set(
        tempBox.current.min.x + 0.12,
        tempBox.current.max.y - 0.06,
        tempBox.current.max.z - 0.02
      );
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
    // 4. STREAMING QUANTA ALONG SELECTED PATH (EDGE)
    // Streams directly from TASK_001 anchor to Edge anchor
    // ==================================================
    const isEdgeSelected = decisionResult.selectedTarget === "edge";
    const isLocalSelected = decisionResult.selectedTarget === "local";
    const isCloudSelected = decisionResult.selectedTarget === "cloud";

    if (quantaRef.current) {
      quantaMat.opacity = evalT * 0.95 * revealT;
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

    // Dynamic Emissive Lighting for Real Assets
    // EDGE (Selected Candidate in demo state)
    const edgeIntensity =
      (2.0 + (isEdgeSelected ? evalT * 2.0 + syncPulse * 0.45 * evalT : -evalT * 0.9)) *
      revealT;
    for (let i = 0; i < edgeEmissivesRef.current.length; i++) {
      edgeEmissivesRef.current[i].emissiveIntensity = edgeIntensity;
    }

    if (edgePulseLightRef.current) {
      edgePulseLightRef.current.intensity =
        (1.2 + (isEdgeSelected ? evalT * 3.0 + syncPulse * 0.6 * evalT : -evalT * 0.4)) *
        revealT;
    }
    edgeHaloMat.opacity =
      (isEdgeSelected ? 0.25 + evalT * 0.70 + syncPulse * 0.18 * evalT : 0) * revealT;

    // LOCAL (Unselected Candidate - Subdued but clearly visible)
    const localIntensity =
      (1.4 + (isLocalSelected ? evalT * 1.6 : -evalT * 0.75)) * revealT;
    for (let i = 0; i < tabletEmissivesRef.current.length; i++) {
      tabletEmissivesRef.current[i].emissiveIntensity = localIntensity;
    }
    if (localLightRef.current) {
      localLightRef.current.intensity =
        (0.6 + (isLocalSelected ? evalT * 1.6 : -evalT * 0.25)) * revealT;
    }

    // CLOUD (Unselected Candidate - Subdued but clearly visible)
    const cloudIntensity =
      (1.4 + (isCloudSelected ? evalT * 1.6 : -evalT * 0.75)) * revealT;
    for (let i = 0; i < cloudEmissivesRef.current.length; i++) {
      cloudEmissivesRef.current[i].emissiveIntensity = cloudIntensity;
    }
    if (cloudLightRef.current) {
      cloudLightRef.current.intensity =
        (0.6 + (isCloudSelected ? evalT * 1.6 : -evalT * 0.25)) * revealT;
    }

    // Candidate Evaluation Path Opacities
    localLineMat.opacity =
      (0.38 + (isLocalSelected ? evalT * 0.50 : -evalT * 0.20)) * revealT;
    edgeLineMat.opacity =
      (0.42 + (isEdgeSelected ? evalT * 0.56 : -evalT * 0.20)) * revealT;
    cloudLineMat.opacity =
      (0.38 + (isCloudSelected ? evalT * 0.50 : -evalT * 0.20)) * revealT;
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
          2. LOCAL CANDIDATE: REAL TABLET GLB (Upright Front Screen)
          ================================================== */}
      <group
        ref={localNodeRef}
        position={localPos}
        scale={0.30}
        rotation={[0.10, -0.04, 0.0]}
      >
        {/* Inner group brings the model from X-Z plane into upright orientation with screen facing camera */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <primitive object={clonedTablet} />
        </group>
        <pointLight
          ref={localLightRef}
          color="#f59e0b"
          distance={3.2}
          intensity={0.6}
          position={[0, 0.1, 0.4]}
        />
      </group>

      {/* ==================================================
          3. EDGE CANDIDATE: REAL EDGE SERVER GLB (Enlarged ~2.7x · Front-Facing)
          ================================================== */}
      <group
        ref={edgeNodeRef}
        position={edgePos}
        scale={0.26}
        rotation={[0.08, -1.75, 0.0]}
      >
        <primitive object={clonedEdge} position={[0, -1.157, 0]} />
        <pointLight
          ref={edgePulseLightRef}
          color="#10f08e"
          distance={4.8}
          intensity={2.8}
          position={[0.60, 0.15, 0.0]}
        />
        <pointLight
          color="#05df72"
          distance={3.5}
          intensity={1.8}
          position={[0.55, 0.70, 0.0]}
        />
      </group>

      {/* Selection Halo Ring at Server Base */}
      <mesh
        ref={haloMeshRef}
        geometry={haloGeo}
        material={edgeHaloMat}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* ==================================================
          4. CLOUD CANDIDATE: REAL CLOUD DATACENTER GLB (Balanced)
          ================================================== */}
      <group
        ref={cloudNodeRef}
        position={cloudPos}
        scale={0.036}
        rotation={[0.03, -1.15, 0.0]}
      >
        <primitive object={clonedCloud} />
        <pointLight
          ref={cloudLightRef}
          color="#8b5cf6"
          distance={3.4}
          intensity={0.7}
          position={[0, 1.4, 0]}
        />
      </group>
    </group>
  );
}

// Preload authentic 3D GLB assets for zero-latency instantiation
useGLTF.preload("/assets/device/sci_fi_tablet.glb");
useGLTF.preload("/assets/edge/data_center_rack.glb");
useGLTF.preload("/assets/cloud/cloud_datacenter_clean.glb");
