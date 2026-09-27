// Phase 11.3: Dedicated Simulation Page (/simulation)
// Cinematic research instrument for testing dynamic task offloading under changing conditions

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SimulationEditorialRail,
  SimulationTelemetryLine,
  SimulationSceneCanvas,
} from "@/components/simulation";

export default function SimulationPage() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Phase 11.3 Staged Sharp Entrance Sequence (Zero CSS Blur):
    // 1. Background (immediate)
    // 2. 3D System (120ms)
    // 3. Main Title (280ms)
    // 4. Subtitle & Description (420ms)
    // 5. Technical Metadata & Cue (560ms)
    setStage(1);
    const t1 = setTimeout(() => setStage(2), 120);
    const t2 = setTimeout(() => setStage(3), 280);
    const t3 = setTimeout(() => setStage(4), 420);
    const t4 = setTimeout(() => setStage(5), 560);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const scrollToParameters = () => {
    const el = document.getElementById("parameters-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#02040A] text-slate-100 overflow-x-hidden select-none">
      {/* ================================================== */}
      {/* 1. TOP EDITORIAL NAVIGATION HEADER                 */}
      {/* ================================================== */}
      <header
        style={{ paddingLeft: "7vw", paddingRight: "7vw" }}
        className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between pointer-events-auto backdrop-blur-md bg-[#02040A]/70 border-b border-white/[0.04]"
      >
        <div className="flex items-center gap-5">
          <Link
            href="/#decision"
            className="group flex items-center gap-2.5 font-mono text-sm tracking-[0.20em] uppercase text-slate-300 hover:text-cyan-300 transition-colors font-semibold"
          >
            <span className="text-cyan-400 group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            <span>RETURN TO STORY</span>
          </Link>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-xs tracking-[0.22em] uppercase text-slate-200 font-bold">
              SYS // OFFLOAD
            </span>
          </div>
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-[0.22em] uppercase text-cyan-300 font-bold px-3 py-1 rounded border border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            RESEARCH INSTRUMENT
          </span>
        </div>
      </header>

      {/* ================================================== */}
      {/* 2. RESEARCH INSTRUMENT VIEWPORT & WORKSPACE        */}
      {/* Left: Hero Viewport -> Parameters Native Scroll     */}
      {/* Right: Sticky Unbounded 3D Physical System         */}
      {/* ================================================== */}
      <div
        style={{ paddingLeft: "7vw", paddingRight: "7vw" }}
        className="relative z-10 w-full pt-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* ================================================== */}
          {/* LEFT COLUMN: HERO FIRST VIEWPORT -> CONTROLS SCROLL */}
          {/* ================================================== */}
          <div className="lg:col-span-6 flex flex-col justify-start">
            {/* VIEWPORT 1: CLEAN HERO (NO SLIDERS IN HERO) */}
            <section className="min-h-[calc(100vh-80px)] flex flex-col justify-center py-12">
              {/* Chapter Label: 14-16px technical mono */}
              <div
                className={`transition-all duration-500 ${
                  stage >= 3
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                }`}
              >
                <span className="font-mono text-sm sm:text-base font-bold tracking-[0.26em] uppercase text-cyan-400 mb-3 block">
                  // RESEARCH INSTRUMENT
                </span>
              </div>

              {/* Main Title: clamp(64px, 8vw, 150px) - Sharp, bold, zero blur */}
              <div
                className={`transition-all duration-600 delay-75 ${
                  stage >= 3
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                <h1
                  style={{
                    fontSize: "clamp(64px, 8vw, 150px)",
                    lineHeight: "0.88",
                    letterSpacing: "-0.04em",
                  }}
                  className="font-black text-white uppercase tracking-tight block font-sans"
                >
                  SIMULATION
                </h1>
              </div>

              {/* Subtitle: 24-30px typography */}
              <div
                className={`transition-all duration-500 delay-150 ${
                  stage >= 4
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                }`}
              >
                <p
                  style={{ fontSize: "clamp(22px, 2.2vw, 30px)", lineHeight: "1.3" }}
                  className="text-slate-100 font-semibold font-sans mt-6"
                >
                  Test dynamic offloading under changing conditions.
                </p>
              </div>

              {/* Description: 16-20px typography */}
              <div
                className={`transition-all duration-500 delay-200 ${
                  stage >= 4
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                }`}
              >
                <p
                  style={{ fontSize: "clamp(16px, 1.2vw, 20px)", lineHeight: "1.5" }}
                  className="text-slate-300 font-normal font-sans mt-4 max-w-xl"
                >
                  Adjust task and system conditions to observe how the execution strategy responds across local, edge and cloud.
                </p>
              </div>

              {/* Small Technical Line */}
              <div
                className={`transition-all duration-500 delay-300 ${
                  stage >= 5
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2"
                }`}
              >
                <div className="mt-7 flex items-center gap-3 font-mono text-xs sm:text-[13px] tracking-[0.20em] text-cyan-300/80 uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#38bdf8]" />
                  <span>TASK_001 · SIMULATED ENVIRONMENT · DEMO VALUES</span>
                </div>
              </div>

              {/* Editorial Cue: Scroll to adjust parameters */}
              <div
                className={`transition-all duration-500 delay-350 mt-12 ${
                  stage >= 5
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2"
                }`}
              >
                <button
                  type="button"
                  onClick={scrollToParameters}
                  className="group inline-flex items-center gap-3 font-mono text-sm tracking-[0.22em] uppercase text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer py-2"
                >
                  <span className="text-cyan-400 group-hover:translate-y-1 transition-transform">
                    ↓
                  </span>
                  <span className="border-b border-white/[0.15] group-hover:border-cyan-400 pb-0.5">
                    SCROLL TO ADJUST PARAMETERS
                  </span>
                </button>
              </div>
            </section>

            {/* VIEWPORT 2: SIMULATION CONTROLS & LIVE DECISION (Scrolled Into) */}
            <section
              id="parameters-section"
              className="pt-16 pb-28 border-t border-white/[0.08]"
            >
              <SimulationEditorialRail />
            </section>
          </div>

          {/* ================================================== */}
          {/* RIGHT COLUMN: PRIMARY 3D HERO SIMULATION SCENE     */}
          {/* Unbounded, zero card border, sticky live hero      */}
          {/* ================================================== */}
          <div className="lg:col-span-6 relative w-full h-[640px] lg:h-[calc(100vh-120px)] min-h-[540px] lg:sticky lg:top-24 flex flex-col justify-center">
            {/* Upper-Right Restrained Telemetry Line */}
            <div className="absolute top-4 right-4 z-20 pointer-events-none">
              <SimulationTelemetryLine />
            </div>

            {/* Unbounded 3D Scene Viewport (No Cards, No Box) */}
            <div
              className={`w-full h-full transition-opacity duration-1000 ${
                stage >= 2 ? "opacity-100" : "opacity-0"
              }`}
            >
              <SimulationSceneCanvas />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
