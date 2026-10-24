import * as THREE from "three";
import data from "./hologramViews.json";

/**
 * Layout of each pre-rendered model image (written by /dev/hologram-bake).
 * All lengths are in the owning component's group space: world axes, before the group's scale.
 */
export interface HologramView {
  /** Whether a real-look image exists (used by the hover reveal). */
  real: boolean;
  /** Centre of the image plane relative to the group origin. */
  center: [number, number, number];
  /** Width and height of the image plane. */
  size: [number, number];
  /** Direction the image was rendered from; the plane faces this way. */
  dir: [number, number, number];
  /** Where the model sits inside the image: [minU, minV, maxU, maxV] in 0…1. */
  content: [number, number, number, number];
  /** Tablet screen triangles in plane coordinates (−0.5…0.5) with UVs, drawn live on top. */
  screen?: { positions: number[]; uvs: number[] };
}

export type HologramViewId =
  | "landing-local" | "landing-edge" | "landing-cloud"
  | "decision-local" | "decision-edge" | "decision-cloud"
  | "sim-local" | "sim-edge" | "sim-cloud";

export const HOLOGRAM_VIEWS = data as unknown as Record<HologramViewId, HologramView>;

export function hologramImageUrls(id: HologramViewId) {
  return { holo: `/assets/holo/${id}-holo.webp`, real: `/assets/holo/${id}-real.webp` };
}

/** Rotation that turns a plane (facing +Z) to face the view's direction, upright like the render. */
export function viewQuaternion(view: HologramView) {
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...view.dir), new THREE.Vector3(), THREE.Object3D.DEFAULT_UP);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/**
 * Group-space point at image coordinates (u, v), 0…1 from the bottom-left corner.
 * Multiply by the group's scale and add its position for world space.
 */
export function viewPoint(view: HologramView, quaternion: THREE.Quaternion, u: number, v: number, target = new THREE.Vector3()) {
  return target
    .set((u - 0.5) * view.size[0], (v - 0.5) * view.size[1], 0)
    .applyQuaternion(quaternion)
    .add(scratch.set(...view.center));
}
const scratch = new THREE.Vector3();
