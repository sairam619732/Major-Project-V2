"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Group, Mesh, Points, PointLight } from "three";
import { scrollState } from "@/store/scrollStore";
import { updateTaskStatus } from "@/store/taskStore";

export function HolographicTask() {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const cageRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const particlesRef = useRef<Points>(null);
  const tetherRef = useRef<Mesh>(null);
  const pointLightRef = useRef<PointLight>(null);

  // Trail Objects
  const quantaRef = useRef<Points>(null);

  const { viewport } = useThree();

  const isDesktop = viewport.width > 6.8;
  const deviceX = isDesktop ? Math.min(2.5, viewport.width * 0.24) : 0;
  const deviceY = isDesktop ? 0 : -Math.min(1.8, viewport.height * 0.22);

  // Responsive scale: task remains subordinate to computing pod / tablet
  const responsiveScale = isDesktop ? 1.0 : Math.min(0.85, viewport.width / 6.0);

  // Origin coordinates on the Local tablet screen
  const originX = deviceX - 0.25;
  const originY = deviceY + 0.35;
  const originZ = 0.15;

  // Base hover coordinates above the Local tablet
  const localHoverX = deviceX - 0.45;
  const localHoverY = deviceY + 0.82;
  const localHoverZ = 0.30;

  // Destination coordinates settled in front of the Edge server pod
  const edgeTargetX = 7.35;
  const edgeTargetY = 0.65;
  const edgeTargetZ = -0.25;

  // Phase 7.5: Continuous 3D CatmullRom spline connecting Local hover -> Lift -> Arc -> Edge server
  // Sampled continuously using transition progress u
  const trajectoryCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(localHoverX, localHoverY, localHoverZ), // START: near tablet
        new THREE.Vector3(deviceX - 0.50, deviceY + 1.45, 0.45),  // CONTROL 1: slightly forward and upward (lift)
        new THREE.Vector3(deviceX + 1.80, deviceY + 2.10, 0.60),  // CONTROL 2: farther into the scene (arc)
        new THREE.Vector3(6.20, 1.40, 0.10),                     // CONTROL 3: toward Edge
        new THREE.Vector3(edgeTargetX, edgeTargetY, edgeTargetZ), // END: Edge server
      ],
      false, // open curve
      "centripetal", // smooth without self-intersection
      0.5 // tension
    );
  }, [deviceX, deviceY, localHoverX, localHoverY, localHoverZ, edgeTargetX, edgeTargetY, edgeTargetZ]);

  // Smooth Hermite interpolation helpers
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  const smootherstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  // 1. Core Material (Small glowing crystalline data node)
  const coreMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#0284c7",
        emissiveIntensity: 2.2,
        roughness: 0.15,
        metalness: 0.8,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  // 2. Outer Wireframe Cage Material (Digital data lattice)
  const cageMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#38bdf8",
        wireframe: true,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  // 3. Transparent Shroud Material
  const shroudMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0369a1",
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  // 4. Orbital Ring Material
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#7dd3fc",
        wireframe: true,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  // 5. Data Particles (24 floating data quanta orbiting task)
  const [particleGeo, particleMaterial] = useMemo(() => {
    const count = 24;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const phi = (Math.sin(i * 1.5) * Math.PI) / 3;
      const r = 0.28 + (i % 5) * 0.035;
      positions[i * 3] = r * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: "#38bdf8",
      size: 0.038,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });

    return [geom, mat];
  }, []);

  // 6. Projection Tether Beam connecting Device Screen -> Task Base
  const tetherMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#38bdf8",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // 7. Network Data Trail Line (Thin luminous path with controlled blue -> emerald transition)
  const [trailLineGeo, trailLineMaterial] = useMemo(() => {
    const points = trajectoryCurve.getPoints(120);
    const count = points.length; // 121 points
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cyan = new THREE.Color("#38bdf8");
    const emerald = new THREE.Color("#10b981");
    const tempCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;

      const frac = i / (count - 1);
      tempCol.copy(cyan).lerp(emerald, frac);
      colors[i * 3] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      linewidth: 1,
    });

    return [geo, mat];
  }, [trajectoryCurve]);

  // Memoized Three.js Line object for the data trail
  const trailLine = useMemo(() => {
    return new THREE.Line(trailLineGeo, trailLineMaterial);
  }, [trailLineGeo, trailLineMaterial]);

  // 8. Flowing Network Quanta Particles streaming along the data trail
  const [quantaGeo, quantaMaterial] = useMemo(() => {
    const count = 36;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.034,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });

    return [geo, mat];
  }, []);

  // Geometries for holographic core, shroud, cage, and ring
  const coreGeo = useMemo(() => new THREE.OctahedronGeometry(0.14, 0), []);
  const cageGeo = useMemo(() => new THREE.IcosahedronGeometry(0.32, 0), []);
  const shroudGeo = useMemo(() => new THREE.DodecahedronGeometry(0.26, 0), []);
  const ringGeo = useMemo(() => new THREE.TorusGeometry(0.24, 0.005, 8, 32), []);

  // Tether line geometry anchored at base
  const tetherGeo = useMemo(() => {
    const geom = new THREE.CylinderGeometry(0.003, 0.008, 1.0, 8, 1, true);
    geom.translate(0, 0.5, 0);
    geom.rotateX(Math.PI / 2);
    return geom;
  }, []);

  // Reusable colors & vector for per-frame interpolation (zero garbage collection)
  const colors = useMemo(() => {
    return {
      cyan: new THREE.Color("#38bdf8"),
      blueEmissive: new THREE.Color("#0284c7"),
      ringCyan: new THREE.Color("#7dd3fc"),
      emerald: new THREE.Color("#10b981"),
      emeraldEmissive: new THREE.Color("#059669"),
      ringEmerald: new THREE.Color("#34d399"),
      temp: new THREE.Color(),
      tempVec: new THREE.Vector3(),
    };
  }, []);

  // Phase 7.6: Dedicated position vector
  const curPos = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // Phase 7.6: Single master visual timeline p in [0, 1]
    const p = Math.min(Math.max(scrollState.visualProgress, 0), 1);
    const t = state.clock.getElapsedTime();

    // 1. Task Materialization & Rise (Section 6: 0.55 -> 0.72)
    const matT = smoothstep(0.55, 0.70, p);

    if (matT <= 0.002) {
      if (groupRef.current) groupRef.current.visible = false;
      if (tetherRef.current) tetherRef.current.visible = false;
      if (trailLineGeo) trailLineGeo.setDrawRange(0, 0);
      trailLineMaterial.opacity = 0;
      quantaMaterial.opacity = 0;
      updateTaskStatus("idle");
      return;
    }

    if (groupRef.current) groupRef.current.visible = true;

    // Scale and opacity are continuous functions of matT
    const currentScale = (0.72 + matT * 0.28) * responsiveScale;
    groupRef.current?.scale.setScalar(currentScale);

    coreMaterial.opacity = (0.20 + 0.75 * matT) * matT;
    cageMaterial.opacity = 0.52 * matT;
    shroudMaterial.opacity = 0.15 * matT;
    ringMaterial.opacity = 0.55 * matT;
    particleMaterial.opacity = 0.85 * matT;

    // 2. Position: Continuous rise (0.55 -> 0.70) then continuous 3D Spline transit (0.70 -> 0.94)
    // Section 7: transitProgress = smoothstep(0.70, 0.94, p)
    const transitProgress = smoothstep(0.70, 0.94, p);

    if (p < 0.70) {
      // Materializing and gently rising from tablet screen surface up to localHover
      const riseT = smoothstep(0.55, 0.70, p);
      curPos.current.set(
        THREE.MathUtils.lerp(originX, localHoverX, riseT),
        THREE.MathUtils.lerp(originY, localHoverY, riseT),
        THREE.MathUtils.lerp(originZ, localHoverZ, riseT)
      );
    } else {
      // Continuous 3D transit along CatmullRom spline
      trajectoryCurve.getPoint(transitProgress, curPos.current);
    }

    // Continuous floating oscillations that blend seamlessly based on transitProgress
    const hoverFloatY = Math.sin(t * 1.6) * 0.03 * (1 - transitProgress);
    const hoverFloatX = Math.cos(t * 1.2) * 0.015 * (1 - transitProgress);
    const edgeFloatY = Math.sin(t * 1.8) * 0.02 * transitProgress;
    const edgeFloatX = Math.cos(t * 1.3) * 0.012 * transitProgress;

    curPos.current.x += hoverFloatX + edgeFloatX;
    curPos.current.y += hoverFloatY + edgeFloatY;

    if (groupRef.current) {
      groupRef.current.position.copy(curPos.current);
    }

    // Continuous status mapping
    if (p < 0.55) {
      updateTaskStatus("idle");
    } else if (p < 0.70) {
      updateTaskStatus("generated");
    } else if (p < 0.94) {
      updateTaskStatus("in_transit");
    } else {
      updateTaskStatus("completed");
    }

    // 3. Continuous Color Transition along Spline Transit (Cyan -> Emerald)
    colors.temp.copy(colors.cyan).lerp(colors.emerald, transitProgress);
    coreMaterial.color.copy(colors.temp);
    cageMaterial.color.copy(colors.temp);
    particleMaterial.color.copy(colors.temp);

    colors.temp.copy(colors.blueEmissive).lerp(colors.emeraldEmissive, transitProgress);
    coreMaterial.emissive.copy(colors.temp);

    colors.temp.copy(colors.ringCyan).lerp(colors.ringEmerald, transitProgress);
    ringMaterial.color.copy(colors.temp);

    if (pointLightRef.current) {
      colors.temp.copy(colors.cyan).lerp(colors.emerald, transitProgress);
      pointLightRef.current.color.copy(colors.temp);
      pointLightRef.current.intensity = 1.8 * matT + (transitProgress >= 0.95 ? Math.sin(t * 4.0) * 0.4 : 0);
    }

    // 4. Optical Projection Tether to Local Tablet:
    // Fades in with task materialization, dissolves as task lifts off (0.70–0.78)
    if (tetherRef.current) {
      const tetherT = smoothstep(0.55, 0.65, p) * (1 - smoothstep(0.70, 0.78, p));
      if (tetherT > 0.01) {
        tetherRef.current.visible = true;
        tetherRef.current.position.set(originX, originY, originZ);
        tetherRef.current.lookAt(curPos.current.x, curPos.current.y, curPos.current.z);
        const dx = curPos.current.x - originX;
        const dy = curPos.current.y - originY;
        const dz = curPos.current.z - originZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        tetherRef.current.scale.set(1, 1, dist);
        tetherMaterial.opacity = 0.35 * tetherT;
      } else {
        tetherRef.current.visible = false;
        tetherMaterial.opacity = 0;
      }
    }

    // Continuous rotation of task core & rings
    const rotSpeed = 1.0 + smoothstep(0.70, 0.85, p) * (1 - smoothstep(0.90, 0.98, p)) * 0.8;
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.45 * rotSpeed;
      coreRef.current.rotation.x += delta * 0.22 * rotSpeed;
    }
    if (cageRef.current) {
      cageRef.current.rotation.y -= delta * 0.32 * rotSpeed;
      cageRef.current.rotation.z += delta * 0.16 * rotSpeed;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.55 * rotSpeed;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.28 * rotSpeed;
      particlesRef.current.rotation.x += delta * 0.14 * rotSpeed;
    }

    // 5. Continuous Network Signal Trail & Streaming Data Quanta (Section 8)
    // Trail growth uses exact same transitProgress: trailEnd = transitProgress
    if (trailLineGeo && quantaGeo) {
      const trailOpacity = smoothstep(0.70, 0.78, p);
      if (trailOpacity > 0.01 && transitProgress > 0.005) {
        trailLineMaterial.opacity = 0.65 * trailOpacity;
        quantaMaterial.opacity = 0.80 * trailOpacity;

        // Path exists progressively strictly behind the traveling task:
        const drawCount = Math.max(2, Math.floor(transitProgress * 120) + 1);
        trailLineGeo.setDrawRange(0, drawCount);

        // Streaming data particles flow along the traversed path behind the task:
        const posArr = quantaGeo.attributes.position.array as Float32Array;
        const colArr = quantaGeo.attributes.color.array as Float32Array;

        for (let j = 0; j < 36; j++) {
          const offset = j / 36;
          const cycle = (t * 0.40 + offset) % 1.0;
          // Constrain particles to the traversed portion of the curve [0, transitProgress]
          const particleT = cycle * transitProgress;
          trajectoryCurve.getPoint(particleT, colors.tempVec);

          // Subtle micro-jitter for organic data stream
          const jitter = Math.sin(t * 4.0 + j * 1.5) * 0.012;
          posArr[j * 3] = colors.tempVec.x;
          posArr[j * 3 + 1] = colors.tempVec.y + jitter;
          posArr[j * 3 + 2] = colors.tempVec.z;

          colors.temp.copy(colors.cyan).lerp(colors.emerald, particleT);
          colArr[j * 3] = colors.temp.r;
          colArr[j * 3 + 1] = colors.temp.g;
          colArr[j * 3 + 2] = colors.temp.b;
        }

        quantaGeo.attributes.position.needsUpdate = true;
        quantaGeo.attributes.color.needsUpdate = true;
      } else {
        trailLineMaterial.opacity = 0;
        quantaMaterial.opacity = 0;
        trailLineGeo.setDrawRange(0, 0);
      }
    }
  });

  return (
    <>
      {/* 1. Subtle Optical Projection Tether: LOCAL TABLET SCREEN -> TASK_001 */}
      <mesh
        ref={tetherRef}
        geometry={tetherGeo}
        material={tetherMaterial}
        position={[originX, originY, originZ]}
      />

      {/* 2. Thin Luminous Network Data Trail Path (Blue -> Emerald) */}
      <primitive object={trailLine} />

      {/* 3. Streaming Network Data Quanta Particles */}
      <points
        ref={quantaRef}
        geometry={quantaGeo}
        material={quantaMaterial}
      />

      {/* 4. Floating Holographic Task Assembly (Continuous 3D Spline Movement) */}
      <group
        ref={groupRef}
        position={[localHoverX, localHoverY, localHoverZ]}
        scale={responsiveScale}
      >
        {/* Glowing Data Core */}
        <mesh ref={coreRef} geometry={coreGeo} material={coreMaterial} />

        {/* Transparent Shroud */}
        <mesh geometry={shroudGeo} material={shroudMaterial} />

        {/* Wireframe Data Matrix Cage */}
        <mesh ref={cageRef} geometry={cageGeo} material={cageMaterial} />

        {/* Orbital Technical Ring */}
        <mesh
          ref={ringRef}
          geometry={ringGeo}
          material={ringMaterial}
          rotation={[Math.PI / 4, 0, 0]}
        />

        {/* Tiny Data Particles */}
        <points
          ref={particlesRef}
          geometry={particleGeo}
          material={particleMaterial}
        />

        {/* Restrained localized point light transitioning from cyan to emerald */}
        <pointLight
          ref={pointLightRef}
          color="#38bdf8"
          intensity={1.8}
          distance={2.6}
          decay={2}
        />
      </group>
    </>
  );
}
