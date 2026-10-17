"use client";

import { useEffect } from "react";
import { isLowEndDevice } from "./device";

/**
 * Adds `low-end` to <html> on weak devices so CSS can drop expensive effects (see globals.css).
 * Kept apart from renderQuality.tsx so the root layout doesn't pull three.js into every page.
 */
export function PerformanceMode() {
  useEffect(() => {
    if (isLowEndDevice()) document.documentElement.classList.add("low-end");
  }, []);
  return null;
}
