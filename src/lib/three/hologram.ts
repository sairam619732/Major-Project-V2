import * as THREE from "three";

// Render the models as tinted holograms. Set a flag to false to restore the original PBR shading.
export const HOLOGRAM_SIMULATION = true; // /simulation topology panel
export const HOLOGRAM_LANDING = true; // scroll-story models on the landing page

/**
 * Scanner lens: inside a circle around the pointer the real (PBR) model shows through the hologram.
 * Center/radius are in drawing-buffer pixels (gl_FragCoord space) and are driven by <HologramLens />.
 */
export const hologramLens = {
  uLensCenter: { value: new THREE.Vector2(-1e5, -1e5) },
  uLensRadius: { value: 0 },
};

/**
 * Camera layer holding the real models. <HologramLens /> enables it only while the lens is open,
 * so the PBR copies cost nothing when nobody is hovering.
 */
export const REAL_MODEL_LAYER = 1;

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
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying float vWorldY;
  void main() {
    // Inside the scanner lens the real model is drawn instead.
    float lensDist = distance(gl_FragCoord.xy, uLensCenter);
    if (lensDist < uLensRadius) discard;

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
    // Bright ring where the lens cuts through the hologram.
    float lensRim = step(1.0, uLensRadius) * (1.0 - smoothstep(0.0, 12.0, lensDist - uLensRadius));
    gl_FragColor = vec4(uColor * (glow + 1.6 * lensRim * uIntensity), 1.0);
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
  };
};

/**
 * Unlit additive hologram: fresnel rim, crease outlines, scanlines, scan sweep and a faint flicker.
 * Drive `uniforms.uTime` each frame and `uniforms.uIntensity` for emphasis.
 * Use FrontSide for dense models, otherwise stacked additive layers blow out to white.
 */
export function createHologramMaterial(color: THREE.ColorRepresentation, side: THREE.Side = THREE.DoubleSide) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uDetail: { value: 0 },
      uMap: { value: null },
      ...hologramLens,
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
    toneMapped: false,
  }) as HologramMaterial;
}

/** Make a built-in material draw only inside (`"inside"`) or outside (`"outside"`) the scanner lens. */
function clipToLens(material: THREE.Material, keep: "inside" | "outside") {
  const test = keep === "inside" ? ">" : "<";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLensCenter = hologramLens.uLensCenter;
    shader.uniforms.uLensRadius = hologramLens.uLensRadius;
    shader.fragmentShader =
      "uniform vec2 uLensCenter;\nuniform float uLensRadius;\n" +
      shader.fragmentShader.replace(
        "void main() {",
        `void main() {\n  if (distance(gl_FragCoord.xy, uLensCenter) ${test} uLensRadius) discard;`,
      );
  };
  material.customProgramCacheKey = () => `hologram-lens-${keep}`;
  material.needsUpdate = true;
}

/** A screen surface that keeps its texture but projects it as additive light in the hologram colour. */
export function createHologramScreenMaterial(map: THREE.Texture, color: THREE.ColorRepresentation) {
  const material = new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  clipToLens(material, "outside");
  return material;
}

/**
 * Give every mesh under `root` a hologram twin. The original (already configured PBR) meshes move to
 * REAL_MODEL_LAYER and are clipped to the scanner lens; the hologram twins draw everywhere else.
 *
 * Meshes whose name contains "screen" get a textured hologram screen when `screen` is given. With
 * `detail` > 0, meshes whose original material has a (emissive) texture get a hologram variant that
 * adds that texture's brightness as glowing detail. Variants share the base material's uniforms, so
 * driving `hologram.uniforms` drives all of them. Returns the hologram screen materials.
 */
export function addHologramLayer(
  root: THREE.Object3D,
  hologram: HologramMaterial,
  options: { screen?: { map: THREE.Texture; color: THREE.ColorRepresentation }; detail?: number } = {},
) {
  const { screen, detail = 0 } = options;
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
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => clipToLens(m, "inside"));
    mesh.layers.set(REAL_MODEL_LAYER);

    let material: THREE.Material;
    if (screen && mesh.name.toLowerCase().includes("screen")) {
      const screenMaterial = createHologramScreenMaterial(screen.map, screen.color);
      screens.push(screenMaterial);
      material = screenMaterial;
    } else {
      material = variantFor(mesh.material);
    }

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
