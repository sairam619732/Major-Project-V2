import * as THREE from "three";
import { isLowEndDevice } from "./device";

// Render the models as tinted holograms. Set a flag to false to restore the original PBR shading.
export const HOLOGRAM_SIMULATION = true; // /simulation topology panel
export const HOLOGRAM_LANDING = true; // scroll-story models on the landing page

/**
 * Hover reveal: a soft, organically shaped spotlight around the pointer where the real (PBR) model
 * shows through the hologram, strongest at the cursor and fading gradually to nothing at its slowly
 * morphing outline (no circle, no visible edge).
 * Only materials created with `reveal: true` respond to it; the rest stay pure holograms.
 * Center/radius are in drawing-buffer pixels (gl_FragCoord space) and are driven by <HologramLens />.
 */
export const hologramLens = {
  uLensCenter: { value: new THREE.Vector2(-1e5, -1e5) },
  uLensRadius: { value: 0 },
  uLensTime: { value: 0 },
};

/**
 * Camera layer holding the real models. <HologramLens /> enables it only while the lens is open,
 * so the PBR copies cost nothing when nobody is hovering.
 */
export const REAL_MODEL_LAYER = 1;


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

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying float vWorldY;
  void main() {
    vec4 pos = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      pos = instanceMatrix * pos;
      n = mat3(instanceMatrix) * n;
    #endif
    vec4 world = modelMatrix * pos;
    vec4 view = viewMatrix * world;
    vUv = uv;
    vWorldY = world.y;
    vViewPos = view.xyz;
    vNormal = normalize(normalMatrix * n);
    gl_Position = projectionMatrix * view;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uDetail;
  uniform sampler2D uMap;
  uniform vec2 uLensCenter;
  uniform float uLensRadius;
  uniform float uLensTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying float vWorldY;
  ${REVEAL_GLSL}
  void main() {
    // The hover spotlight shows the real model instead; the hologram fades out where it does.
    float reveal = revealWeight(gl_FragCoord.xy, uLensCenter, uLensRadius, uLensTime);
    if (reveal > 0.999) discard;

    vec3 n = normalize(vNormal);
    vec3 viewDir = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(-vViewPos);
    float fresnel = pow(1.0 - abs(dot(n, viewDir)), 2.0);
    // Normal discontinuities light up panel seams, giving a wireframe-like outline.
    float crease = clamp(length(fwidth(n)) * 5.0, 0.0, 1.0);
    float scan = 0.65 + 0.35 * sin(gl_FragCoord.y * 1.3 - uTime * 4.0);
    float sweep = smoothstep(0.93, 1.0, fract(vWorldY * 0.35 - uTime * 0.2));
    float flicker = 0.95 + 0.05 * sin(uTime * 37.0);
    float base = 0.08 + 1.1 * fresnel + 0.7 * crease + 0.5 * sweep;
    #ifdef HOLO_MAP
      // Bright texture detail (LEDs, blades, panel markings) projected as light.
      base += uDetail * dot(texture2D(uMap, vUv).rgb, vec3(0.299, 0.587, 0.114));
    #endif
    float glow = base * scan * flicker * uIntensity;
    gl_FragColor = vec4(uColor * glow * (1.0 - reveal), 1.0);
    // Inside the spotlight, ignore the opaque real model's depth so every hologram layer fades
    // evenly; otherwise the layers behind its front surface vanish and leave a visible edge.
    gl_FragDepth = reveal > 0.0 ? 0.0 : gl_FragCoord.z;
  }
`;

export type HologramMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uColor: { value: THREE.Color };
    uTime: { value: number };
    uIntensity: { value: number };
    uDetail: { value: number };
    uMap: { value: THREE.Texture | null };
    uLensCenter: { value: THREE.Vector2 };
    uLensRadius: { value: number };
    uLensTime: { value: number };
  };
};

/**
 * Unlit additive hologram: fresnel rim, crease outlines, scanlines, scan sweep and a faint flicker.
 * Drive `uniforms.uTime` each frame and `uniforms.uIntensity` for emphasis.
 * Use FrontSide for dense models, otherwise stacked additive layers blow out to white.
 * With `reveal`, the material follows the shared hover spotlight; otherwise it ignores it.
 * Low-end devices always get FrontSide to roughly halve the additive overdraw.
 */
export function createHologramMaterial(
  color: THREE.ColorRepresentation,
  side: THREE.Side = THREE.DoubleSide,
  reveal = false,
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uDetail: { value: 0 },
      uMap: { value: null },
      ...(reveal ? hologramLens : { uLensCenter: { value: new THREE.Vector2(-1e5, -1e5) }, uLensRadius: { value: 0 }, uLensTime: { value: 0 } }),
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: isLowEndDevice() ? THREE.FrontSide : side,
    toneMapped: false,
  }) as HologramMaterial;
}

/**
 * Weight a built-in material by the hover spotlight: `"inside"` shows it only in the spotlight,
 * `"outside"` only outside it, cross-fading smoothly.
 *
 * Inside (real models) stays opaque and fades its colour to black: fading alpha instead would let
 * stacked layers of dense models (racks behind racks) add back up to opaque and leave a hard edge.
 * Against the dark scene black reads as empty while the additive hologram fades in on top.
 * Outside (additive hologram screens) fades alpha, which scales additive light directly.
 */
function clipToLens(material: THREE.Material, keep: "inside" | "outside") {
  const weight =
    keep === "inside"
      ? `float lensWeight = revealWeight(gl_FragCoord.xy, uLensCenter, uLensRadius, uLensTime);
  if (lensWeight <= 0.0) discard;`
      : `float lensWeight = 1.0 - revealWeight(gl_FragCoord.xy, uLensCenter, uLensRadius, uLensTime);
  if (lensWeight <= 0.001) discard;`;
  const apply = keep === "inside" ? "gl_FragColor.rgb *= lensWeight;" : "gl_FragColor.a *= lensWeight;";
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
  ${weight}`)
        .replace("#include <dithering_fragment>", `#include <dithering_fragment>
  ${apply}`);
  };
  material.customProgramCacheKey = () => `hologram-reveal-${keep}`;
  material.needsUpdate = true;
}

/** A screen surface that keeps its texture but projects it as additive light in the hologram colour. */
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
  if (reveal) clipToLens(material, "outside");
  return material;
}

/**
 * Render every mesh under `root` as a hologram.
 *
 * Without `reveal`, the meshes' materials are simply replaced. With `reveal`, each mesh instead gets
 * a hologram twin: the original (already configured PBR) mesh moves to REAL_MODEL_LAYER and shows
 * only in the hover spotlight, where the twin fades out. `hologram` must then be created with
 * `reveal` too.
 *
 * Meshes whose name contains "screen" get a textured hologram screen when `screen` is given. With
 * `detail` > 0, meshes whose original material has a (emissive) texture get a hologram variant that
 * adds that texture's brightness as glowing detail. Variants share the base material's uniforms, so
 * driving `hologram.uniforms` drives all of them. Returns the hologram screen materials.
 */
export function addHologramLayer(
  root: THREE.Object3D,
  hologram: HologramMaterial,
  options: { screen?: { map: THREE.Texture; color: THREE.ColorRepresentation }; detail?: number; reveal?: boolean } = {},
) {
  const { screen, detail = 0 } = options;
  // Low-end devices get no hover reveal (<SceneCanvas> skips <HologramLens />), so skip the real-model twins too.
  const reveal = (options.reveal ?? false) && !isLowEndDevice();
  const screens: THREE.MeshBasicMaterial[] = [];
  const variants = new Map<string, THREE.ShaderMaterial>();
  const variantFor = (original: THREE.Material | THREE.Material[]) => {
    const source = Array.isArray(original) ? original[0] : original;
    const std = source as THREE.MeshStandardMaterial;
    const map = std.emissiveMap ?? std.map;
    if (!detail || !map) return hologram;
    let variant = variants.get(map.uuid);
    if (!variant) {
      variant = hologram.clone();
      variant.uniforms = { ...hologram.uniforms, uDetail: { value: detail }, uMap: { value: map } };
      variant.defines = { ...variant.defines, HOLO_MAP: "" };
      variants.set(map.uuid, variant);
    }
    return variant;
  };

  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });

  for (const mesh of meshes) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    let material: THREE.Material;
    if (screen && mesh.name.toLowerCase().includes("screen")) {
      const screenMaterial = createHologramScreenMaterial(screen.map, screen.color, reveal);
      screens.push(screenMaterial);
      material = screenMaterial;
    } else {
      material = variantFor(mesh.material);
    }

    if (!reveal) {
      mesh.material = material;
      continue;
    }

    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => clipToLens(m, "inside"));
    mesh.layers.set(REAL_MODEL_LAYER);

    const source = mesh as THREE.InstancedMesh;
    const twin = source.isInstancedMesh
      ? Object.assign(new THREE.InstancedMesh(source.geometry, material, source.count), { instanceMatrix: source.instanceMatrix })
      : new THREE.Mesh(mesh.geometry, material);
    twin.name = `${mesh.name}__hologram`;
    twin.position.copy(mesh.position);
    twin.quaternion.copy(mesh.quaternion);
    twin.scale.copy(mesh.scale);
    twin.frustumCulled = mesh.frustumCulled;
    mesh.parent?.add(twin);
  }
  return screens;
}
