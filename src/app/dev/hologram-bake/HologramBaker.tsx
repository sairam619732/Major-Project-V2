"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { applyBakeHologram, createBakeHologramMaterial, renderEncodedGlow } from "@/lib/three/hologramBake";
import { createTabletScreenTexture, drawLandingTabletScreen } from "@/lib/three/tabletScreens";
import type { HologramView } from "@/lib/three/hologramViews";

/**
 * Renders every model placement once from its usual viewing direction and saves two images per
 * placement to public/assets/holo, plus the plane layout to src/lib/three/hologramViews.json:
 *   <id>-holo.webp  steady hologram glow (grey; the site tints and animates it)
 *   <id>-real.webp  the real, lit model (only where the hover reveal shows it)
 * Positions, rotations, materials and lights mirror the components the images replace.
 */

const URLS = {
  tablet: "/assets/device/sci_fi_tablet.glb",
  rack: "/assets/edge/data_center_rack.glb",
  cloud: "/assets/cloud/cloud_datacenter_clean.glb",
};
type Kind = keyof typeof URLS;
type Vec3 = [number, number, number];

interface Placement {
  id: string;
  kind: Kind;
  /** Group transform as in the scene (landing / decision). */
  position?: Vec3;
  rotation: Vec3;
  scale?: number;
  inner?: Vec3; // inner group rotation (the tablet model lies in the X-Z plane)
  offset?: Vec3; // model offset inside the group (the rack is lifted to sit on its base)
  /** Simulation: scale the rotated model so its largest extent is this, centred on the group. */
  normalize?: number;
  /** Where the camera usually is (perspective scenes) or a fixed view direction (orthographic). */
  camera?: Vec3;
  dir?: Vec3;
  side: THREE.Side;
  detail: number;
  real: boolean;
  px: number;
}

const HALF_PI = Math.PI / 2;
// Decision camera: framing distance from ScrollCameraController at a 1440×900 viewport.
const DECISION_CAMERA: Vec3 = [26, 0.5, 11];

const PLACEMENTS: Placement[] = [
  // Landing story sections (hover reveal → real image too). Cameras: settled section framings.
  { id: "landing-local", kind: "tablet", position: [2.5, 0, 0], rotation: [0.12, -0.42, 0.03], scale: 0.88, inner: [HALF_PI, 0, 0], camera: [0.45, 0.12, 5.72], side: THREE.DoubleSide, detail: 0.35, real: true, px: 1600 },
  { id: "landing-edge", kind: "rack", position: [8.2, 0, -1], rotation: [0.08, -1.75, 0], scale: 0.9, offset: [0, -1.157, 0], camera: [6.35, 0.16, 5.15], side: THREE.DoubleSide, detail: 0.9, real: true, px: 1600 },
  { id: "landing-cloud", kind: "cloud", position: [16.7, -0.7, -2.1], rotation: [0.03, -1.15, 0], scale: 0.29, camera: [13.45, 2.2, 4.65], side: THREE.FrontSide, detail: 0, real: true, px: 1600 },
  // Decision constellation (hologram only).
  { id: "decision-local", kind: "tablet", position: [26, 1.85, 0], rotation: [0.1, -0.04, 0], scale: 0.22, inner: [HALF_PI, 0, 0], camera: DECISION_CAMERA, side: THREE.DoubleSide, detail: 0.35, real: false, px: 1024 },
  { id: "decision-edge", kind: "rack", position: [25.05, -0.95, 0], rotation: [0.08, -1.75, 0], scale: 0.26, offset: [0, -1.157, 0], camera: DECISION_CAMERA, side: THREE.DoubleSide, detail: 0.9, real: false, px: 1024 },
  { id: "decision-cloud", kind: "cloud", position: [26.95, -1.05, 0], rotation: [0.03, -1.15, 0], scale: 0.058, camera: DECISION_CAMERA, side: THREE.FrontSide, detail: 0, real: false, px: 1024 },
  // Simulation topology (orthographic camera looking down -Z, hologram only).
  { id: "sim-local", kind: "tablet", rotation: [1.72, 0, 0], normalize: 2.85, dir: [0, 0, 1], side: THREE.DoubleSide, detail: 0, real: false, px: 1024 },
  { id: "sim-edge", kind: "rack", rotation: [0.12, -1.9, 0], normalize: 2.3, dir: [0, 0, 1], side: THREE.DoubleSide, detail: 0, real: false, px: 1024 },
  { id: "sim-cloud", kind: "cloud", rotation: [0.3, -0.85, 0], normalize: 2.65, dir: [0, 0, 1], side: THREE.FrontSide, detail: 0, real: false, px: 1024 },
];

// ---------- Real (PBR) look, as set up by ComputingDevice / EdgeServer / CloudDatacenter ----------

function setupRealTablet(root: THREE.Object3D, screen: THREE.Texture) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.roughness = Math.max(0.2, Math.min(mat.roughness ?? 0.5, 0.52));
    mat.metalness = Math.min(mat.metalness ?? 0.8, 0.62);
    mat.envMapIntensity = 1.4;
    if (mesh.name.toLowerCase().includes("screen")) {
      mat.map = screen;
      mat.emissiveMap = screen;
      mat.emissive = new THREE.Color("#ffffff");
      mat.emissiveIntensity = 1.8;
      mat.roughness = 0.1;
      mat.metalness = 0.05;
    }
    if (mesh.name.toLowerCase().includes("emmis") || mat.name.toLowerCase().includes("emmis")) {
      mat.emissive = new THREE.Color("#38bdf8");
      mat.emissiveIntensity = 2.6;
    }
    mat.needsUpdate = true;
  });
}

function setupRealRack(root: THREE.Object3D, group: THREE.Group) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
      const mat = m as THREE.MeshStandardMaterial;
      mat.envMapIntensity = 1.4;
      if (mat.name === "material") {
        mat.roughness = 0.38;
        mat.metalness = 0.75;
        mat.color = new THREE.Color("#11151e");
      } else if (mat.name === "Mat_1") {
        mat.transparent = true;
        mat.opacity = 0.18;
        mat.roughness = 0.08;
        mat.metalness = 0.15;
        mat.color = new THREE.Color("#0a0f18");
      } else {
        mat.roughness = 0.28;
        mat.metalness = 0.5;
        const isEmissive =
          mat.name === "Mat_2" ||
          (mat.emissive && mat.emissive.getHex() > 0) ||
          mat.emissiveMap !== null ||
          mat.name.toLowerCase().includes("emmis") ||
          mesh.name.toLowerCase().includes("emmis");
        if (isEmissive) {
          mat.emissive = new THREE.Color("#05df72");
          mat.emissiveIntensity = 2.4;
        }
      }
      mat.needsUpdate = true;
    });
  });
  const lights: [string, number, number, number, Vec3][] = [
    ["#10f08e", 3.6, 4.8, 2.0, [0.6, 0.15, 0]],
    ["#05df72", 1.8, 3.5, 2.0, [0.55, 0.7, 0]],
    ["#10b981", 1.5, 3.2, 2.0, [0.55, -0.6, 0]],
    ["#06b6d4", 2.6, 5.0, 1.8, [-0.9, 1.1, 0]],
    ["#f1f5f9", 1.8, 6.0, 1.8, [1.8, 0.8, -0.6]],
  ];
  for (const [color, intensity, distance, decay, position] of lights) {
    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.position.set(...position);
    group.add(light);
  }
}

function setupRealCloud(root: THREE.Object3D, group: THREE.Group) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.envMapIntensity = 1.4;
    const isEmissive =
      (mat.emissive && mat.emissive.getHex() > 0) ||
      mat.name.toUpperCase().includes("EMISSIVE") ||
      mesh.name.toUpperCase().includes("EMISSIVE");
    if (isEmissive) {
      mat.emissiveIntensity = Math.min(Math.max(mat.emissiveIntensity || 1, 1.2), 2.8);
    } else {
      mat.roughness = Math.max(0.2, Math.min(mat.roughness ?? 0.35, 0.6));
      mat.metalness = Math.max(0.25, Math.min(mat.metalness ?? 0.6, 0.75));
    }
    mat.needsUpdate = true;
  });
  const lights: [string, number, number, Vec3][] = [
    ["#8b5cf6", 3.0, 8.5, [0, 1.4, 0]],
    ["#21ceff", 1.8, 6.5, [-1.5, 1.0, 3.8]],
    ["#f1f5f9", 2.6, 10.0, [-2.0, 4.5, 1.0]],
    ["#aa35ff", 3.4, 9.0, [2.5, 3.5, -4.5]],
    ["#94a3b8", 1.6, 7.0, [1.8, 0.6, 4.5]],
  ];
  for (const [color, intensity, distance, position] of lights) {
    const light = new THREE.PointLight(color, intensity, distance, 1.8);
    light.position.set(...position);
    group.add(light);
  }
}

/** The landing canvas lights (SceneCanvas). */
function addLandingLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight("#334155", 1.1));
  const directional: [string, number, Vec3][] = [
    ["#ffffff", 3.8, [4, 5, 5]],
    ["#f8fafc", 2.2, [1.5, 1.5, 4.5]],
    ["#38bdf8", 4.8, [5, 2, -3]],
    ["#0284c7", 1.8, [-3, 4, -4]],
    ["#94a3b8", 1.2, [-4, 0, 3]],
  ];
  for (const [color, intensity, position] of directional) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  }
  const point = new THREE.PointLight("#0284c7", 1.6, 5.0);
  point.position.set(2.5, 0, -1);
  scene.add(point);
}

// ---------- Framing ----------

const DIST = 50;
const round = (v: number) => Math.round(v * 1e5) / 1e5;

/** Camera-space x/y bounds of every vertex under `root` (instances use their bounding boxes). */
function projectedBounds(root: THREE.Object3D, camera: THREE.Camera) {
  const box = new THREE.Box2(new THREE.Vector2(Infinity, Infinity), new THREE.Vector2(-Infinity, -Infinity));
  const v = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const toCamera = new THREE.Matrix4();
  const add = () => box.expandByPoint(new THREE.Vector2(v.x, v.y));
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const geometry = mesh.geometry;
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
      const instanced = mesh as THREE.InstancedMesh;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const bb = geometry.boundingBox!;
      for (let i = 0; i < instanced.count; i++) {
        instanced.getMatrixAt(i, m);
        toCamera.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld).multiply(m);
        for (let c = 0; c < 8; c++) {
          v.set(c & 1 ? bb.max.x : bb.min.x, c & 2 ? bb.max.y : bb.min.y, c & 4 ? bb.max.z : bb.min.z).applyMatrix4(toCamera);
          add();
        }
      }
      return;
    }
    toCamera.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(toCamera);
      add();
    }
  });
  return box;
}

/** Front-facing triangles of the tablet screen, in plane coordinates (−0.5…0.5) with their UVs. */
function screenOverlay(mesh: THREE.Mesh, camera: THREE.Camera, frame: THREE.Box2, dir: THREE.Vector3) {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const index = geometry.index;
  const count = index ? index.count : position.count;
  const size = frame.getSize(new THREE.Vector2());
  const center = frame.getCenter(new THREE.Vector2());
  const world = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const normal = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let t = 0; t < count; t += 3) {
    const ids = [0, 1, 2].map((k) => (index ? index.getX(t + k) : t + k));
    ids.forEach((id, k) => world[k].fromBufferAttribute(position, id).applyMatrix4(mesh.matrixWorld));
    normal.subVectors(world[1], world[0]).cross(edge.subVectors(world[2], world[0]));
    if (normal.dot(dir) <= 0) continue;
    ids.forEach((id, k) => {
      const p = world[k].clone().applyMatrix4(camera.matrixWorldInverse);
      positions.push(round((p.x - center.x) / size.x), round((p.y - center.y) / size.y));
      uvs.push(round(uv.getX(id)), round(uv.getY(id)));
    });
  }
  return { positions, uvs };
}

// ---------- Baking ----------

async function save(name: string, body: Record<string, unknown>) {
  const res = await fetch("/dev/hologram-bake/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, ...body }),
  });
  if (!res.ok) throw new Error(`Saving ${name} failed: ${res.status}`);
}

function cloneModel(scene: THREE.Object3D) {
  const clone = scene.clone(true);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
  });
  return clone;
}

async function bakePlacement(gl: THREE.WebGLRenderer, models: Record<Kind, THREE.Object3D>, p: Placement, log: (s: string) => void) {
  const scene = new THREE.Scene();
  const model = cloneModel(models[p.kind]);
  const group = new THREE.Group();
  const groupScale = p.normalize ? 1 : p.scale ?? 1;
  const groupPosition = new THREE.Vector3(...(p.normalize ? [0, 0, 0] as Vec3 : p.position ?? [0, 0, 0]));

  if (p.normalize) {
    // Same normalisation as the simulation's Candidate component.
    model.rotation.set(...p.rotation);
    model.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model);
    const extent = box.getSize(new THREE.Vector3());
    model.scale.setScalar(p.normalize / Math.max(extent.x, extent.y, extent.z));
    model.updateWorldMatrix(true, true);
    box.setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    group.add(model);
  } else {
    group.position.copy(groupPosition);
    group.rotation.set(...p.rotation);
    group.scale.setScalar(groupScale);
    const inner = new THREE.Group();
    if (p.inner) inner.rotation.set(...p.inner);
    if (p.offset) model.position.set(...p.offset);
    inner.add(model);
    group.add(inner);
  }
  scene.add(group);
  scene.updateMatrixWorld(true);

  const screenMesh = (() => {
    let found: THREE.Mesh | null = null;
    model.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && c.name.toLowerCase().includes("screen")) found = c as THREE.Mesh;
    });
    return found as THREE.Mesh | null;
  })();

  // View direction: from the model's centre toward the usual camera, or fixed.
  const centre = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  const dir = p.dir ? new THREE.Vector3(...p.dir) : new THREE.Vector3(...p.camera!).sub(centre);
  dir.normalize();

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, DIST * 4);
  camera.position.copy(centre).addScaledVector(dir, DIST);
  camera.up.set(0, 1, 0);
  camera.lookAt(centre);
  camera.updateMatrixWorld(true);

  const content = projectedBounds(model, camera);
  const contentSize = content.getSize(new THREE.Vector2());
  const frame = content.clone().expandByScalar(0.02 * Math.max(contentSize.x, contentSize.y));
  const size = frame.getSize(new THREE.Vector2());
  camera.left = frame.min.x;
  camera.right = frame.max.x;
  camera.bottom = frame.min.y;
  camera.top = frame.max.y;
  camera.updateProjectionMatrix();

  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const width = size.x >= size.y ? p.px : even((p.px * size.x) / size.y);
  const height = size.x >= size.y ? even((p.px * size.y) / size.x) : p.px;
  gl.setPixelRatio(1);
  gl.setSize(width, height, false);
  gl.setClearColor(0x000000, 0);
  gl.outputColorSpace = THREE.SRGBColorSpace;

  // Real look first (the hologram pass below replaces the materials).
  if (p.real) {
    addLandingLights(scene);
    if (p.kind === "tablet") setupRealTablet(model, createTabletScreenTexture(drawLandingTabletScreen).texture);
    if (p.kind === "rack") setupRealRack(model, group);
    if (p.kind === "cloud") setupRealCloud(model, group);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.clear();
    gl.render(scene, camera);
    await save(`${p.id}-real.webp`, { dataUrl: gl.domElement.toDataURL("image/webp", 0.92) });
    log(`${p.id}-real.webp (${width}×${height})`);
  }

  // Hologram glow. The tablet screen is drawn live on top in the site, so it is left out here.
  const overlay = screenMesh ? screenOverlay(screenMesh, camera, frame, dir) : undefined;
  if (screenMesh) screenMesh.visible = false;
  applyBakeHologram(model, createBakeHologramMaterial(p.side), p.detail);
  gl.toneMapping = THREE.NoToneMapping;
  renderEncodedGlow(gl, scene, camera, width, height);
  await save(`${p.id}-holo.webp`, { dataUrl: gl.domElement.toDataURL("image/webp", 0.92) });
  log(`${p.id}-holo.webp (${width}×${height})${overlay ? `, screen: ${overlay.positions.length / 6} triangles` : ""}`);

  // Plane layout in the component's group space (world axes, before the group's scale).
  const planeCentre = new THREE.Vector3(...frame.getCenter(new THREE.Vector2()).toArray(), -DIST).applyMatrix4(camera.matrixWorld);
  planeCentre.sub(groupPosition).divideScalar(groupScale);
  const view: HologramView = {
    real: p.real,
    center: planeCentre.toArray().map(round) as Vec3,
    size: [round(size.x / groupScale), round(size.y / groupScale)],
    dir: dir.toArray().map(round) as Vec3,
    content: [
      round((content.min.x - frame.min.x) / size.x),
      round((content.min.y - frame.min.y) / size.y),
      round((content.max.x - frame.min.x) / size.x),
      round((content.max.y - frame.min.y) / size.y),
    ],
    ...(overlay ? { screen: overlay } : {}),
  };
  return view;
}

function Baker({ onReady }: { onReady: (run: () => Promise<void>) => void }) {
  const gl = useThree((s) => s.gl);
  const tablet = useGLTF(URLS.tablet).scene;
  const rack = useGLTF(URLS.rack).scene;
  const cloud = useGLTF(URLS.cloud).scene;
  useEffect(() => {
    onReady(async () => {
      const views: Record<string, HologramView> = {};
      for (const p of PLACEMENTS) {
        views[p.id] = await bakePlacement(gl, { tablet, rack, cloud }, p, (s) => console.info("[bake]", s));
      }
      await save("views.json", { views });
    });
  }, [gl, tablet, rack, cloud, onReady]);
  return null;
}

export function HologramBaker() {
  const [run, setRun] = useState<(() => Promise<void>) | null>(null);
  const [status, setStatus] = useState("Ready");
  const register = useCallback((fn: () => Promise<void>) => setRun(() => fn), []);

  return (
    <div style={{ padding: 24, fontFamily: "monospace", color: "#e2e8f0", background: "#02040A", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>Hologram image bake</h1>
      <p style={{ marginBottom: 12, color: "#94a3b8" }}>
        Renders the 3D models into public/assets/holo and writes src/lib/three/hologramViews.json.
      </p>
      <button
        id="bake"
        disabled={!run || status === "Rendering…"}
        onClick={async () => {
          if (!run) return;
          setStatus("Rendering…");
          try {
            await run();
            setStatus("Done");
          } catch (err) {
            setStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }}
        style={{ padding: "8px 14px", border: "1px solid #38bdf8", borderRadius: 6, marginBottom: 12 }}
      >
        Render and save all images
      </button>
      <p id="bake-status">{run ? status : "Loading models…"}</p>
      <div style={{ width: 320, height: 320, marginTop: 16, border: "1px solid #1e293b" }}>
        <Canvas frameloop="never" gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <Baker onReady={register} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
