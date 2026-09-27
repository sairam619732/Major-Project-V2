// Phase 11.2: Dedicated 3D Simulation Research Canvas
// Independent Three.js canvas & camera composition for the /simulation research laboratory

"use client";

import { useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Points, PointLight, Mesh, MeshBasicMaterial } from "three";
import { simulationStore } from "@/lib/simulation/simulationState";
import { SparseDeepSpaceStars } from "@/components/3d/SparseDeepSpaceStars";

// 2D Canvas Drawer for the 3D Tablet OLED Screen
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

  // Technical grid
  ctx.strokeStyle = "rgba(245, 158, 11, 0.14)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= width; x += 36) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y <= height; y += 36) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  // Border & brackets
  ctx.strokeStyle = isSelected ? "rgba(245, 158, 11, 0.95)" : "rgba(245, 158, 11, 0.65)";
  ctx.lineWidth = isSelected ? 4 : 3;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Title
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 34px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("LOCAL RUNTIME // ON-CHIP NPU", 56, 92);

  // Separator
  ctx.strokeStyle = "rgba(245, 158, 11, 0.40)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(56, 120); ctx.lineTo(width - 56, 120); ctx.stroke();

  // Metrics
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

function Simulation3DScene() {
  const rootRef = useRef<Group>(null);

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
  const haloMatRef = useRef<MeshBasicMaterial>(null);

  // Streaming Quanta Particles along selected path
  const quantaRef = useRef<Points>(null);

  // Dynamic emissive materials
  const tabletEmissivesRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const edgeEmissivesRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const cloudEmissivesRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Tablet dynamic canvas texture
  const tabletCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tabletTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastTabletKeyRef = useRef<string>("");

  // Load Real Assets
  const { scene: tabletScene } = useGLTF("/assets/device/sci_fi_tablet.glb");
  const { scene: edgeScene } = useGLTF("/assets/edge/data_center_rack.glb");
  const { scene: cloudScene } = useGLTF("/assets/cloud/cloud_datacenter_clean.glb");

  // Stable Analytical Coordinates (Centered around TASK_001 at 0, 0, 0)
  const taskPos = useMemo(() => new THREE.Vector3(0.00, 0.00, 0.00), []);
  const localPos = useMemo(() => new THREE.Vector3(0.00, 1.45, 0.00), []);
  const edgePos = useMemo(() => new THREE.Vector3(-1.85, -0.75, 0.00), []);
  const cloudPos = useMemo(() => new THREE.Vector3(1.85, -0.80, 0.00), []);

  // Anchors from TASK_001 outer lattice
  const taskTopAnchor = useMemo(() => new THREE.Vector3(0.00, 0.18, 0.02), []);
  const taskLeftAnchor = useMemo(() => new THREE.Vector3(-0.14, -0.12, 0.02), []);
  const taskRightAnchor = useMemo(() => new THREE.Vector3(0.14, -0.12, 0.02), []);

  // World-space target anchors derived from candidate bounding boxes
  const localAnchor = useRef(new THREE.Vector3(0.00, 1.25, 0.05));
  const edgeAnchor = useRef(new THREE.Vector3(-1.85, -0.42, 0.05));
  const cloudAnchor = useRef(new THREE.Vector3(1.65, -0.45, 0.05));

  const tempBox = useRef(new THREE.Box3());
  const tempCenter = useRef(new THREE.Vector3());

  // High-Resolution Tablet OLED Texture
  const tabletScreenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const initialSim = simulationStore.getState();
    const initialDecision = simulationStore.getDecision();
    renderTabletCanvas(
      ctx,
      canvas.width,
      canvas.height,
      initialSim.device,
      initialDecision.candidateScores.local.score,
      initialDecision.selectedTarget === "local"
    );

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;

    tabletCanvasRef.current = canvas;
    tabletTextureRef.current = tex;
    return tex;
  }, []);

  // Cloned Models with custom materials
  const clonedTablet = useMemo(() => {
    tabletEmissivesRef.current = [];
    const cl = tabletScene.clone(true);
    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const orig = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const mat = (orig as THREE.MeshStandardMaterial).clone();
          mat.envMapIntensity = 1.3;

          const isScreen = mesh.name.toLowerCase().includes("screen");
          if (isScreen && tabletScreenTexture) {
            mat.map = tabletScreenTexture;
            mat.emissiveMap = tabletScreenTexture;
            mat.emissive = new THREE.Color("#ffffff");
            mat.emissiveIntensity = 1.2;
            mat.roughness = 0.10;
            mat.metalness = 0.05;
            tabletEmissivesRef.current.push(mat);
          } else {
            mat.roughness = 0.35;
            mat.metalness = 0.70;
            mat.color = new THREE.Color("#181d29");
          }
          mesh.material = mat;
        }
      }
    });
    return cl;
  }, [tabletScene, tabletScreenTexture]);

  const clonedEdge = useMemo(() => {
    edgeEmissivesRef.current = [];
    const cl = edgeScene.clone(true);
    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const orig = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const mat = (orig as THREE.MeshStandardMaterial).clone();
          mat.envMapIntensity = 1.4;

          if (mat.name === "material") {
            mat.roughness = 0.32;
            mat.metalness = 0.80;
            mat.color = new THREE.Color("#0c1018");
          } else if (mat.name === "Mat_1") {
            mat.transparent = true;
            mat.opacity = 0.18;
            mat.roughness = 0.08;
            mat.metalness = 0.15;
            mat.color = new THREE.Color("#0a0f18");
          } else {
            mat.roughness = 0.25;
            mat.metalness = 0.50;
            mat.color = new THREE.Color("#10b981");
            mat.emissive = new THREE.Color("#05df72");
            mat.emissiveIntensity = 2.4;
            edgeEmissivesRef.current.push(mat);
          }
          mesh.material = mat;
        }
      }
    });
    return cl;
  }, [edgeScene]);

  const clonedCloud = useMemo(() => {
    cloudEmissivesRef.current = [];
    const cl = cloudScene.clone(true);
    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const orig = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const mat = (orig as THREE.MeshStandardMaterial).clone();
          mat.envMapIntensity = 1.3;

          const isEmissive =
            (mat.emissive && mat.emissive.getHex() > 0) ||
            (mat.name && mat.name.toUpperCase().includes("EMISSIVE")) ||
            (mesh.name && mesh.name.toUpperCase().includes("EMISSIVE"));

          if (isEmissive) {
            mat.color = new THREE.Color("#a855f7");
            mat.emissive = new THREE.Color("#8b5cf6");
            mat.emissiveIntensity = 1.6;
            cloudEmissivesRef.current.push(mat);
          } else {
            mat.roughness = 0.35;
            mat.metalness = 0.70;
            mat.color = new THREE.Color("#0c0f1d");
          }
          mesh.material = mat;
        }
      }
    });
    return cl;
  }, [cloudScene]);

  // Connection Lines
  const localLineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return geo;
  }, []);
  const edgeLineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return geo;
  }, []);
  const cloudLineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return geo;
  }, []);

  const localLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#f59e0b",
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  const edgeLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#10b981",
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  const cloudLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#8b5cf6",
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const localLine = useMemo(() => new THREE.Line(localLineGeo, localLineMat), [localLineGeo, localLineMat]);
  const edgeLine = useMemo(() => new THREE.Line(edgeLineGeo, edgeLineMat), [edgeLineGeo, edgeLineMat]);
  const cloudLine = useMemo(() => new THREE.Line(cloudLineGeo, cloudLineMat), [cloudLineGeo, cloudLineMat]);

  // Quanta streaming points
  const [quantaGeo, quantaMat] = useMemo(() => {
    const count = 16;
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: "#34d399",
      size: 0.046,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return [geo, mat];
  }, []);

  // Selection Halo Ring
  const haloGeo = useMemo(() => new THREE.RingGeometry(0.48, 0.58, 32), []);
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#34d399",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // TASK_001 Center Components
  const taskCoreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#0284c7",
        emissiveIntensity: 2.6,
        roughness: 0.15,
        metalness: 0.8,
      }),
    []
  );
  const taskCageMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#38bdf8",
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      }),
    []
  );
  const taskRingMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#7dd3fc",
        wireframe: true,
        transparent: true,
        opacity: 0.75,
      }),
    []
  );

  // Frame Loop (Live reactive Three.js rendering)
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const syncPulse = Math.sin(t * 3.6);

    // Read live decision synchronously from reactive store
    const simDecision = simulationStore.getDecision();
    const activeTarget = simDecision.selectedTarget;

    const isEdgeSelected = activeTarget === "edge";
    const isLocalSelected = activeTarget === "local";
    const isCloudSelected = activeTarget === "cloud";

    // Subtle breathing / micro-hover for candidate nodes
    if (localNodeRef.current) {
      localNodeRef.current.position.y = localPos.y + Math.sin(t * 1.5 + 1.0) * 0.012;
    }
    if (edgeNodeRef.current) {
      edgeNodeRef.current.position.y = edgePos.y + Math.sin(t * 1.6 + 2.0) * 0.014;
    }
    if (cloudNodeRef.current) {
      cloudNodeRef.current.position.y = cloudPos.y + Math.sin(t * 1.4 + 3.0) * 0.012;
    }

    // Dynamic Tablet OLED Redraw
    if (tabletCanvasRef.current && tabletTextureRef.current) {
      const dev = simulationStore.getState().device;
      const score = simDecision.candidateScores.local.score;
      const key = `${dev.cpuAvailablePct}_${dev.memoryAvailablePct}_${dev.batteryPct}_${dev.latencyMs}_${score}_${isLocalSelected}`;
      if (key !== lastTabletKeyRef.current) {
        lastTabletKeyRef.current = key;
        const ctx = tabletCanvasRef.current.getContext("2d");
        if (ctx) {
          renderTabletCanvas(ctx, 1024, 640, dev, score, isLocalSelected);
          tabletTextureRef.current.needsUpdate = true;
        }
      }
    }

    // Physical Connectivity: Derives surface anchors from bounding boxes
    if (localNodeRef.current) {
      localNodeRef.current.updateWorldMatrix(true, false);
      tempBox.current.setFromObject(localNodeRef.current);
      tempBox.current.getCenter(tempCenter.current);
      localAnchor.current.set(tempCenter.current.x, tempBox.current.min.y + 0.015, tempBox.current.max.z + 0.015);
    }
    if (edgeNodeRef.current) {
      edgeNodeRef.current.updateWorldMatrix(true, false);
      tempBox.current.setFromObject(edgeNodeRef.current);
      tempBox.current.getCenter(tempCenter.current);
      edgeAnchor.current.set(tempCenter.current.x, tempBox.current.max.y - 0.015, tempBox.current.max.z + 0.015);
    }
    if (cloudNodeRef.current) {
      cloudNodeRef.current.updateWorldMatrix(true, false);
      tempBox.current.setFromObject(cloudNodeRef.current);
      tempBox.current.getCenter(tempCenter.current);
      cloudAnchor.current.set(tempBox.current.min.x + 0.12, tempBox.current.max.y - 0.06, tempBox.current.max.z - 0.02);
    }

    // Update Evaluation Lines
    const localAttr = localLineGeo.attributes.position as THREE.BufferAttribute;
    localAttr.setXYZ(0, taskTopAnchor.x, taskTopAnchor.y, taskTopAnchor.z);
    localAttr.setXYZ(1, localAnchor.current.x, localAnchor.current.y, localAnchor.current.z);
    localAttr.needsUpdate = true;

    const edgeAttr = edgeLineGeo.attributes.position as THREE.BufferAttribute;
    edgeAttr.setXYZ(0, taskLeftAnchor.x, taskLeftAnchor.y, taskLeftAnchor.z);
    edgeAttr.setXYZ(1, edgeAnchor.current.x, edgeAnchor.current.y, edgeAnchor.current.z);
    edgeAttr.needsUpdate = true;

    const cloudAttr = cloudLineGeo.attributes.position as THREE.BufferAttribute;
    cloudAttr.setXYZ(0, taskRightAnchor.x, taskRightAnchor.y, taskRightAnchor.z);
    cloudAttr.setXYZ(1, cloudAnchor.current.x, cloudAnchor.current.y, cloudAnchor.current.z);
    cloudAttr.needsUpdate = true;

    // Line Opacities: Selected path highlighted, unselected subdued
    localLineMat.opacity = isLocalSelected ? 0.85 : 0.28;
    edgeLineMat.opacity = isEdgeSelected ? 0.85 : 0.28;
    cloudLineMat.opacity = isCloudSelected ? 0.85 : 0.28;

    // Streaming Quanta Particles
    if (quantaRef.current) {
      if (isEdgeSelected) {
        quantaMat.color.set("#34d399");
      } else if (isLocalSelected) {
        quantaMat.color.set("#fbbf24");
      } else {
        quantaMat.color.set("#c084fc");
      }

      const posAttr = quantaGeo.attributes.position as THREE.BufferAttribute;
      const count = 16;
      const startPt = isEdgeSelected ? taskLeftAnchor : isLocalSelected ? taskTopAnchor : taskRightAnchor;
      const endPt = isEdgeSelected ? edgeAnchor.current : isLocalSelected ? localAnchor.current : cloudAnchor.current;

      for (let i = 0; i < count; i++) {
        const u = (t * 0.85 + i / count) % 1.0;
        posAttr.setXYZ(
          i,
          THREE.MathUtils.lerp(startPt.x, endPt.x, u),
          THREE.MathUtils.lerp(startPt.y, endPt.y, u),
          THREE.MathUtils.lerp(startPt.z, endPt.z, u)
        );
      }
      posAttr.needsUpdate = true;
    }

    // Dynamic Halo Ring
    if (haloMeshRef.current) {
      if (isEdgeSelected) {
        haloMeshRef.current.position.set(edgeAnchor.current.x, edgePos.y - 0.52, edgeAnchor.current.z);
        haloMeshRef.current.scale.setScalar(1.0);
        haloMat.color.set("#34d399");
      } else if (isLocalSelected) {
        haloMeshRef.current.position.set(localAnchor.current.x, localPos.y - 0.26, localAnchor.current.z);
        haloMeshRef.current.scale.setScalar(0.72);
        haloMat.color.set("#fbbf24");
      } else {
        haloMeshRef.current.position.set(cloudAnchor.current.x + 0.15, cloudPos.y - 0.40, cloudAnchor.current.z);
        haloMeshRef.current.scale.setScalar(1.35);
        haloMat.color.set("#c084fc");
      }
      haloMat.opacity = 0.65 + syncPulse * 0.20;
    }

    // Dynamic Emissive Lighting for Candidates
    const edgeIntensity = isEdgeSelected ? 3.4 + syncPulse * 0.5 : 1.2;
    for (let i = 0; i < edgeEmissivesRef.current.length; i++) {
      edgeEmissivesRef.current[i].emissiveIntensity = edgeIntensity;
    }
    if (edgePulseLightRef.current) {
      edgePulseLightRef.current.intensity = isEdgeSelected ? 3.2 + syncPulse * 0.6 : 0.8;
    }

    const localIntensity = isLocalSelected ? 2.8 + syncPulse * 0.4 : 1.1;
    for (let i = 0; i < tabletEmissivesRef.current.length; i++) {
      tabletEmissivesRef.current[i].emissiveIntensity = localIntensity;
    }
    if (localLightRef.current) {
      localLightRef.current.intensity = isLocalSelected ? 2.6 + syncPulse * 0.4 : 0.6;
    }

    const cloudIntensity = isCloudSelected ? 2.8 + syncPulse * 0.4 : 1.1;
    for (let i = 0; i < cloudEmissivesRef.current.length; i++) {
      cloudEmissivesRef.current[i].emissiveIntensity = cloudIntensity;
    }
    if (cloudLightRef.current) {
      cloudLightRef.current.intensity = isCloudSelected ? 2.6 + syncPulse * 0.4 : 0.6;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      {/* 1. Evaluation Paths */}
      <primitive object={localLine} />
      <primitive object={edgeLine} />
      <primitive object={cloudLine} />

      {/* Streaming Quanta */}
      <points ref={quantaRef} geometry={quantaGeo} material={quantaMat} />

      {/* Selection Halo Ring */}
      <mesh ref={haloMeshRef} geometry={haloGeo} material={haloMat} rotation={[-Math.PI / 2, 0, 0]} />

      {/* 2. TASK_001 Center Visual */}
      <group position={taskPos}>
        {/* Core Diamond */}
        <mesh material={taskCoreMat}>
          <octahedronGeometry args={[0.15, 0]} />
        </mesh>
        {/* Wireframe Cage */}
        <mesh material={taskCageMat} scale={1.32}>
          <icosahedronGeometry args={[0.16, 0]} />
        </mesh>
        {/* Orbital Ring */}
        <mesh material={taskRingMat} rotation={[0.4, 0.2, 0]}>
          <ringGeometry args={[0.26, 0.27, 32]} />
        </mesh>
        <pointLight color="#38bdf8" intensity={2.6} distance={3.8} />
      </group>

      {/* 3. LOCAL Candidate: Real Tablet GLB */}
      <group ref={localNodeRef} position={localPos} scale={0.34} rotation={[0.08, -0.04, 0.0]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <primitive object={clonedTablet} />
        </group>
        <pointLight ref={localLightRef} color="#f59e0b" distance={3.5} intensity={0.7} position={[0, 0.1, 0.4]} />
      </group>

      {/* 4. EDGE Candidate: Real Edge Server GLB */}
      <group ref={edgeNodeRef} position={edgePos} scale={0.28} rotation={[0.08, -1.75, 0.0]}>
        <primitive object={clonedEdge} position={[0, -1.157, 0]} />
        <pointLight ref={edgePulseLightRef} color="#10f08e" distance={4.8} intensity={3.2} position={[0.60, 0.15, 0.0]} />
      </group>

      {/* 5. CLOUD Candidate: Real Datacenter GLB */}
      <group ref={cloudNodeRef} position={cloudPos} scale={0.038} rotation={[0.03, -1.15, 0.0]}>
        <primitive object={clonedCloud} />
        <pointLight ref={cloudLightRef} color="#8b5cf6" distance={3.6} intensity={0.8} position={[0, 1.4, 0]} />
      </group>
    </group>
  );
}

export function SimulationSceneCanvas() {
  return (
    <div className="w-full h-full min-h-[500px]">
      <Canvas
        camera={{ position: [0.0, 0.05, 4.3], fov: 46 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: true,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#02040A"]} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.45} color="#0c1322" />
        <directionalLight position={[4, 5, 4]} intensity={1.35} color="#f8fafc" />
        <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#0284c7" />

        {/* Deep Space Background Stars */}
        <SparseDeepSpaceStars />

        {/* Simulation 3D Environment */}
        <Simulation3DScene />
      </Canvas>
    </div>
  );
}

// Preload GLB assets
useGLTF.preload("/assets/device/sci_fi_tablet.glb");
useGLTF.preload("/assets/edge/data_center_rack.glb");
useGLTF.preload("/assets/cloud/cloud_datacenter_clean.glb");
