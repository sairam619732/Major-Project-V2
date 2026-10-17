// Integrated / software GPUs that struggle with full-resolution PBR scenes.
const WEAK_GPU = /swiftshader|llvmpipe|software|basic render|intel.*\b(hd|uhd)\b|mali-[gt]?[0-9]{1,2}\b|adreno.*\b[1-5][0-9]{2}\b/i;

const OVERRIDE_KEY = "render-quality";

let cachedLowEnd: boolean | null = null;

/**
 * Best-effort, client-only check for "potato" hardware. Cached after the first call.
 *
 * Override with `?quality=low` or `?quality=high` (remembered in localStorage; `?quality=auto`
 * clears it), e.g. to preview the low-end experience on a fast machine.
 */
export function isLowEndDevice(): boolean {
  if (cachedLowEnd !== null) return cachedLowEnd;
  if (typeof window === "undefined") return false;

  let override: string | null = null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("quality");
    if (fromUrl === "auto") window.localStorage.removeItem(OVERRIDE_KEY);
    else if (fromUrl === "low" || fromUrl === "high") window.localStorage.setItem(OVERRIDE_KEY, fromUrl);
    override = window.localStorage.getItem(OVERRIDE_KEY);
  } catch {
    // Storage can be unavailable (private mode); fall back to detection.
  }
  if (override === "low" || override === "high") {
    cachedLowEnd = override === "low";
    return cachedLowEnd;
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  let lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;

  if (!lowEnd) {
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      const renderer = info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
      lowEnd = WEAK_GPU.test(renderer);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // Detection is a hint only; keep defaults if WebGL probing fails.
    }
  }

  cachedLowEnd = lowEnd;
  return lowEnd;
}
