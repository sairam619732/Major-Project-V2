"use client";

/* eslint-disable react-hooks/immutability -- textures from useTexture are configured once before first upload. */

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { createHologramImageMaterial, type HologramImageMaterial } from "@/lib/three/hologram";
import { HOLOGRAM_VIEWS, hologramImageUrls, viewQuaternion, type HologramViewId } from "@/lib/three/hologramViews";

/**
 * Loads a model's pre-rendered hologram image (plus its real-look image when `reveal` is on) and
 * builds the animated hologram material. Suspends while the images load.
 */
export function useHologramImage(id: HologramViewId, color: THREE.ColorRepresentation, reveal = false) {
  const view = HOLOGRAM_VIEWS[id];
  const urls = hologramImageUrls(id);
  const withReal = reveal && view.real;
  const textures = useTexture(withReal ? [urls.holo, urls.real] : [urls.holo]);

  const material = useMemo(() => {
    const [holo, real] = textures;
    // Raw values in, raw values out: the images already hold display-ready colours.
    holo.colorSpace = THREE.NoColorSpace;
    if (real) {
      real.colorSpace = THREE.NoColorSpace;
      // Premultiplied so the soft model edges filter without dark fringes.
      real.premultiplyAlpha = true;
      real.needsUpdate = true;
    }
    return createHologramImageMaterial(holo, real ?? null, color);
  }, [textures, color]);

  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/** Plane-space screen triangles → geometry for the live tablet screen drawn over the image. */
function screenGeometry(screen: { positions: number[]; uvs: number[] }) {
  const count = screen.positions.length / 2;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = screen.positions[i * 2];
    positions[i * 3 + 1] = screen.positions[i * 2 + 1];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(screen.uvs, 2));
  return geometry;
}

/**
 * A model shown as its pre-rendered image on a plane facing the direction it was rendered from.
 * Place it inside a group at the model's position and scale (no rotation). `screenMaterial` draws
 * the tablet screen on top, so its contents can stay live.
 */
export function HologramImage({
  id,
  material,
  screenMaterial,
}: {
  id: HologramViewId;
  material: HologramImageMaterial;
  screenMaterial?: THREE.Material;
}) {
  const view = HOLOGRAM_VIEWS[id];
  const quaternion = useMemo(() => viewQuaternion(view), [view]);
  const screen = useMemo(() => (view.screen ? screenGeometry(view.screen) : null), [view]);
  useEffect(() => () => screen?.dispose(), [screen]);

  return (
    <mesh position={view.center} quaternion={quaternion} scale={[view.size[0], view.size[1], 1]} material={material}>
      <planeGeometry args={[1, 1]} />
      {screen && screenMaterial && (
        <mesh geometry={screen} material={screenMaterial} position={[0, 0, 0.001]} renderOrder={1} />
      )}
    </mesh>
  );
}
