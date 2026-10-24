"use client";

/* eslint-disable react-hooks/immutability -- R3F owns these mutable Three.js objects; frame callbacks update GPU resources without React renders. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { scrollState } from "@/store/scrollStore";
import { createHologramScreenMaterial } from "@/lib/three/hologram";
import { createTabletScreenTexture, drawLandingTabletScreen } from "@/lib/three/tabletScreens";
import { HologramImage, useHologramImage } from "./HologramImage";

/** The local device: the tablet image as a hologram, with its real look under the hover spotlight. */
export function ComputingDevice() {
  const groupRef = useRef<Group>(null);
  const { viewport } = useThree();

  const isDesktop = viewport.width > 6.8;
  const targetX = isDesktop ? Math.min(2.5, viewport.width * 0.24) : 0;
  const targetY = isDesktop ? 0 : -Math.min(1.8, viewport.height * 0.22);

  // Tablet occupies approximately 35-45% of viewport height
  const responsiveScale = isDesktop ? 0.88 : Math.min(0.72, viewport.width / 5.8);

  const material = useHologramImage("landing-local", "#38bdf8", true);
  // The OLED screen is drawn on top of the image as projected light.
  const screen = useMemo(() => createTabletScreenTexture(drawLandingTabletScreen), []);
  const screenMaterial = useMemo(() => createHologramScreenMaterial(screen.texture, "#7dd3fc", true), [screen]);
  useEffect(
    () => () => {
      screen.texture.dispose();
      screenMaterial.dispose();
    },
    [screen, screenMaterial]
  );

  // Gentle idle float + scroll-driven screen activation (Timeline: 0.18–0.36)
  useFrame((state) => {
    if (!groupRef.current) return;
    const fullP = Math.max(scrollState.visualProgress, 0);
    const p = Math.min(fullP, 1);
    const t = state.clock.getElapsedTime();

    // Phase 10.1: Cleanly hide Computing Device during Decision section
    if (fullP > 1.04) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;
    groupRef.current.position.y = targetY + Math.sin(t * 0.7) * 0.045;

    // Continuous Screen Activation (0.18 -> 0.36 as camera approaches tablet)
    const activeRaw = Math.max(0, Math.min(1, (p - 0.18) / 0.18));
    const activeEased = activeRaw * activeRaw * (3 - 2 * activeRaw);
    const pulse = Math.sin(t * 6.0) * 0.14 * activeEased;
    const screenIntensity = 0.65 + activeEased * 1.55 + pulse;

    material.uniforms.uTime.value = t;
    material.uniforms.uIntensity.value = 0.7 + activeEased * 0.5;
    screenMaterial.opacity = Math.min(1, screenIntensity / 2.2);
  });

  return (
    <group ref={groupRef} position={[targetX, targetY, 0]} scale={responsiveScale}>
      <HologramImage id="landing-local" material={material} screenMaterial={screenMaterial} />
    </group>
  );
}
