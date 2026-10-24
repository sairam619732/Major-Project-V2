import * as THREE from "three";

/**
 * The 3D models are shown as pre-rendered images (public/assets/holo, made by /dev/hologram-bake)
 * on flat planes. createHologramImageMaterial turns an image into the animated hologram and, on the
 * landing page, reveals the real-look image under the pointer.
 */

/**
 * Hover reveal: a soft, organically shaped spotlight around the pointer where the real model shows
 * through the hologram, strongest at the cursor and fading gradually to nothing at its slowly
 * morphing outline (no circle, no visible edge).
 * Center/radius are in drawing-buffer pixels (gl_FragCoord space) and are driven by <HologramLens />.
 */
export const hologramLens = {
  uLensCenter: { value: new THREE.Vector2(-1e5, -1e5) },
  uLensRadius: { value: 0 },
  uLensTime: { value: 0 },
};

/** Hologram images store sqrt(glow / HOLO_GLOW_RANGE), keeping detail in both faint and bright parts. */
export const HOLO_GLOW_RANGE = 6;

// Real-model weight of the hover spotlight: 1 at the cursor, easing gradually to 0 at an organic
// outline. A few drifting angular waves bend the radius so the shape is a soft, morphing blob.
const REVEAL_GLSL = /* glsl */ `
  float revealWeight(vec2 fragCoord, vec2 center, float radius, float time) {
    if (radius < 1.0) return 0.0;
    vec2 d = fragCoord - center;
    float a = atan(d.y, d.x);
    float shape = 1.0
      + 0.16 * sin(3.0 * a + time * 0.7)
      + 0.10 * sin(5.0 * a - time * 1.1)
      + 0.06 * sin(8.0 * a + time * 1.7);
    return 1.0 - smoothstep(0.0, radius * shape, length(d));
  }
`;

const IMAGE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vWorldY;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vUv = uv;
    vWorldY = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const IMAGE_FRAGMENT = /* glsl */ `
  uniform sampler2D uHolo;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uFade;
  varying vec2 vUv;
  varying float vWorldY;
  #ifdef REVEAL
    uniform sampler2D uReal;
    uniform vec2 uLensCenter;
    uniform float uLensRadius;
    uniform float uLensTime;
    ${REVEAL_GLSL}
  #endif
  void main() {
    // One mip level sharper than default: thin glowing edges and LEDs stay bright when shrunk.
    float stored = texture2D(uHolo, vUv, -1.0).r;
    float glow = stored * stored * ${HOLO_GLOW_RANGE.toFixed(1)};
    // The model's own pixels: every hologram surface glows at least a little.
    float cover = clamp(stored * 10.0, 0.0, 1.0);
    float scan = 0.65 + 0.35 * sin(gl_FragCoord.y * 1.3 - uTime * 4.0);
    float sweep = smoothstep(0.93, 1.0, fract(vWorldY * 0.35 - uTime * 0.2));
    float flicker = 0.95 + 0.05 * sin(uTime * 37.0);
    vec3 holo = uColor * (glow + 0.5 * sweep * cover) * scan * flicker * uIntensity;
    #ifdef REVEAL
      // Inside the spotlight the real image takes over; it stays opaque (fading to black) so the
      // stars behind it don't show through, while the additive hologram fades out on top.
      float reveal = revealWeight(gl_FragCoord.xy, uLensCenter, uLensRadius, uLensTime);
      vec4 real = texture2D(uReal, vUv);
      float alpha = real.a * smoothstep(0.0, 0.15, reveal);
      gl_FragColor = vec4(holo * (1.0 - reveal) + real.rgb * reveal, alpha) * uFade;
    #else
      gl_FragColor = vec4(holo * uFade, cover * uFade);
    #endif
  }
`;

export type HologramImageMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uHolo: { value: THREE.Texture };
    uColor: { value: THREE.Color };
    uTime: { value: number };
    uIntensity: { value: number };
    uFade: { value: number };
  };
};

/**
 * Animated hologram from a pre-rendered glow image: tint, scanlines, scan sweep and a faint flicker.
 * Drive `uniforms.uTime` each frame, `uniforms.uIntensity` for emphasis and `uniforms.uFade` to fade
 * the whole model. With a `real` image the shared hover spotlight reveals it.
 */
export function createHologramImageMaterial(
  holo: THREE.Texture,
  real: THREE.Texture | null,
  color: THREE.ColorRepresentation,
) {
  const uniforms: Record<string, THREE.IUniform> = {
    uHolo: { value: holo },
    uColor: { value: new THREE.Color(color) },
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uFade: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms: real ? { ...uniforms, uReal: { value: real }, ...hologramLens } : uniforms,
    defines: real ? { REVEAL: "" } : {},
    vertexShader: IMAGE_VERTEX,
    fragmentShader: IMAGE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  if (real) {
    // Premultiplied "over" for the real image; the hologram part (alpha 0) simply adds light.
    material.blending = THREE.CustomBlending;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneMinusSrcAlphaFactor;
    material.blendSrcAlpha = THREE.OneFactor;
    material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  } else {
    material.blending = THREE.AdditiveBlending;
  }
  return material as HologramImageMaterial;
}

/**
 * A tablet screen that keeps its texture but projects it as additive light in the hologram colour.
 * With `reveal`, it fades out inside the hover spotlight (the real image shows the screen there).
 */
export function createHologramScreenMaterial(map: THREE.Texture, color: THREE.ColorRepresentation, reveal = false) {
  const material = new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  if (!reveal) return material;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLensCenter = hologramLens.uLensCenter;
    shader.uniforms.uLensRadius = hologramLens.uLensRadius;
    shader.uniforms.uLensTime = hologramLens.uLensTime;
    shader.fragmentShader =
      `uniform vec2 uLensCenter;
uniform float uLensRadius;
uniform float uLensTime;
${REVEAL_GLSL}
` +
      shader.fragmentShader
        .replace("void main() {", `void main() {
  float lensWeight = 1.0 - revealWeight(gl_FragCoord.xy, uLensCenter, uLensRadius, uLensTime);
  if (lensWeight <= 0.001) discard;`)
        .replace("#include <dithering_fragment>", `#include <dithering_fragment>
  gl_FragColor.a *= lensWeight;`);
  };
  material.customProgramCacheKey = () => "hologram-screen-reveal";
  return material;
}
