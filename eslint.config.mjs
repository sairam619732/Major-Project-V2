import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Three Fiber scenes update three.js materials, geometries and refs inside useFrame
    // (every animation frame, outside React rendering). That is the intended R3F pattern, but the
    // React Compiler rules below flag it, so they are relaxed for the 3D code only.
    files: ["src/components/3d/**/*.{ts,tsx}", "src/lib/three/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    // These <img> tags show the user's own picked files (blob: URLs) and the detector's annotated
    // result (a base64 data: URL). next/image can't optimise either, so the rule doesn't apply.
    files: ["src/components/simulation/**/*.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not frontend source: Python virtualenv, generated Space bundle, exported copies.
    "backend/**",
    "exports/**",
  ]),
]);

export default eslintConfig;
