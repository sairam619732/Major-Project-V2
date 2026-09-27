"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import { scrollState } from "@/store/scrollStore";

export function ComputingDevice() {
  const groupRef = useRef<Group>(null);
  const { viewport } = useThree();

  // Lazy-load approved Sci-Fi Tablet GLB asset
  const { scene } = useGLTF("/assets/device/sci_fi_tablet.glb");

  const isDesktop = viewport.width > 6.8;
  const targetX = isDesktop ? Math.min(2.5, viewport.width * 0.24) : 0;
  const targetY = isDesktop ? 0 : -Math.min(1.8, viewport.height * 0.22);

  // Tablet occupies approximately 35-45% of viewport height
  const responsiveScale = isDesktop
    ? 0.88
    : Math.min(0.72, viewport.width / 5.8);

  // Phase 7.3: High-Tech Computational OLED Display Texture with 1.8–2x typography scale
  const screenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Dark OLED background
    ctx.fillStyle = "#040810";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle technical grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.07)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Inset perimeter border frame
    ctx.strokeStyle = "rgba(56, 189, 248, 0.32)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    // Corner technical brackets
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    const b = 28;
    // Top-left
    ctx.beginPath(); ctx.moveTo(36, 36 + b); ctx.lineTo(36, 36); ctx.lineTo(36 + b, 36); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(canvas.width - 36 - b, 36); ctx.lineTo(canvas.width - 36, 36); ctx.lineTo(canvas.width - 36, 36 + b); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(36, canvas.height - 36 - b); ctx.lineTo(36, canvas.height - 36); ctx.lineTo(36 + b, canvas.height - 36); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(canvas.width - 36 - b, canvas.height - 36); ctx.lineTo(canvas.width - 36, canvas.height - 36); ctx.lineTo(canvas.width - 36, canvas.height - 36 - b); ctx.stroke();

    // 1. Top Telemetry Header (Clean technical hierarchy)
    ctx.fillStyle = "rgba(148, 163, 184, 0.95)";
    ctx.font = "bold 24px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText("DEVICE // LOCAL_CORE_01", 64, 82);

    // Status: Active badge
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(canvas.width - 250, 75, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(56, 189, 248, 0.98)";
    ctx.font = "bold 22px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText("STATUS   ACTIVE", canvas.width - 232, 82);

    // Subtle technical divider line
    ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(52, 114);
    ctx.lineTo(canvas.width - 52, 114);
    ctx.stroke();

    // 2. Workload Category Kicker
    ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
    ctx.font = "bold 15px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText("ACTIVE ON-DEVICE WORKLOAD", 64, 168);

    // 3. Dominant Prominent Line: OBJECT DETECTION (1.8–2x prominent hierarchy)
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 48px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText("OBJECT DETECTION", 64, 230);

    // Accent line beneath prominent title
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(64, 248, 280, 3);

    // 4. Clean System Telemetry (CPU, MEMORY, BATTERY, LATENCY)
    // Generously spaced, highly legible 22px monospace typography
    const metricStartY = 312;
    const metricSpacing = 50;

    const metrics = [
      { label: "CPU", value: "16-CORE @ 4.2 GHz" },
      { label: "MEMORY", value: "32 GB" },
      { label: "BATTERY", value: "94% HEALTH" },
      { label: "LATENCY", value: "0.8 MS (LOCAL)", highlight: true },
    ];

    metrics.forEach((m, idx) => {
      const y = metricStartY + idx * metricSpacing;

      // Label (column 1)
      ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
      ctx.font = "bold 22px 'Geist Mono', ui-monospace, monospace";
      ctx.fillText(m.label, 64, y);

      // Value (column 2)
      ctx.fillStyle = m.highlight ? "#38bdf8" : "rgba(241, 245, 249, 0.95)";
      ctx.font = "bold 22px 'Geist Mono', ui-monospace, monospace";
      ctx.fillText(m.value, 230, y);
    });

    // 5. Right-Side Sci-Fi Computational Radar / NPU Visualizer
    const radarX = 780;
    const radarY = 340;

    // Outer radar ring
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(radarX, radarY, 84, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = "rgba(56, 189, 248, 0.40)";
    ctx.beginPath();
    ctx.arc(radarX, radarY, 52, 0, Math.PI * 2);
    ctx.stroke();

    // Center core
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(radarX, radarY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Crosshairs
    ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
    ctx.beginPath();
    ctx.moveTo(radarX - 110, radarY); ctx.lineTo(radarX + 110, radarY);
    ctx.moveTo(radarX, radarY - 110); ctx.lineTo(radarX, radarY + 110);
    ctx.stroke();

    // Subtle label for right-side visualizer
    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.font = "14px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText("NEURAL ENGINE // 38 TOPS", radarX - 105, radarY + 120);

    // 6. Bottom Footer Telemetry
    ctx.fillStyle = "rgba(100, 116, 139, 0.85)";
    ctx.font = "14px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText("ARCHITECTURE: ON-CHIP COMPLIANT", 64, canvas.height - 52);

    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.fillText("LOCAL RUNTIME READY", canvas.width - 270, canvas.height - 52);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.needsUpdate = true;
    return texture;
  }, []);

  const screenMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const emmisMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Cloned scene configured with realistic PBR materials and glowing screen
  const clonedScene = useMemo(() => {
    screenMatsRef.current = [];
    emmisMatsRef.current = [];

    const cl = scene.clone(true);
    cl.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material && !Array.isArray(mesh.material)) {
          const mat = mesh.material as THREE.MeshStandardMaterial;

          // Preserve authentic PBR textures with brighter, readable response
          mat.roughness = Math.max(0.2, Math.min(mat.roughness ?? 0.5, 0.52));
          // Tune metalness so diffuse color is visible under ambient and fill lights
          mat.metalness = Math.min(mat.metalness ?? 0.8, 0.62);
          mat.envMapIntensity = 1.4;

          // Screen mesh: Apply our crisp technical OLED display texture
          if (mesh.name.toLowerCase().includes("screen") && screenTexture) {
            mat.map = screenTexture;
            mat.emissiveMap = screenTexture;
            mat.emissive = new THREE.Color("#ffffff");
            mat.emissiveIntensity = 1.0;
            mat.roughness = 0.10;
            mat.metalness = 0.05;
            mat.needsUpdate = true;
            screenMatsRef.current.push(mat);
          }

          // Emmison mesh / material: Enhance bright cyan technical glow
          if (mesh.name.toLowerCase().includes("emmis") || mat.name.toLowerCase().includes("emmis")) {
            mat.emissive = new THREE.Color("#38bdf8");
            mat.emissiveIntensity = 2.4;
            mat.needsUpdate = true;
            emmisMatsRef.current.push(mat);
          }
        }
      }
    });
    return cl;
  }, [scene, screenTexture]);

  // Gentle idle breathing animation + continuous scroll-driven screen activation (Timeline: 0.28–0.58)
  useFrame((state) => {
    if (!groupRef.current) return;
    // Phase 7.6: Single master visual timeline p in [0, 1]
    const p = Math.min(Math.max(scrollState.visualProgress, 0), 1);
    const t = state.clock.getElapsedTime();

    // Gentle vertical float
    groupRef.current.position.y = targetY + Math.sin(t * 0.7) * 0.045;

    // Slight 3/4 perspective breathing rotation
    groupRef.current.rotation.y = -0.42 + Math.sin(t * 0.45) * 0.025;
    groupRef.current.rotation.x = 0.12 + Math.cos(t * 0.4) * 0.016;

    // Continuous Screen Activation (0.18 -> 0.36 as camera approaches tablet)
    const activeRaw = Math.max(0, Math.min(1, (p - 0.18) / 0.18));
    const activeEased = activeRaw * activeRaw * (3 - 2 * activeRaw);

    const pulse = Math.sin(t * 6.0) * 0.14 * activeEased;
    const screenIntensity = 0.65 + activeEased * 1.55 + pulse;
    const emmisIntensity = 1.4 + activeEased * 1.6;

    for (let i = 0; i < screenMatsRef.current.length; i++) {
      screenMatsRef.current[i].emissiveIntensity = screenIntensity;
    }
    for (let i = 0; i < emmisMatsRef.current.length; i++) {
      emmisMatsRef.current[i].emissiveIntensity = emmisIntensity;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[targetX, targetY, 0]}
      rotation={[0.12, -0.42, 0.03]}
      scale={responsiveScale}
    >
      {/* Inner group brings the model from X-Z plane into standard upright orientation with screen facing camera */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

useGLTF.preload("/assets/device/sci_fi_tablet.glb");
