// Phase 10.2.6: Subtle Gold Star Accents (#D6B36A to #E8C873)
//
// 1. FORMAL COLOR HIERARCHY:
//    - ~75–80% white / cool-white (soft white, cool white, pale blue-white)
//    - ~10–15% cyan / blue / violet (technical accents across Cloud exit & Apex)
//    - ~5–10% warm gold (#D6B36A to #E8C873, soft muted amber-gold, not orange, not neon yellow)
// 2. GOLD STAR DESIGN & SCALE:
//    - Mostly tiny, slightly brighter than distant stars, smaller than main hero stars
//    - Exactly 2 slightly larger golden accent stars (size: 0.14x0.14 halo, 0.024 core) with soft warm halo
//    - No large golden suns; no rainbow colors
// 3. NATURAL DISTRIBUTION & SCROLL MOTION:
//    - Distributed naturally across transit with zero clustering around TASK_001
//    - Full scroll-driven synchronization across p in [1.00, 1.20] with smooth reverse scroll
//
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "@/store/scrollStore";

const NUM_GALAXY_PARTICLES = 240;
const NUM_DISTANT_STARS = 80;
const NUM_BEACON_STARS = 6;
const NUM_DATA_QUANTA = 28;

// Smooth Hermite interpolation helper
function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function CloudToDecisionCosmic() {
  const containerRef = useRef<THREE.Group>(null);
  const galaxyPointsRef = useRef<THREE.Points>(null);
  const distantPointsRef = useRef<THREE.Points>(null);
  const quantaPointsRef = useRef<THREE.Points>(null);
  const hazeMeshRef = useRef<THREE.Mesh>(null);
  const hazeMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // References to hero beacon star meshes
  const beaconCoresRef = useRef<THREE.Mesh[]>([]);
  const beaconHalosRef = useRef<THREE.Mesh[]>([]);
  const beaconCoreMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const beaconHaloMatsRef = useRef<THREE.MeshBasicMaterial[]>([]);

  // References to 2 subtle golden accent beacon stars
  const goldBeaconCoresRef = useRef<THREE.Mesh[]>([]);
  const goldBeaconHalosRef = useRef<THREE.Mesh[]>([]);
  const goldBeaconCoreMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const goldBeaconHaloMatsRef = useRef<THREE.MeshBasicMaterial[]>([]);

  // 1. Spline Trajectory (Cloud -> Deep Space Transit -> Decision Center)
  const trajectoryCurve = useMemo(() => {
    const cloudTargetX = 14.65;
    const cloudTargetY = 0.85;
    const cloudTargetZ = -1.50;

    const decisionTargetX = 26.0;
    const decisionTargetY = 0.40;
    const decisionTargetZ = 0.0;

    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(cloudTargetX, cloudTargetY, cloudTargetZ), // Cloud exit
        new THREE.Vector3(18.00, 1.45, -0.90),                       // Lift from Cloud into deep space
        new THREE.Vector3(22.50, 1.05, -0.35),                       // Transit across deep space
        new THREE.Vector3(decisionTargetX, decisionTargetY, decisionTargetZ), // Decision Center
      ],
      false,
      "centripetal",
      0.5
    );
  }, []);

  // 2. Soft Luminous Star Point Texture (Bright Core + Blurred Optical Halo)
  // Eliminates flat square particle edges, replacing them with photographic light falloff
  const starGlowTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const cx = 32;
    const cy = 32;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
    // 1. Pinpoint brilliant core
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.14, "rgba(255, 255, 255, 0.95)");
    // 2. First luminous bloom halo
    grad.addColorStop(0.35, "rgba(240, 246, 255, 0.60)");
    // 3. Soft optical light falloff
    grad.addColorStop(0.65, "rgba(186, 215, 255, 0.20)");
    // 4. Smooth fade to transparent at edge
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // 3. Refined 4-point Star Lenslet Flare Texture for Hero Stars (✦)
  const heroStarHaloTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const cx = 64;
    const cy = 64;

    // Soft spherical bloom core
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 48);
    radGrad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    radGrad.addColorStop(0.20, "rgba(235, 245, 255, 0.75)");
    radGrad.addColorStop(0.48, "rgba(186, 215, 255, 0.28)");
    radGrad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 128, 128);

    // Fine horizontal diffraction spike
    const hGrad = ctx.createLinearGradient(0, cy, 128, cy);
    hGrad.addColorStop(0.0, "rgba(255, 255, 255, 0)");
    hGrad.addColorStop(0.35, "rgba(224, 242, 254, 0.40)");
    hGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
    hGrad.addColorStop(0.65, "rgba(224, 242, 254, 0.40)");
    hGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, cy - 2, 128, 4);

    // Fine vertical diffraction spike
    const vGrad = ctx.createLinearGradient(cx, 0, cx, 128);
    vGrad.addColorStop(0.0, "rgba(255, 255, 255, 0)");
    vGrad.addColorStop(0.35, "rgba(224, 242, 254, 0.40)");
    vGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
    vGrad.addColorStop(0.65, "rgba(224, 242, 254, 0.40)");
    vGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = vGrad;
    ctx.fillRect(cx - 2, 0, 4, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // 4. Faint Atmospheric Deep-Space Haze Texture
  const hazeTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const cx = 64;
    const cy = 64;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    grad.addColorStop(0.0, "rgba(99, 102, 241, 0.12)"); // celestial indigo
    grad.addColorStop(0.35, "rgba(139, 92, 246, 0.06)"); // soft violet
    grad.addColorStop(0.70, "rgba(56, 189, 248, 0.02)"); // faint cyan
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // 5. Continuous Data-Transmission Signal Path Line
  const [trailLineGeo, trailLineMat] = useMemo(() => {
    const divisions = 100;
    const points = trajectoryCurve.getPoints(divisions);
    const positions = new Float32Array((divisions + 1) * 3);
    const colors = new Float32Array((divisions + 1) * 3);

    const colCloud = new THREE.Color("#8b5cf6"); // Cloud violet
    const colMid = new THREE.Color("#38bdf8");   // Celestial cyan
    const colDec = new THREE.Color("#e0f2fe");   // Pale white/cyan decision palette
    const tempCol = new THREE.Color();

    for (let i = 0; i <= divisions; i++) {
      const pt = points[i];
      positions[i * 3 + 0] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;

      const u = i / divisions;
      if (u < 0.5) {
        tempCol.copy(colCloud).lerp(colMid, u * 2);
      } else {
        tempCol.copy(colMid).lerp(colDec, (u - 0.5) * 2);
      }
      colors[i * 3 + 0] = tempCol.r;
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
      linewidth: 1.5,
    });

    return [geo, mat];
  }, [trajectoryCurve]);

  const trailLine = useMemo(
    () => new THREE.Line(trailLineGeo, trailLineMat),
    [trailLineGeo, trailLineMat]
  );

  // 6. Streaming Network Data Quanta along the Signal Path (Soft Luminous Orbs)
  const [quantaGeo, quantaMat] = useMemo(() => {
    const count = NUM_DATA_QUANTA;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.068,
      map: starGlowTexture || undefined,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return [geo, mat];
  }, [starGlowTexture]);

  // 7. Mid Distance & Near Accent Stars (240 points total: 60 near, 180 mid)
  // ~75–80% Neutral (soft white, cool white, pale blue-white)
  // ~10–15% Technical Accents (cyan, deep blue, violet, lavender)
  // ~5–10% Subtle Warm Gold Accents (#D6B36A to #E8C873)
  const { galaxyGeo, galaxyMat, galaxyBaseData } = useMemo(() => {
    const count = NUM_GALAXY_PARTICLES;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const baseData = [];
    const colSoftWhite = new THREE.Color("#f8fafc");
    const colCoolWhite = new THREE.Color("#e2e8f0");
    const colPaleBlue = new THREE.Color("#e0f2fe");
    const colCyan = new THREE.Color("#38bdf8");
    const colDeepBlue = new THREE.Color("#60a5fa");
    const colViolet = new THREE.Color("#c084fc");
    const colLavender = new THREE.Color("#ddd6fe");
    // Subtle Formal Gold Palette (#D6B36A to #E8C873)
    const colGoldWarm = new THREE.Color("#d6b36a");
    const colGoldAmber = new THREE.Color("#dfbf74");
    const colGoldLuminous = new THREE.Color("#e8c873");
    const tempCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const uBase = 0.04 + (i / count) * 0.92;
      const spiralAngle = uBase * Math.PI * 2.8 + (i * 137.5 * Math.PI) / 180;
      const envelope = Math.sin(uBase * Math.PI);

      // Depth layer separation: ~25% Near Accent Layer, ~75% Mid Distance Layer
      const isNear = i % 4 === 0;
      const radius = isNear
        ? 0.35 + envelope * 0.55 + (((i * 31) % 100) / 100) * 0.28   // Near: closer to corridor [0.35, 0.90]
        : 0.75 + envelope * 1.10 + (((i * 47) % 100) / 100) * 0.45;  // Mid: moderate dispersion [0.75, 1.85]

      const parallaxFactor = isNear ? 0.14 : 0.08;

      const pt = trajectoryCurve.getPoint(uBase);
      const tangent = trajectoryCurve.getTangent(uBase);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      const offsetX = Math.cos(spiralAngle) * radius;
      const offsetY = Math.sin(spiralAngle) * radius * 0.70;
      const offsetZ = Math.sin(spiralAngle * 1.5) * 0.50;

      const px = pt.x + normal.x * offsetX + binormal.x * offsetY;
      const py = pt.y + normal.y * offsetX + binormal.y * offsetY;
      const pz = pt.z + normal.z * offsetX + binormal.z * offsetY + offsetZ;

      positions[i * 3 + 0] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      // Color Hierarchy:
      // ~7.5% Warm Gold (~18 stars across transit): #D6B36A to #E8C873
      const isGold = (i % 13 === 4);
      // ~12.5% Technical Accents (~30 stars): Cyan / Blue / Violet
      const isTechnicalAccent = !isGold && (i % 8 === 0);

      if (isGold) {
        if (i % 3 === 0) tempCol.copy(colGoldLuminous);
        else if (i % 3 === 1) tempCol.copy(colGoldAmber);
        else tempCol.copy(colGoldWarm);
      } else if (isTechnicalAccent) {
        if (uBase < 0.35) {
          tempCol.copy(i % 16 === 0 ? colViolet : colLavender);
        } else if (uBase < 0.70) {
          tempCol.copy(i % 16 === 0 ? colDeepBlue : colCyan);
        } else {
          tempCol.copy(i % 16 === 0 ? colCyan : colPaleBlue);
        }
      } else {
        // ~80% Neutral Stars: Soft white, cool white, pale blue-white
        if (i % 3 === 0) {
          tempCol.copy(colSoftWhite);
        } else if (i % 3 === 1) {
          tempCol.copy(colCoolWhite);
        } else {
          tempCol.copy(colPaleBlue);
        }
      }

      // Slightly calm the luminance for mid-distance stars while keeping near accents brilliant
      if (!isNear) {
        tempCol.multiplyScalar(0.88);
      }

      colors[i * 3 + 0] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;

      baseData.push({
        uBase,
        radius,
        spiralAngle,
        normal: normal.clone(),
        binormal: binormal.clone(),
        tangent: tangent.clone(),
        phase: (i * 0.73) % (Math.PI * 2),
        parallaxFactor,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Size 0.084 provides pinpoint bright core (0.025) + soft luminous optical halo (0.084)
    const mat = new THREE.PointsMaterial({
      size: 0.084,
      map: starGlowTexture || undefined,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { galaxyGeo: geo, galaxyMat: mat, galaxyBaseData: baseData };
  }, [trajectoryCurve, starGlowTexture]);

  // 8. Far Distance Backdrop Stars (80 Tiny Pinpoints, Dim, Mostly Cool White, Slow Parallax)
  const { distantGeo, distantMat, distantBaseData } = useMemo(() => {
    const count = NUM_DISTANT_STARS;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseData = [];

    const colWhite = new THREE.Color("#f1f5f9");
    const colCool = new THREE.Color("#cbd5e1");
    const colFaintCyan = new THREE.Color("#93c5fd");
    const colDistantGold = new THREE.Color("#dfbf74");
    const tempCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const u = 0.05 + (i / count) * 0.90;
      const pt = trajectoryCurve.getPoint(u);
      const angle = (i * 137.5 * Math.PI) / 180;
      const radius = 2.4 + (((i * 59) % 100) / 100) * 2.4;
      const zOffset = Math.sin(angle * 2.3) * 1.3 - 1.8; // deeply set back

      positions[i * 3 + 0] = pt.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = pt.y + Math.sin(angle) * radius * 0.75;
      positions[i * 3 + 2] = pt.z + zOffset;

      // ~6% Warm Gold (5 stars out of 80)
      if (i === 8 || i === 24 || i === 40 || i === 56 || i === 72) {
        tempCol.copy(colDistantGold);
      }
      // ~12.5% Faint Cyan (10 stars out of 80)
      else if (i % 8 === 2) {
        tempCol.copy(colFaintCyan);
      }
      // ~81.5% Neutral Cool White / Slate (65 stars out of 80)
      else if (i % 2 === 0) {
        tempCol.copy(colCool);
      } else {
        tempCol.copy(colWhite);
      }

      // Subtle dimming for authentic distant celestial perspective
      tempCol.multiplyScalar(0.80);

      colors[i * 3 + 0] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;

      baseData.push({
        u,
        angle,
        radius,
        zOffset,
        phase: (i * 0.41) % (Math.PI * 2),
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Size 0.052 gives very tiny, faint pinpoints with minimal halo
    const mat = new THREE.PointsMaterial({
      size: 0.052,
      map: starGlowTexture || undefined,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { distantGeo: geo, distantMat: mat, distantBaseData: baseData };
  }, [trajectoryCurve, starGlowTexture]);

  // 9. Six Hero Stars (Strongest Glow with Crystalline Octahedron Core + 4-point Lenslet Flare)
  const beaconCoreGeo = useMemo(() => new THREE.OctahedronGeometry(0.038, 0), []);
  const beaconHaloGeo = useMemo(() => new THREE.PlaneGeometry(0.30, 0.30), []);

  const beaconConfigs = useMemo(() => [
    { u: 0.18, angle: 0.6, radius: 0.75, phase: 0.0, color: "#c084fc", label: "violet" },     // Near Cloud
    { u: 0.32, angle: 2.1, radius: 0.88, phase: 1.2, color: "#ddd6fe", label: "lavender" },   // Cloud exit
    { u: 0.46, angle: 3.8, radius: 0.70, phase: 2.4, color: "#60a5fa", label: "deep-blue" },  // WAN apex
    { u: 0.58, angle: 5.2, radius: 0.82, phase: 3.6, color: "#f8fafc", label: "cool-white" }, // Deep space
    { u: 0.70, angle: 1.4, radius: 0.72, phase: 4.8, color: "#38bdf8", label: "cyan" },       // Decision approach
    { u: 0.82, angle: 3.0, radius: 0.78, phase: 6.0, color: "#e0f2fe", label: "pale-cyan" },   // Decision threshold
  ], []);

  // 10. Two Subtle Golden Accent Stars (Muted Amber-Gold Core + Soft Warm Halo)
  const goldBeaconCoreGeo = useMemo(() => new THREE.OctahedronGeometry(0.024, 0), []);
  const goldBeaconHaloGeo = useMemo(() => new THREE.PlaneGeometry(0.14, 0.14), []);

  const goldBeaconConfigs = useMemo(() => [
    { u: 0.38, angle: 1.8, radius: 0.84, phase: 1.5, color: "#e8c873" }, // Soft gold in Cloud->Transit
    { u: 0.65, angle: 4.4, radius: 0.86, phase: 4.2, color: "#dfbf74" }, // Muted gold in Transit->Decision
  ], []);

  // Frame Update Loop: scrubbed smoothly by scrollState.visualProgress
  useFrame((state) => {
    const fullP = Math.max(scrollState.visualProgress, 0);
    const t = state.clock.getElapsedTime();

    // ==================================================
    // 1. SCROLL-DRIVEN OPACITY ENVELOPE (1.00 -> 1.20)
    // ==================================================
    const fadeIn = smoothstep(1.00, 1.06, fullP);
    const fadeOut = smoothstep(1.14, 1.20, fullP);
    const cosmicOpacity = fadeIn * (1 - fadeOut);

    if (cosmicOpacity <= 0.001) {
      if (containerRef.current) containerRef.current.visible = false;
      return;
    }

    if (containerRef.current) containerRef.current.visible = true;

    // Normalized progress across corridor [0, 1]
    const transitionP = smoothstep(1.00, 1.16, fullP);

    // ==================================================
    // 2. DATA-TRANSMISSION SIGNAL TRAIL & QUANTA
    // ==================================================
    trailLineMat.opacity = 0.50 * cosmicOpacity;
    const drawCount = Math.max(2, Math.floor(transitionP * 100) + 1);
    trailLineGeo.setDrawRange(0, drawCount);

    quantaMat.opacity = 0.88 * cosmicOpacity;
    const quantaPosAttr = quantaGeo.attributes.position as THREE.BufferAttribute;
    const quantaColAttr = quantaGeo.attributes.color as THREE.BufferAttribute;
    const qCount = NUM_DATA_QUANTA;
    const tempPt = new THREE.Vector3();
    const tempCol = new THREE.Color();
    const colViolet = new THREE.Color("#c084fc");
    const colCyan = new THREE.Color("#38bdf8");

    for (let i = 0; i < qCount; i++) {
      const offset = i / qCount;
      const cycle = ((transitionP * 1.2) + t * 0.16 + offset) % 1.0;
      const u = cycle * Math.min(transitionP + 0.08, 1.0);

      trajectoryCurve.getPoint(u, tempPt);
      quantaPosAttr.setXYZ(i, tempPt.x, tempPt.y + Math.sin(t * 2.8 + i) * 0.012, tempPt.z);

      tempCol.copy(colViolet).lerp(colCyan, u);
      quantaColAttr.setXYZ(i, tempCol.r, tempCol.g, tempCol.b);
    }
    quantaPosAttr.needsUpdate = true;
    quantaColAttr.needsUpdate = true;

    // ==================================================
    // 3. LUMINOUS GALAXY PARTICLE BAND & FORWARD TRAVEL
    // ==================================================
    galaxyMat.opacity = 0.85 * cosmicOpacity;
    distantMat.opacity = 0.40 * cosmicOpacity;

    if (hazeMatRef.current) {
      hazeMatRef.current.opacity = 0.045 * cosmicOpacity;
    }

    const gPosAttr = galaxyGeo.attributes.position as THREE.BufferAttribute;
    const scrollTravelOffset = (fullP - 1.00) * 0.35; // gentle forward drift

    for (let i = 0; i < NUM_GALAXY_PARTICLES; i++) {
      const data = galaxyBaseData[i];
      const effectiveU = Math.min(Math.max(data.uBase + scrollTravelOffset * data.parallaxFactor, 0.01), 0.99);
      const pt = trajectoryCurve.getPoint(effectiveU);

      const subtleTwinkle = Math.sin(t * 2.2 + data.phase) * 0.04;
      const r = data.radius + subtleTwinkle;

      const px = pt.x + data.normal.x * Math.cos(data.spiralAngle) * r;
      const py = pt.y + data.binormal.y * Math.sin(data.spiralAngle) * r;
      const pz = pt.z + Math.sin(data.spiralAngle * 1.5) * 0.45;

      gPosAttr.setXYZ(i, px, py, pz);
    }
    gPosAttr.needsUpdate = true;

    // Distant Stars Slow Parallax
    const dPosAttr = distantGeo.attributes.position as THREE.BufferAttribute;
    const distantTravelOffset = scrollTravelOffset * 0.035;

    for (let i = 0; i < NUM_DISTANT_STARS; i++) {
      const dData = distantBaseData[i];
      const effectiveU = Math.min(Math.max(dData.u + distantTravelOffset, 0.01), 0.99);
      const pt = trajectoryCurve.getPoint(effectiveU);

      const px = pt.x + Math.cos(dData.angle) * dData.radius;
      const py = pt.y + Math.sin(dData.angle) * dData.radius * 0.75;
      const pz = pt.z + dData.zOffset;

      dPosAttr.setXYZ(i, px, py, pz);
    }
    dPosAttr.needsUpdate = true;

    // ==================================================
    // 4. SIX HERO BEACON STARS (Restrained Luminous Glow)
    // ==================================================
    for (let i = 0; i < NUM_BEACON_STARS; i++) {
      const cfg = beaconConfigs[i];
      const coreMesh = beaconCoresRef.current[i];
      const haloMesh = beaconHalosRef.current[i];
      const coreMat = beaconCoreMatsRef.current[i];
      const haloMat = beaconHaloMatsRef.current[i];

      if (!coreMesh || !haloMesh || !coreMat || !haloMat) continue;

      const pt = trajectoryCurve.getPoint(cfg.u);
      const tangent = trajectoryCurve.getTangent(cfg.u);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      const orbitAngle = cfg.angle + t * 0.32 + cfg.phase;
      const r = cfg.radius + Math.sin(t * 1.6 + cfg.phase) * 0.04;

      const starPos = pt.clone()
        .addScaledVector(normal, Math.cos(orbitAngle) * r)
        .addScaledVector(binormal, Math.sin(orbitAngle) * r * 0.75);

      coreMesh.position.copy(starPos);
      haloMesh.position.copy(starPos);

      // Billboard orientation toward camera
      haloMesh.quaternion.copy(state.camera.quaternion);

      const twinkle = Math.sin(t * 3.2 + cfg.phase) * 0.18 + 0.82;
      coreMat.opacity = 0.92 * cosmicOpacity;
      coreMat.emissiveIntensity = 2.0 * twinkle;
      haloMat.opacity = 0.55 * cosmicOpacity * twinkle;
    }

    // ==================================================
    // 5. TWO SUBTLE GOLD ACCENT STARS (Muted Warm Halo)
    // ==================================================
    for (let i = 0; i < goldBeaconConfigs.length; i++) {
      const cfg = goldBeaconConfigs[i];
      const coreMesh = goldBeaconCoresRef.current[i];
      const haloMesh = goldBeaconHalosRef.current[i];
      const coreMat = goldBeaconCoreMatsRef.current[i];
      const haloMat = goldBeaconHaloMatsRef.current[i];

      if (!coreMesh || !haloMesh || !coreMat || !haloMat) continue;

      const pt = trajectoryCurve.getPoint(cfg.u);
      const tangent = trajectoryCurve.getTangent(cfg.u);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      const orbitAngle = cfg.angle + t * 0.25 + cfg.phase;
      const r = cfg.radius + Math.sin(t * 1.4 + cfg.phase) * 0.03;

      const starPos = pt.clone()
        .addScaledVector(normal, Math.cos(orbitAngle) * r)
        .addScaledVector(binormal, Math.sin(orbitAngle) * r * 0.75);

      coreMesh.position.copy(starPos);
      haloMesh.position.copy(starPos);

      // Billboard orientation toward camera
      haloMesh.quaternion.copy(state.camera.quaternion);

      const twinkle = Math.sin(t * 2.6 + cfg.phase) * 0.14 + 0.86;
      coreMat.opacity = 0.90 * cosmicOpacity;
      coreMat.emissiveIntensity = 1.3 * twinkle;
      haloMat.opacity = 0.36 * cosmicOpacity * twinkle;
    }
  });

  return (
    <group ref={containerRef} visible={false}>
      {/* 1. Subtle Atmospheric Deep-Space Haze (Apex region, extremely low opacity) */}
      <mesh
        ref={hazeMeshRef}
        position={[20.2, 1.25, -0.60]}
        rotation={[0.1, -0.3, 0]}
      >
        <planeGeometry args={[5.5, 3.2]} />
        <meshBasicMaterial
          ref={hazeMatRef}
          map={hazeTexture || undefined}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Continuous Data Signal Transmission Line (Cloud -> Decision) */}
      <primitive object={trailLine} />

      {/* 3. Streaming Data Quanta along Signal Path */}
      <points ref={quantaPointsRef} geometry={quantaGeo} material={quantaMat} />

      {/* 4. Subliminal Galaxy / Star-Stream Particle Band */}
      <points ref={galaxyPointsRef} geometry={galaxyGeo} material={galaxyMat} />

      {/* 5. Sparse Distant Deep Space Stars */}
      <points ref={distantPointsRef} geometry={distantGeo} material={distantMat} />

      {/* 6. Six Restrained Hero Beacon Stars (White -> Cyan -> Blue -> Violet) */}
      {beaconConfigs.map((cfg, i) => {
        const coreMat = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          emissive: cfg.color,
          emissiveIntensity: 2.0,
          roughness: 0.12,
          transparent: true,
          opacity: 0,
        });
        const haloMat = new THREE.MeshBasicMaterial({
          map: heroStarHaloTexture || undefined,
          color: cfg.color,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        beaconCoreMatsRef.current[i] = coreMat;
        beaconHaloMatsRef.current[i] = haloMat;

        return (
          <group key={`hero-beacon-${i}`}>
            <mesh
              ref={(el) => {
                if (el) beaconCoresRef.current[i] = el;
              }}
              geometry={beaconCoreGeo}
              material={coreMat}
            />
            <mesh
              ref={(el) => {
                if (el) beaconHalosRef.current[i] = el;
              }}
              geometry={beaconHaloGeo}
              material={haloMat}
            />
          </group>
        );
      })}

      {/* 7. Two Subtle Warm Gold Accent Stars (#D6B36A to #E8C873) */}
      {goldBeaconConfigs.map((cfg, i) => {
        const coreMat = new THREE.MeshStandardMaterial({
          color: "#ffffff",
          emissive: cfg.color,
          emissiveIntensity: 1.3,
          roughness: 0.15,
          transparent: true,
          opacity: 0,
        });
        const haloMat = new THREE.MeshBasicMaterial({
          map: starGlowTexture || undefined,
          color: cfg.color,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        goldBeaconCoreMatsRef.current[i] = coreMat;
        goldBeaconHaloMatsRef.current[i] = haloMat;

        return (
          <group key={`gold-beacon-${i}`}>
            <mesh
              ref={(el) => {
                if (el) goldBeaconCoresRef.current[i] = el;
              }}
              geometry={goldBeaconCoreGeo}
              material={coreMat}
            />
            <mesh
              ref={(el) => {
                if (el) goldBeaconHalosRef.current[i] = el;
              }}
              geometry={goldBeaconHaloGeo}
              material={haloMat}
            />
          </group>
        );
      })}
    </group>
  );
}
