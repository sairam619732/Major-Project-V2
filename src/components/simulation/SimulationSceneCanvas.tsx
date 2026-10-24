"use client";

/* eslint-disable react-hooks/immutability -- R3F owns these mutable Three.js objects; frame callbacks update GPU resources without React renders. */

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { simulationStore } from "@/lib/simulation/simulationState";
import { SparseDeepSpaceStars } from "@/components/3d/SparseDeepSpaceStars";
import { AdaptiveQuality, canvasQuality, useInView } from "@/lib/three/renderQuality";
import { createHologramScreenMaterial } from "@/lib/three/hologram";
import { HOLOGRAM_VIEWS, viewPoint, viewQuaternion } from "@/lib/three/hologramViews";
import { HologramImage, useHologramImage } from "@/components/3d/HologramImage";
import { SimulationEdgeTelemetryOverlay, SimulationCloudTelemetryOverlay } from "@/components/simulation/SimulationTelemetryOverlays";

type Target = "local" | "edge" | "cloud";
const COLORS = { local: "#38bdf8", edge: "#34d399", cloud: "#a78bfa" };
// Model images come from /dev/hologram-bake (views sim-local / sim-edge / sim-cloud).
const MODELS = {
  local: { position: [0, 2.05, 0] },
  edge: { position: [-1, -1.25, 0] },
  cloud: { position: [1, -1.25, 0] },
} satisfies Record<Target, { position: [number, number, number] }>;
const TASK = new THREE.Vector3(0, .25, .5);


// World-space extent of the topology, including labels (tablet label at y=3, rack labels at y=-2.7).
// Decrease these to increase visual scale (zoom in).
const VIEW_WIDTH = 7.6;
const VIEW_HEIGHT = 6.6;
const VIEW_CENTER_Y = 0.15;
const pixelsPerUnitFor = (size: { width: number; height: number }) =>
  Math.min(size.width / VIEW_WIDTH, size.height / VIEW_HEIGHT);

// Edge/cloud sit at ±spread on x (MODELS x is only the sign). Wide canvases get more spacing,
// leaving room for the telemetry cards pinned beside each model.
const MIN_SPREAD = 2.2;
const MAX_SPREAD = 3.6;
const EDGE_HALF_WIDTH = 0.75;
const CLOUD_HALF_WIDTH = 1.4;
const CARD_WIDTH_PX = 160;
const CARD_GAP_PX = 20;

function sceneLayout(size: { width: number; height: number }) {
  const ppu = pixelsPerUnitFor(size);
  if (!ppu) return { ppu, spread: MIN_SPREAD, showCards: false };
  const room = size.width / ppu / 2 - CLOUD_HALF_WIDTH - (CARD_WIDTH_PX + CARD_GAP_PX + 12) / ppu;
  return { ppu, spread: THREE.MathUtils.clamp(room, MIN_SPREAD, MAX_SPREAD), showCards: room >= MIN_SPREAD };
}

function FitCamera() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    // Fit the whole topology, including labels, to either canvas dimension.
    ortho.zoom = pixelsPerUnitFor(size);
    ortho.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Label({ children, color = "#94a3b8" }: { children: React.ReactNode; color?: string }) {
  const { size } = useThree();
  // Match the existing labels under FitCamera's orthographic framing.
  const pixelsPerUnit = pixelsPerUnitFor(size);
  return (
    <Text
      font="/fonts/GeistMono-Medium.ttf"
      fontSize={12 / pixelsPerUnit}
      letterSpacing={0.14}
      anchorX="center"
      anchorY="middle"
      color={color}
      raycast={() => null}
      material-toneMapped={false}
      material-depthTest={false}
      renderOrder={10}
    >
      {children}
    </Text>
  );
}

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
  ctx.strokeStyle = "rgba(56, 189, 248, 0.14)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= width; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Border & brackets
  ctx.strokeStyle = isSelected ? "rgba(56, 189, 248, 0.95)" : "rgba(56, 189, 248, 0.65)";
  ctx.lineWidth = isSelected ? 4 : 3;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Title
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 34px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("LOCAL RUNTIME // ON-CHIP NPU", 56, 92);

  // Separator
  ctx.strokeStyle = "rgba(56, 189, 248, 0.40)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 120);
  ctx.lineTo(width - 56, 120);
  ctx.stroke();

  // Metrics
  ctx.fillStyle = "rgba(186, 230, 253, 0.95)";
  ctx.font = "bold 30px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText(`CPU AVAIL:  ${device.cpuAvailablePct}%`, 56, 190);
  ctx.fillText(`MEM AVAIL:  ${device.memoryAvailablePct}%`, 56, 260);

  ctx.fillStyle = device.batteryPct < 25 ? "#ef4444" : "#38bdf8";
  ctx.fillText(
    `BATTERY:    ${device.batteryPct}% [${device.batteryPct < 30 ? "DRAIN RISK" : "NOMINAL"}]`,
    56,
    330
  );

  ctx.fillStyle = "rgba(186, 230, 253, 0.95)";
  ctx.fillText(`LATENCY:    ${device.latencyMs} MS`, 56, 400);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 32px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText(`COST SCORE: ${score}`, 56, 480);

  ctx.fillStyle = isSelected ? "#34d399" : "rgba(56, 189, 248, 0.85)";
  ctx.font = "24px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText(
    isSelected ? "STATUS: >> ACTIVE OFFLOAD TARGET <<" : "STATUS: EVALUATION CANDIDATE",
    56,
    126,
    570
  );
}


function Candidate({ target, spread }: { target: Target; spread: number }) {
  const config = MODELS[target];
  const x = Math.sign(config.position[0]) * spread;
  const view = HOLOGRAM_VIEWS[`sim-${target}`];
  const quaternion = useMemo(() => viewQuaternion(view), [view]);
  const group = useRef<THREE.Group>(null);
  const lastScreen = useRef("");
  const weight = useRef(0);
  const screen = useMemo(() => {
    if (target !== "local") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 640;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { canvas, texture };
  }, [target]);
  const hologram = useHologramImage(`sim-${target}`, COLORS[target]);
  // The tablet screen keeps its live telemetry texture, drawn over the image.
  const screenMaterial = useMemo(() => (screen ? createHologramScreenMaterial(screen.texture, COLORS[target]) : undefined), [screen, target]);
  const resources = useMemo(() => {
    const initialPoints = target === "cloud" ? [TASK, TASK, TASK] : [TASK, TASK];
    const geometry = new THREE.BufferGeometry().setFromPoints(initialPoints);
    const material = new THREE.LineBasicMaterial({ color: COLORS[target], transparent: true, opacity: .22 });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.name = `simulation-route-${target}`;
    const points = new THREE.BufferGeometry();
    points.setAttribute("position", new THREE.BufferAttribute(new Float32Array(24), 3));
    const signal = new THREE.PointsMaterial({ color: COLORS[target], size: 5, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geometry, material, line, points, signal, anchor: new THREE.Vector3() };
  }, [target]);
  useEffect(() => () => {
    resources.geometry.dispose(); resources.material.dispose(); resources.points.dispose(); resources.signal.dispose();
    screen?.texture.dispose();
    screenMaterial?.dispose();
  }, [resources, screen, screenMaterial]);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const decision = simulationStore.getDecision();
    weight.current = THREE.MathUtils.damp(weight.current, decision.selectedTarget === target ? 1 : 0, 5, delta);
    hologram.uniforms.uTime.value = clock.elapsedTime;
    // The tier the DQN agent picked projects brighter.
    hologram.uniforms.uIntensity.value = .65 + weight.current * .4;
    // The line ends on the centre of the model in its image.
    const [minU, minV, maxU, maxV] = view.content;
    viewPoint(view, quaternion, (minU + maxU) / 2, (minV + maxV) / 2, resources.anchor).add(group.current.position);
    const positions = resources.geometry.attributes.position as THREE.BufferAttribute;
    const edgeWaypoint = new THREE.Vector3(-spread, MODELS.edge.position[1], 0.4);
    if (target === "cloud") {
      positions.setXYZ(0, TASK.x, TASK.y, TASK.z);
      positions.setXYZ(1, edgeWaypoint.x, edgeWaypoint.y, edgeWaypoint.z);
      positions.setXYZ(2, resources.anchor.x, resources.anchor.y, resources.anchor.z);
    } else {
      positions.setXYZ(0, TASK.x, TASK.y, TASK.z);
      positions.setXYZ(1, resources.anchor.x, resources.anchor.y, resources.anchor.z);
    }
    positions.needsUpdate = true;
    resources.material.opacity = .22 + weight.current * .68;
    resources.signal.opacity = weight.current * .95;
    const particles = resources.points.attributes.position as THREE.BufferAttribute;
    // Deterministic outward flow. Independent route weights crossfade when selection changes.
    for (let i = 0; i < particles.count; i++) {
      const u = (clock.elapsedTime * .34 + i / particles.count) % 1;
      if (target === "cloud") {
        if (u < 0.5) {
          const segU = u * 2;
          particles.setXYZ(
            i,
            THREE.MathUtils.lerp(TASK.x, edgeWaypoint.x, segU),
            THREE.MathUtils.lerp(TASK.y, edgeWaypoint.y, segU),
            THREE.MathUtils.lerp(TASK.z, edgeWaypoint.z, segU)
          );
        } else {
          const segU = (u - 0.5) * 2;
          particles.setXYZ(
            i,
            THREE.MathUtils.lerp(edgeWaypoint.x, resources.anchor.x, segU),
            THREE.MathUtils.lerp(edgeWaypoint.y, resources.anchor.y, segU),
            THREE.MathUtils.lerp(edgeWaypoint.z, resources.anchor.z, segU)
          );
        }
      } else {
        particles.setXYZ(
          i,
          THREE.MathUtils.lerp(TASK.x, resources.anchor.x, u),
          THREE.MathUtils.lerp(TASK.y, resources.anchor.y, u),
          THREE.MathUtils.lerp(TASK.z, resources.anchor.z, u)
        );
      }
    }
    particles.needsUpdate = true;
    if (screen) {
      const device = simulationStore.getState().device;
      const key = JSON.stringify([device, decision.candidateScores.local.score, decision.selectedTarget]);
      if (lastScreen.current !== key) {
        const context = screen.canvas.getContext("2d");
        if (context) renderTabletCanvas(context, 1024, 640, device, decision.candidateScores.local.score, decision.selectedTarget === "local");
        screen.texture.needsUpdate = true; lastScreen.current = key;
      }
    }
  });
  return <>
    <primitive object={resources.line} />
    <points name={`simulation-signal-${target}`} geometry={resources.points} material={resources.signal} frustumCulled={false} />
    <group ref={group} position={[x, config.position[1], config.position[2]]} name={`simulation-${target}`}>
      <HologramImage id={`sim-${target}`} material={hologram} screenMaterial={screenMaterial} />
    </group>
    <group position={[x, target === "local" ? 3 : -2.7, 0]}>
      <Label color={COLORS[target]}>{target.toUpperCase()} {target === "local" ? "// DEVICE" : target === "edge" ? "// SERVER" : "// DATACENTER"}</Label>
    </group>
  </>;
}

function Task() {
  const [taskId, setTaskId] = useState(() => simulationStore.getState().task.id || "TASK_001");

  useEffect(() => {
    return simulationStore.subscribe(() => {
      setTaskId(simulationStore.getState().task.id || "TASK_001");
    });
  }, []);

  return <group position={TASK} name="simulation-task">
    <mesh><octahedronGeometry args={[.24, 0]} /><meshStandardMaterial color="white" emissive="#38bdf8" emissiveIntensity={2} /></mesh>
    <mesh scale={1.35}><icosahedronGeometry args={[.28, 0]} /><meshBasicMaterial color="#38bdf8" wireframe transparent opacity={.8} /></mesh>
    <mesh rotation={[.4, .2, 0]}><ringGeometry args={[.45, .46, 48]} /><meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={.7} /></mesh>
    <mesh rotation={[-.4, .35, 0]}><ringGeometry args={[.56, .57, 48]} /><meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={.7} /></mesh>
    <group position={[0, -.75, 0]}><Label color="#7dd3fc">{taskId}</Label></group>
  </group>;
}


export function SimulationSceneCanvas() {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const { ppu, spread, showCards } = sceneLayout(size);
  // Stop rendering while the panel is scrolled out of view.
  const inView = useInView(container);
  const quality = canvasQuality();
  // Screen position of the model row, matching FitCamera's orthographic projection.
  const cardTop = size.height / 2 - (MODELS.edge.position[1] - VIEW_CENTER_Y) * ppu;

  return <div ref={container} style={{ width: "100%", height: "100%", position: "relative" }}>
    <Canvas orthographic camera={{ position: [0, VIEW_CENTER_Y, 12], near: .1, far: 100 }} frameloop={inView ? quality.frameloop : "never"}
      dpr={quality.dpr} gl={{ antialias: quality.antialias, alpha: true, powerPreference: "high-performance" }}>
      <AdaptiveQuality />
      <FitCamera />
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 4, 6]} intensity={3} color="#e2e8f0" />
      <directionalLight position={[-4, 2, 3]} intensity={2} color="#7dd3fc" />
      <SparseDeepSpaceStars />
      <Suspense fallback={null}>
        <Task />
        <Candidate target="local" spread={spread} /><Candidate target="edge" spread={spread} /><Candidate target="cloud" spread={spread} />
      </Suspense>
    </Canvas>
    {/* Cards sit beside their models when there is room, otherwise in the top corners. */}
    {size.width >= 640 && <>
      <div className={`absolute z-10 ${showCards ? "-translate-y-1/2" : "top-4 left-4"}`}
        style={showCards ? { top: cardTop, left: size.width / 2 - (spread + EDGE_HALF_WIDTH) * ppu - CARD_GAP_PX - CARD_WIDTH_PX } : undefined}>
        <SimulationEdgeTelemetryOverlay />
      </div>
      <div className={`absolute z-10 ${showCards ? "-translate-y-1/2" : "top-4 right-4"}`}
        style={showCards ? { top: cardTop, left: size.width / 2 + (spread + CLOUD_HALF_WIDTH) * ppu + CARD_GAP_PX } : undefined}>
        <SimulationCloudTelemetryOverlay />
      </div>
    </>}
  </div>;
}

