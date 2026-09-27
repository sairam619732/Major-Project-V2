"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "@/store/scrollStore";

// Number of primary star particles specified in prompt
const NUM_STARS = 6;

// Number of sparse micro-stars for subtle cosmic backdrop
const NUM_MICRO_STARS = 45;

export function CosmicTransition() {
  const containerRef = useRef<THREE.Group>(null);
  const starsGroupRef = useRef<THREE.Group>(null);
  const microStarsRef = useRef<THREE.Points>(null);

  // References to the 6 star mesh instances and their halo billboard meshes
  const starCoresRef = useRef<THREE.Mesh[]>([]);
  const starHalosRef = useRef<THREE.Mesh[]>([]);
  const coreMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const haloMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const microMaterialRef = useRef<THREE.PointsMaterial>(null);

  // Smooth Hermite interpolation helper
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  // Trajectory spline identical to Segment 2 in HolographicTask (Edge -> Deep Space Arc -> Cloud)
  const trajectoryCurve2 = useMemo(() => {
    const edgeTargetX = 7.35;
    const edgeTargetY = 0.65;
    const edgeTargetZ = -0.25;

    const cloudTargetX = 14.65;
    const cloudTargetY = 0.85;
    const cloudTargetZ = -1.50;

    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(edgeTargetX, edgeTargetY, edgeTargetZ), // Edge server
        new THREE.Vector3(edgeTargetX + 1.80, 1.70, 0.10),        // Lift into WAN deep space
        new THREE.Vector3(11.60, 2.20, -0.60),                   // Apex of WAN cloud offload
        new THREE.Vector3(13.60, 1.45, -1.20),                   // Descent to datacenter
        new THREE.Vector3(cloudTargetX, cloudTargetY, cloudTargetZ), // Cloud datacenter
      ],
      false,
      "centripetal",
      0.5
    );
  }, []);

  // SSR-safe 4-point star lenslet diffraction texture (✦)
  const starHaloTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const cx = 64;
    const cy = 64;

    // 1. Soft spherical glow core
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 48);
    radGrad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    radGrad.addColorStop(0.18, "rgba(125, 211, 252, 0.75)");
    radGrad.addColorStop(0.45, "rgba(167, 139, 250, 0.30)");
    radGrad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 128, 128);

    // 2. Horizontal diffraction spike
    const hGrad = ctx.createLinearGradient(0, cy, 128, cy);
    hGrad.addColorStop(0.0, "rgba(255, 255, 255, 0)");
    hGrad.addColorStop(0.35, "rgba(186, 230, 253, 0.35)");
    hGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
    hGrad.addColorStop(0.65, "rgba(186, 230, 253, 0.35)");
    hGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, cy - 2, 128, 4);

    // 3. Vertical diffraction spike
    const vGrad = ctx.createLinearGradient(cx, 0, cx, 128);
    vGrad.addColorStop(0.0, "rgba(255, 255, 255, 0)");
    vGrad.addColorStop(0.35, "rgba(186, 230, 253, 0.35)");
    vGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
    vGrad.addColorStop(0.65, "rgba(186, 230, 253, 0.35)");
    vGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = vGrad;
    ctx.fillRect(cx - 2, 0, 4, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // Sparse background micro-stars positioned exclusively along the Edge -> Cloud transit corridor
  const [microStarsGeo, microStarsMat] = useMemo(() => {
    const positions = new Float32Array(NUM_MICRO_STARS * 3);
    const colors = new Float32Array(NUM_MICRO_STARS * 3);

    // Controlled pseudo-random distribution around the WAN corridor
    const colorA = new THREE.Color("#38bdf8"); // cyan
    const colorB = new THREE.Color("#818cf8"); // celestial indigo
    const colorC = new THREE.Color("#c084fc"); // violet
    const tempCol = new THREE.Color();

    for (let i = 0; i < NUM_MICRO_STARS; i++) {
      // Progress along spline [0.05, 0.95]
      const tProgress = 0.05 + (i / NUM_MICRO_STARS) * 0.90;
      const pt = trajectoryCurve2.getPoint(tProgress);

      // Controlled radial scatter (distance 1.2 to 2.8 meters from spline, not occluding foreground)
      const angle = (i * 137.5 * Math.PI) / 180; // golden angle distribution
      const radius = 1.2 + (((i * 37) % 100) / 100) * 1.8;

      positions[i * 3 + 0] = pt.x + Math.cos(angle) * radius * 0.8;
      positions[i * 3 + 1] = pt.y + Math.sin(angle) * radius * 0.7;
      positions[i * 3 + 2] = pt.z + Math.sin(angle * 2) * 0.9 - 0.4; // slightly set back in depth

      // Spectral gradient from cyan -> indigo -> violet
      if (tProgress < 0.5) {
        tempCol.copy(colorA).lerp(colorB, tProgress * 2);
      } else {
        tempCol.copy(colorB).lerp(colorC, (tProgress - 0.5) * 2);
      }

      colors[i * 3 + 0] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.038,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return [geo, mat];
  }, [trajectoryCurve2]);

  // Star geometry: crystalline octahedron core + lenslet quad
  const coreGeo = useMemo(() => new THREE.OctahedronGeometry(0.040, 0), []);
  const haloGeo = useMemo(() => new THREE.PlaneGeometry(0.24, 0.24), []);

  // Individual parameters for the SIX constellation stars
  const starConfigs = useMemo(() => {
    return Array.from({ length: NUM_STARS }).map((_, i) => ({
      baseAngle: (i * Math.PI * 2) / NUM_STARS,
      phaseOffset: (i * 1.047) % (Math.PI * 2),
      radiusMajor: 0.62 + (i % 2 === 0 ? 0.08 : -0.06),
      radiusMinor: 0.48 + (i % 3 === 0 ? 0.06 : -0.04),
      speedMult: 0.85 + (i % 2) * 0.20,
      uStagger: (i - (NUM_STARS - 1) / 2) * 0.018, // subtle longitudinal stagger along path
    }));
  }, []);

  // Frame update: synchronized with master scrollProgress
  useFrame((state) => {
    const p = Math.min(Math.max(scrollState.visualProgress, 0), 1);
    const t = state.clock.getElapsedTime();

    // 1. Precise Smooth Opacity Envelope for Edge -> Cloud Transition (0.71 -> 0.89)
    // Fades in as task lifts from Edge (0.71 -> 0.76)
    // Full visibility across apex transit (0.76 -> 0.84)
    // Fades out gently as task approaches Cloud (0.84 -> 0.89)
    const fadeIn = smoothstep(0.71, 0.76, p);
    const fadeOut = smoothstep(0.84, 0.89, p);
    const transitionOpacity = fadeIn * (1 - fadeOut);

    if (transitionOpacity <= 0.001) {
      if (containerRef.current) containerRef.current.visible = false;
      return;
    }

    if (containerRef.current) containerRef.current.visible = true;

    // Micro-stars backdrop opacity
    if (microMaterialRef.current) {
      microMaterialRef.current.opacity = 0.35 * transitionOpacity;
    }

    // 2. Trajectory position along spline: matches TASK_001 transit2 (0.72 -> 0.88)
    const transitT = smoothstep(0.72, 0.88, p);

    // Tangent and Frenet-like perpendicular reference frame
    const tangent = trajectoryCurve2.getTangent(transitT);

    const upVec = new THREE.Vector3(0, 1, 0);
    const normalVec = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
    const binormalVec = new THREE.Vector3().crossVectors(tangent, normalVec).normalize();

    // Dynamic color lerp from Edge (cyan/emerald) -> Cloud (violet/indigo)
    const tempColor = new THREE.Color();
    const colStart = new THREE.Color("#38bdf8");
    const colEnd = new THREE.Color("#c084fc");
    tempColor.copy(colStart).lerp(colEnd, transitT);

    // 3. Update the SIX Constellation Stars
    for (let i = 0; i < NUM_STARS; i++) {
      const cfg = starConfigs[i];
      const coreMesh = starCoresRef.current[i];
      const haloMesh = starHalosRef.current[i];
      const coreMat = coreMaterialsRef.current[i];
      const haloMat = haloMaterialsRef.current[i];

      if (!coreMesh || !haloMesh || !coreMat || !haloMat) continue;

      // Gentle orbital motion: base angle + slow continuous rotation + pulsation
      const orbitAngle = cfg.baseAngle + t * 0.90 * cfg.speedMult + cfg.phaseOffset;
      const breathR = Math.sin(t * 2.2 + cfg.phaseOffset) * 0.04;

      const rA = cfg.radiusMajor + breathR;
      const rB = cfg.radiusMinor + breathR;

      // Staggered spline point so stars form a 3D loose constellation rather than a flat disc
      const starU = Math.min(Math.max(transitT + cfg.uStagger, 0), 1);
      const starSplinePt = trajectoryCurve2.getPoint(starU);

      // Offset in perpendicular orbital plane
      const starPos = starSplinePt.clone()
        .addScaledVector(normalVec, Math.cos(orbitAngle) * rA)
        .addScaledVector(binormalVec, Math.sin(orbitAngle) * rB);

      coreMesh.position.copy(starPos);
      haloMesh.position.copy(starPos);

      // Billboard halo mesh toward camera
      haloMesh.quaternion.copy(state.camera.quaternion);

      // Controlled individual twinkling
      const twinkle = Math.sin(t * 3.8 + cfg.phaseOffset) * 0.18 + 0.82;

      // Core appearance: sharp crystalline point with subtle emissive
      coreMat.opacity = 0.90 * transitionOpacity;
      coreMat.emissive.copy(tempColor);
      coreMat.emissiveIntensity = 1.6 * twinkle; // Restrained, strictly dimmer than TASK_001 (2.9)

      // Halo appearance: soft glowing ✦ diffraction flare
      haloMat.opacity = 0.45 * transitionOpacity * twinkle;
      haloMat.color.copy(tempColor);
    }
  });

  return (
    <group ref={containerRef}>
      {/* 1. Sparse background micro-stars along WAN transit corridor */}
      <points ref={microStarsRef} geometry={microStarsGeo}>
        <primitive object={microStarsMat} ref={microMaterialRef} />
      </points>

      {/* 2. The SIX Primary Star Particles Constellation */}
      <group ref={starsGroupRef}>
        {Array.from({ length: NUM_STARS }).map((_, i) => (
          <group key={`constellation-star-${i}`}>
            {/* Small glowing crystalline core */}
            <mesh
              ref={(el) => {
                if (el) starCoresRef.current[i] = el;
              }}
              geometry={coreGeo}
            >
              <meshStandardMaterial
                ref={(el) => {
                  if (el) coreMaterialsRef.current[i] = el;
                }}
                color="#e0f2fe"
                emissive="#38bdf8"
                emissiveIntensity={1.6}
                roughness={0.15}
                metalness={0.8}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>

            {/* Soft diffraction ✦ lenslet halo */}
            {starHaloTexture && (
              <mesh
                ref={(el) => {
                  if (el) starHalosRef.current[i] = el;
                }}
                geometry={haloGeo}
              >
                <meshBasicMaterial
                  ref={(el) => {
                    if (el) haloMaterialsRef.current[i] = el;
                  }}
                  map={starHaloTexture}
                  transparent
                  opacity={0}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
