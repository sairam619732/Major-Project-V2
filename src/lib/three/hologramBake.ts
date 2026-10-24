import * as THREE from "three";
import { HOLO_GLOW_RANGE } from "./hologram";

/**
 * Hologram look of the 3D models, used only by the dev bake page (/dev/hologram-bake) to render
 * the still images in public/assets/holo. The live scenes show those images through
 * createHologramImageMaterial (hologram.ts), which tints them and adds the scanlines, sweep and
 * flicker on top.
 *
 * The glow is accumulated in white into a float target, then stored as sqrt(glow / range) so both
 * faint surfaces and bright stacked layers survive 8-bit images (see encodeGlow).
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec4 pos = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      pos = instanceMatrix * pos;
      n = mat3(instanceMatrix) * n;
    #endif
    vec4 view = viewMatrix * modelMatrix * pos;
    vUv = uv;
    vViewPos = view.xyz;
    vNormal = normalize(normalMatrix * n);
    gl_Position = projectionMatrix * view;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDetail;
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(-vViewPos);
    float fresnel = pow(1.0 - abs(dot(n, viewDir)), 2.0);
    // Normal discontinuities light up panel seams, giving a wireframe-like outline.
    float crease = clamp(length(fwidth(n)) * 5.0, 0.0, 1.0);
    float glow = 0.08 + 1.1 * fresnel + 0.7 * crease;
    #ifdef HOLO_MAP
      // Bright texture detail (LEDs, blades, panel markings) projected as light.
      glow += uDetail * dot(texture2D(uMap, vUv).rgb, vec3(0.299, 0.587, 0.114));
    #endif
    gl_FragColor = vec4(uColor * glow, 1.0);
  }
`;

/** Unlit additive hologram: fresnel rim, crease outlines and optional texture detail. */
export function createBakeHologramMaterial(side: THREE.Side) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(1, 1, 1) },
      uDetail: { value: 0 },
      uMap: { value: null },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
    toneMapped: false,
  });
  return material;
}

/**
 * Render `scene` as accumulated glow into a float target, then write sqrt(glow / range) as an
 * opaque grey image to the renderer's canvas.
 */
export function renderEncodedGlow(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  gl.setRenderTarget(target);
  gl.setClearColor(0x000000, 0);
  gl.clear();
  gl.render(scene, camera);
  gl.setRenderTarget(null);

  const encode = new THREE.ShaderMaterial({
    uniforms: { tGlow: { value: target.texture } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform sampler2D tGlow; varying vec2 vUv;
      void main() {
        float g = sqrt(clamp(texture2D(tGlow, vUv).r / ${HOLO_GLOW_RANGE.toFixed(1)}, 0.0, 1.0));
        gl_FragColor = vec4(vec3(g), 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), encode);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene().add(quad);
  gl.render(quadScene, camera);

  quad.geometry.dispose();
  encode.dispose();
  target.dispose();
}

/**
 * Replace every mesh material under `root` with the hologram. With `detail` > 0, meshes whose
 * material has a (emissive) texture add that texture's brightness as glowing detail.
 */
export function applyBakeHologram(root: THREE.Object3D, hologram: THREE.ShaderMaterial, detail = 0) {
  const variants = new Map<string, THREE.ShaderMaterial>();
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const map = source.emissiveMap ?? source.map;
    if (!detail || !map) {
      mesh.material = hologram;
      return;
    }
    let variant = variants.get(map.uuid);
    if (!variant) {
      variant = hologram.clone();
      variant.uniforms = { ...hologram.uniforms, uDetail: { value: detail }, uMap: { value: map } };
      variant.defines = { ...variant.defines, HOLO_MAP: "" };
      variants.set(map.uuid, variant);
    }
    mesh.material = variant;
  });
}
