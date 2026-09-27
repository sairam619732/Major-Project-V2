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

  // Destination coordinates settled in front of the Cloud datacenter
  const cloudTargetX = 14.65;
  const cloudTargetY = 0.85;
  const cloudTargetZ = -1.50;

  // Segment 1: Continuous 3D CatmullRom spline connecting Local hover -> Lift -> Arc -> Edge server
  const trajectoryCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(localHoverX, localHoverY, localHoverZ), // START: near tablet
        new THREE.Vector3(deviceX - 0.50, deviceY + 1.45, 0.45),  // CONTROL 1: lift
        new THREE.Vector3(deviceX + 1.80, deviceY + 2.10, 0.60),  // CONTROL 2: arc
        new THREE.Vector3(6.20, 1.40, 0.10),                     // CONTROL 3: toward Edge
        new THREE.Vector3(edgeTargetX, edgeTargetY, edgeTargetZ), // END: Edge server
      ],
      false,
      "centripetal",
      0.5
    );
  }, [deviceX, deviceY, localHoverX, localHoverY, localHoverZ, edgeTargetX, edgeTargetY, edgeTargetZ]);

  // Segment 2: Continuous 3D CatmullRom spline connecting Edge -> High Arc -> Remote Cloud datacenter
  const trajectoryCurve2 = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(edgeTargetX, edgeTargetY, edgeTargetZ), // START: at Edge server
        new THREE.Vector3(edgeTargetX + 1.80, 1.70, 0.10),        // CONTROL 1: lift into deep space
        new THREE.Vector3(11.60, 2.20, -0.60),                   // CONTROL 2: apex of WAN cloud offload
        new THREE.Vector3(13.60, 1.45, -1.20),                   // CONTROL 3: descent to datacenter
        new THREE.Vector3(cloudTargetX, cloudTargetY, cloudTargetZ), // END: Cloud datacenter
      ],
      false,
      "centripetal",
      0.5
    );
  }, [edgeTargetX, edgeTargetY, edgeTargetZ, cloudTargetX, cloudTargetY, cloudTargetZ]);

  // Segment 3: Continuous 3D CatmullRom spline connecting Cloud -> Decision Evaluation Center (Phase 10.1)
  const decisionTargetX = 26.0;
  const decisionTargetY = 0.40;
  const decisionTargetZ = 0.0;

  const trajectoryCurve3 = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(cloudTargetX, cloudTargetY, cloudTargetZ), // START: at Cloud datacenter
        new THREE.Vector3(18.00, 1.45, -0.90),                       // CONTROL 1: lift from Cloud
        new THREE.Vector3(22.50, 1.05, -0.35),                       // CONTROL 2: transit to Decision Center
        new THREE.Vector3(decisionTargetX, decisionTargetY, decisionTargetZ), // END: Decision Center
      ],
      false,
      "centripetal",
      0.5
    );
  }, [cloudTargetX, cloudTargetY, cloudTargetZ, decisionTargetX, decisionTargetY, decisionTargetZ]);

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

  // 7A. Segment 1 Network Data Trail Line (Device -> Edge: Cyan -> Emerald)
  const [trailLineGeo, trailLineMaterial] = useMemo(() => {
    const points = trajectoryCurve.getPoints(120);
    const count = points.length;
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

  const trailLine = useMemo(() => {
    return new THREE.Line(trailLineGeo, trailLineMaterial);
  }, [trailLineGeo, trailLineMaterial]);

  // 7B. Segment 2 Network Data Trail Line (Edge -> Cloud: Emerald -> Violet)
  const [trailLine2Geo, trailLine2Material] = useMemo(() => {
    const points = trajectoryCurve2.getPoints(120);
    const count = points.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const emerald = new THREE.Color("#10b981");
    const violet = new THREE.Color("#8b5cf6");
    const tempCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;

      const frac = i / (count - 1);
      tempCol.copy(emerald).lerp(violet, frac);
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
  }, [trajectoryCurve2]);

  const trailLine2 = useMemo(() => {
    return new THREE.Line(trailLine2Geo, trailLine2Material);
  }, [trailLine2Geo, trailLine2Material]);

  // 8A. Flowing Network Quanta Particles along Segment 1
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

  // 8B. Flowing Network Quanta Particles along Segment 2
  const quanta2Ref = useRef<Points>(null);
  const [quanta2Geo, quanta2Material] = useMemo(() => {
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
      violet: new THREE.Color("#8b5cf6"),
      violetEmissive: new THREE.Color("#6d28d9"),
      ringViolet: new THREE.Color("#a78bfa"),
      paleCyan: new THREE.Color("#f0f9ff"),
      paleEmissive: new THREE.Color("#38bdf8"),
      ringPaleCyan: new THREE.Color("#bae6fd"),
      temp: new THREE.Color(),
      tempVec: new THREE.Vector3(),
    };
  }, []);

  // Phase 7.6: Dedicated position vector
  const curPos = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // Phase 10: Single master visual timeline with smooth extension into Decision section
    const fullP = Math.max(scrollState.visualProgress, 0);
    const p = Math.min(fullP, 1);
    const t = state.clock.getElapsedTime();

    // 1. Task Materialization & Rise on Local Tablet (0.30 -> 0.44)
    const matT = smoothstep(0.30, 0.44, p);

    if (matT <= 0.002) {
      if (groupRef.current) groupRef.current.visible = false;
      if (tetherRef.current) tetherRef.current.visible = false;
      if (trailLineGeo) trailLineGeo.setDrawRange(0, 0);
      if (trailLine2Geo) trailLine2Geo.setDrawRange(0, 0);
      trailLineMaterial.opacity = 0;
      trailLine2Material.opacity = 0;
      quantaMaterial.opacity = 0;
      quanta2Material.opacity = 0;
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

    // 2. Position & Color: 3-Stage Cinematic Journey
    // Stage 1: Local Rise (0.30 -> 0.44)
    // Stage 2: Transit to Edge (0.44 -> 0.60)
    // Stage 3: Settle at Edge (0.60 -> 0.72)
    // Stage 4: Transit to Cloud (0.72 -> 0.88)
    // Stage 5: Settle at Cloud (0.88 -> 1.00)

    const transit1 = smoothstep(0.44, 0.60, p);
    const transit2 = smoothstep(0.72, 0.88, p);
    const edgeHold = smoothstep(0.60, 0.72, p);
    const cloudSettle = smoothstep(0.88, 0.95, p);

    if (p < 0.44) {
      // Local rise from tablet surface
      const riseT = smoothstep(0.30, 0.44, p);
      curPos.current.set(
        THREE.MathUtils.lerp(originX, localHoverX, riseT),
        THREE.MathUtils.lerp(originY, localHoverY, riseT),
        THREE.MathUtils.lerp(originZ, localHoverZ, riseT)
      );
      // Cyan palette
      coreMaterial.color.copy(colors.cyan);
      cageMaterial.color.copy(colors.cyan);
      particleMaterial.color.copy(colors.cyan);
      coreMaterial.emissive.copy(colors.blueEmissive);
      ringMaterial.color.copy(colors.ringCyan);
      if (pointLightRef.current) {
        pointLightRef.current.color.copy(colors.cyan);
        pointLightRef.current.intensity = 1.8 * matT;
      }
    } else if (p < 0.72) {
      // Segment 1: Local -> Edge
      trajectoryCurve.getPoint(transit1, curPos.current);

      // Cyan -> Emerald transition
      colors.temp.copy(colors.cyan).lerp(colors.emerald, transit1);
      coreMaterial.color.copy(colors.temp);
      cageMaterial.color.copy(colors.temp);
      particleMaterial.color.copy(colors.temp);

      colors.temp.copy(colors.blueEmissive).lerp(colors.emeraldEmissive, transit1);
      coreMaterial.emissive.copy(colors.temp);

      colors.temp.copy(colors.ringCyan).lerp(colors.ringEmerald, transit1);
      ringMaterial.color.copy(colors.temp);

      // Edge processing pulse synchronization
      const syncPulse = Math.sin(t * 3.5);
      coreMaterial.emissiveIntensity = 2.2 + 0.6 * edgeHold + syncPulse * 0.35 * edgeHold;

      if (pointLightRef.current) {
        pointLightRef.current.color.copy(colors.temp);
        pointLightRef.current.intensity = 1.8 * matT + 0.5 * edgeHold + syncPulse * 0.45 * edgeHold;
      }
    } else if (fullP <= 1.00) {
      // Segment 2: Edge -> Cloud
      trajectoryCurve2.getPoint(transit2, curPos.current);

      // Emerald -> Violet transition
      colors.temp.copy(colors.emerald).lerp(colors.violet, transit2);
      coreMaterial.color.copy(colors.temp);
      cageMaterial.color.copy(colors.temp);
      particleMaterial.color.copy(colors.temp);

      colors.temp.copy(colors.emeraldEmissive).lerp(colors.violetEmissive, transit2);
      coreMaterial.emissive.copy(colors.temp);

      colors.temp.copy(colors.ringEmerald).lerp(colors.ringViolet, transit2);
      ringMaterial.color.copy(colors.temp);

      // Cloud processing pulse synchronization
      const cloudSyncPulse = Math.sin(t * 3.2);
      coreMaterial.emissiveIntensity = 2.2 + 0.7 * cloudSettle + cloudSyncPulse * 0.40 * cloudSettle;

      if (pointLightRef.current) {
        pointLightRef.current.color.copy(colors.temp);
        pointLightRef.current.intensity = 1.8 * matT + 0.6 * cloudSettle + cloudSyncPulse * 0.50 * cloudSettle;
      }
    } else {
      // Segment 3: Cloud -> Decision Center (Phase 10.1: 1.00 -> 1.16)
      const transit3 = smoothstep(1.00, 1.16, fullP);
      const decisionHold = smoothstep(1.16, 1.28, fullP);
      trajectoryCurve3.getPoint(transit3, curPos.current);

      // Violet -> White / Pale Cyan decision palette (Phase 10.1 spec)
      colors.temp.copy(colors.violet).lerp(colors.paleCyan, transit3);
      coreMaterial.color.copy(colors.temp);
      cageMaterial.color.copy(colors.temp);
      particleMaterial.color.copy(colors.temp);

      colors.temp.copy(colors.violetEmissive).lerp(colors.paleEmissive, transit3);
      coreMaterial.emissive.copy(colors.temp);

      colors.temp.copy(colors.ringViolet).lerp(colors.ringPaleCyan, transit3);
      ringMaterial.color.copy(colors.temp);

      const decisionSyncPulse = Math.sin(t * 3.4);
      coreMaterial.emissiveIntensity = 2.4 + 0.6 * decisionHold + decisionSyncPulse * 0.35 * decisionHold;

      if (pointLightRef.current) {
        pointLightRef.current.color.copy(colors.temp);
        pointLightRef.current.intensity = 1.8 * matT + 0.5 * decisionHold + decisionSyncPulse * 0.40 * decisionHold;
      }
    }

    // Continuous floating oscillations that blend seamlessly based on progress
    const transit3 = smoothstep(1.00, 1.16, fullP);
    const hoverFloatY = Math.sin(t * 1.6) * 0.03 * (1 - transit1);
    const hoverFloatX = Math.cos(t * 1.2) * 0.015 * (1 - transit1);
    const edgeFloatY = Math.sin(t * 1.8) * 0.02 * (transit1 * (1 - transit2));
    const edgeFloatX = Math.cos(t * 1.3) * 0.012 * (transit1 * (1 - transit2));
    const cloudFloatY = Math.sin(t * 1.5) * 0.022 * (cloudSettle * (1 - transit3));
    const cloudFloatX = Math.cos(t * 1.1) * 0.014 * (cloudSettle * (1 - transit3));
    const decisionFloatY = Math.sin(t * 1.7) * 0.025 * transit3;
    const decisionFloatX = Math.cos(t * 1.3) * 0.015 * transit3;

    curPos.current.x += hoverFloatX + edgeFloatX + cloudFloatX + decisionFloatX;
    curPos.current.y += hoverFloatY + edgeFloatY + cloudFloatY + decisionFloatY;

    if (groupRef.current) {
      groupRef.current.position.copy(curPos.current);
    }

    // Continuous status mapping across all 3 computing tiers
    if (p < 0.30) {
      updateTaskStatus("idle");
    } else if (p < 0.44) {
      updateTaskStatus("generated");
    } else if (p < 0.60) {
      updateTaskStatus("in_transit");
    } else if (p < 0.72) {
      updateTaskStatus("processing");
    } else if (p < 0.88) {
      updateTaskStatus("in_transit");
    } else {
      updateTaskStatus("processing");
    }

    // 4. Optical Projection Tether to Local Tablet:
    // Fades in with task materialization on tablet, dissolves cleanly on liftoff (0.44 - 0.50)
    if (tetherRef.current) {
      const tetherT = smoothstep(0.30, 0.40, p) * (1 - smoothstep(0.44, 0.50, p));
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
    const rotSpeed = 1.0 + (smoothstep(0.44, 0.55, p) * (1 - smoothstep(0.60, 0.70, p)) + smoothstep(0.72, 0.82, p) * (1 - smoothstep(0.88, 0.96, p))) * 0.7;
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

    // 5A. Segment 1 Network Signal Trail & Quanta (Device -> Edge)
    if (trailLineGeo && quantaGeo) {
      const trail1Opacity = smoothstep(0.44, 0.50, p);
      if (trail1Opacity > 0.01 && transit1 > 0.005) {
        const trail1Settle = smoothstep(0.60, 0.70, p);
        const trail1Alpha = THREE.MathUtils.lerp(0.65, 0.24, trail1Settle) * trail1Opacity;
        trailLineMaterial.opacity = trail1Alpha;
        quantaMaterial.opacity = THREE.MathUtils.lerp(0.80, 0.32, trail1Settle) * trail1Opacity;

        const drawCount1 = Math.max(2, Math.floor(transit1 * 120) + 1);
        trailLineGeo.setDrawRange(0, drawCount1);

        const posArr = quantaGeo.attributes.position.array as Float32Array;
        const colArr = quantaGeo.attributes.color.array as Float32Array;
        const streamSpeed1 = THREE.MathUtils.lerp(0.40, 0.14, trail1Settle);

        for (let j = 0; j < 36; j++) {
          const offset = j / 36;
          const cycle = (t * streamSpeed1 + offset) % 1.0;
          const particleT = cycle * transit1;
          trajectoryCurve.getPoint(particleT, colors.tempVec);

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

    // 5B. Segment 2 Network Signal Trail & Quanta (Edge -> Cloud)
    if (trailLine2Geo && quanta2Geo) {
      const trail2Opacity = smoothstep(0.72, 0.78, p);
      if (trail2Opacity > 0.01 && transit2 > 0.005) {
        const trail2Settle = smoothstep(0.88, 0.96, p);
        const trail2Alpha = THREE.MathUtils.lerp(0.65, 0.24, trail2Settle) * trail2Opacity;
        trailLine2Material.opacity = trail2Alpha;
        quanta2Material.opacity = THREE.MathUtils.lerp(0.80, 0.32, trail2Settle) * trail2Opacity;

        const drawCount2 = Math.max(2, Math.floor(transit2 * 120) + 1);
        trailLine2Geo.setDrawRange(0, drawCount2);

        const posArr2 = quanta2Geo.attributes.position.array as Float32Array;
        const colArr2 = quanta2Geo.attributes.color.array as Float32Array;
        const streamSpeed2 = THREE.MathUtils.lerp(0.40, 0.14, trail2Settle);

        for (let j = 0; j < 36; j++) {
          const offset = j / 36;
          const cycle = (t * streamSpeed2 + offset) % 1.0;
          const particleT = cycle * transit2;
          trajectoryCurve2.getPoint(particleT, colors.tempVec);

          const jitter = Math.sin(t * 4.0 + j * 1.5) * 0.012;
          posArr2[j * 3] = colors.tempVec.x;
          posArr2[j * 3 + 1] = colors.tempVec.y + jitter;
          posArr2[j * 3 + 2] = colors.tempVec.z;

          colors.temp.copy(colors.emerald).lerp(colors.violet, particleT);
          colArr2[j * 3] = colors.temp.r;
          colArr2[j * 3 + 1] = colors.temp.g;
          colArr2[j * 3 + 2] = colors.temp.b;
        }

        quanta2Geo.attributes.position.needsUpdate = true;
        quanta2Geo.attributes.color.needsUpdate = true;
      } else {
        trailLine2Material.opacity = 0;
        quanta2Material.opacity = 0;
        trailLine2Geo.setDrawRange(0, 0);
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

      {/* 2A. Luminous Network Data Trail Path 1 (Local -> Edge: Blue -> Emerald) */}
      <primitive object={trailLine} />

      {/* 2B. Luminous Network Data Trail Path 2 (Edge -> Cloud: Emerald -> Violet) */}
      <primitive object={trailLine2} />

      {/* 3A. Streaming Network Data Quanta along Segment 1 */}
      <points
        ref={quantaRef}
        geometry={quantaGeo}
        material={quantaMaterial}
      />

      {/* 3B. Streaming Network Data Quanta along Segment 2 */}
      <points
        ref={quanta2Ref}
        geometry={quanta2Geo}
        material={quanta2Material}
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

        {/* Restrained localized point light transitioning with computing tier */}
        <pointLight
          ref={pointLightRef}
          color="#38bdf8"
          intensity={1.8}
          distance={2.8}
          decay={2}
        />
      </group>
    </>
  );
}
