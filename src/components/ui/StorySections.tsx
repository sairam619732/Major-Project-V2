"use client";

import { useEffect, useRef } from "react";
import { subscribeScroll } from "@/store/scrollStore";

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function StorySections() {
  const heroContentRef = useRef<HTMLDivElement>(null);

  const localContainerRef = useRef<HTMLDivElement>(null);
  const localTitleRef = useRef<HTMLDivElement>(null);
  const localDescRef = useRef<HTMLParagraphElement>(null);
  const localTeleRef = useRef<HTMLDivElement>(null);

  const edgeContainerRef = useRef<HTMLDivElement>(null);
  const edgeTitleRef = useRef<HTMLDivElement>(null);
  const edgeDescRef = useRef<HTMLDivElement>(null);
  const edgeTeleRef = useRef<HTMLDivElement>(null);

  const cloudContainerRef = useRef<HTMLDivElement>(null);
  const cloudTitleRef = useRef<HTMLDivElement>(null);
  const cloudDescRef = useRef<HTMLDivElement>(null);
  const cloudTeleRef = useRef<HTMLDivElement>(null);

  // Phase 7.6 Editorial Column Specifications:
  // position: fixed relative to the scene viewport
  // left: 7vw, width: 32vw, max-width: 520px, z-index: 20
  // Vertically centered around 52% viewport height
  const editorialColumnStyle: React.CSSProperties = {
    position: "fixed",
    left: "7vw",
    top: "52%",
    transform: "translateY(-50%)",
    width: "32vw",
    maxWidth: "520px",
    zIndex: 20,
  };

  useEffect(() => {
    return subscribeScroll((state) => {
      // Phase 7.6: Single master visual progress timeline [0, 1]
      const p = state.visualProgress;

      // 1. HERO CONTENT (Fully visible at p = 0, leaves gradually 0.10 -> 0.22)
      if (heroContentRef.current) {
        const heroT = smoothstep(0.10, 0.22, p);
        const heroOpacity = Math.max(0, 1 - heroT);
        const heroY = -heroT * 40;
        const heroBlur = heroT * 6;

        heroContentRef.current.style.opacity = heroOpacity.toFixed(3);
        heroContentRef.current.style.transform = `translate3d(0, ${heroY.toFixed(1)}px, 0)`;
        heroContentRef.current.style.filter = `blur(${heroBlur.toFixed(1)}px)`;
        heroContentRef.current.style.pointerEvents = heroOpacity > 0.1 ? "auto" : "none";
      }

      // 2. LOCAL CONTENT (Reveals 0.16 -> 0.32, exits as task leaves for Edge 0.44 -> 0.54)
      const localExit = smoothstep(0.44, 0.54, p);

      if (localContainerRef.current) {
        localContainerRef.current.style.opacity = (1 - localExit).toFixed(3);
        localContainerRef.current.style.pointerEvents =
          p >= 0.16 && localExit < 0.85 ? "auto" : "none";
      }

      // 2A. LOCAL TITLE ("LOCAL COMPUTATION" - continuous scroll reveal 0.16 -> 0.28)
      if (localTitleRef.current) {
        const titleT = smoothstep(0.16, 0.28, p);
        const titleOpacity = titleT * (1 - localExit);
        const titleY = (1 - titleT) * 40 - localExit * 20;
        const titleBlur = (1 - titleT) * 8 + localExit * 4;

        localTitleRef.current.style.opacity = titleOpacity.toFixed(3);
        localTitleRef.current.style.transform = `translate3d(0, ${titleY.toFixed(1)}px, 0)`;
        localTitleRef.current.style.filter = `blur(${titleBlur.toFixed(1)}px)`;
      }

      // 2B. LOCAL DESCRIPTION (0.20 -> 0.32)
      if (localDescRef.current) {
        const descT = smoothstep(0.20, 0.32, p);
        const descOpacity = descT * (1 - localExit);
        const descY = (1 - descT) * 35 - localExit * 20;
        const descBlur = (1 - descT) * 6 + localExit * 4;

        localDescRef.current.style.opacity = descOpacity.toFixed(3);
        localDescRef.current.style.transform = `translate3d(0, ${descY.toFixed(1)}px, 0)`;
        localDescRef.current.style.filter = `blur(${descBlur.toFixed(1)}px)`;
      }

      // 2C. LOCAL TELEMETRY BLOCK (0.30 -> 0.40)
      if (localTeleRef.current) {
        const teleT = smoothstep(0.30, 0.40, p);
        const teleOpacity = teleT * (1 - localExit);
        const teleY = (1 - teleT) * 25 - localExit * 20;
        const teleBlur = (1 - teleT) * 4 + localExit * 4;

        localTeleRef.current.style.opacity = teleOpacity.toFixed(3);
        localTeleRef.current.style.transform = `translate3d(0, ${teleY.toFixed(1)}px, 0)`;
        localTeleRef.current.style.filter = `blur(${teleBlur.toFixed(1)}px)`;
      }

      // 3. EDGE CONTENT (Reveals 0.54 -> 0.66, exits as task leaves for Cloud 0.72 -> 0.80)
      const edgeExit = smoothstep(0.72, 0.80, p);

      if (edgeContainerRef.current) {
        edgeContainerRef.current.style.opacity = (1 - edgeExit).toFixed(3);
        edgeContainerRef.current.style.pointerEvents =
          p >= 0.54 && edgeExit < 0.85 ? "auto" : "none";
      }

      // 3A. EDGE TITLE (0.54 -> 0.62)
      if (edgeTitleRef.current) {
        const edgeT = smoothstep(0.54, 0.62, p);
        const edgeOpacity = edgeT * (1 - edgeExit);
        const edgeTitleY = (1 - edgeT) * 30 - edgeExit * 20;
        const edgeTitleBlur = (1 - edgeT) * 8 + edgeExit * 4;

        edgeTitleRef.current.style.opacity = edgeOpacity.toFixed(3);
        edgeTitleRef.current.style.transform = `translate3d(0, ${edgeTitleY.toFixed(1)}px, 0)`;
        edgeTitleRef.current.style.filter = `blur(${edgeTitleBlur.toFixed(1)}px)`;
      }

      // 3B. EDGE DESCRIPTION (0.56 -> 0.64)
      if (edgeDescRef.current) {
        const edgeDescT = smoothstep(0.56, 0.64, p);
        const edgeDescOpacity = edgeDescT * (1 - edgeExit);
        const edgeDescY = (1 - edgeDescT) * 25 - edgeExit * 20;
        const edgeDescBlur = (1 - edgeDescT) * 6 + edgeExit * 4;

        edgeDescRef.current.style.opacity = edgeDescOpacity.toFixed(3);
        edgeDescRef.current.style.transform = `translate3d(0, ${edgeDescY.toFixed(1)}px, 0)`;
        edgeDescRef.current.style.filter = `blur(${edgeDescBlur.toFixed(1)}px)`;
      }

      // 3C. EDGE TELEMETRY BLOCK (0.58 -> 0.66)
      if (edgeTeleRef.current) {
        const edgeTeleT = smoothstep(0.58, 0.66, p);
        const edgeTeleOpacity = edgeTeleT * (1 - edgeExit);
        const edgeTeleY = (1 - edgeTeleT) * 20 - edgeExit * 20;
        const edgeTeleBlur = (1 - edgeTeleT) * 4 + edgeExit * 4;

        edgeTeleRef.current.style.opacity = edgeTeleOpacity.toFixed(3);
        edgeTeleRef.current.style.transform = `translate3d(0, ${edgeTeleY.toFixed(1)}px, 0)`;
        edgeTeleRef.current.style.filter = `blur(${edgeTeleBlur.toFixed(1)}px)`;
      }

      // 4. CLOUD CONTENT (Reveals 0.84 -> 0.96)
      if (cloudContainerRef.current) {
        cloudContainerRef.current.style.pointerEvents = p >= 0.82 ? "auto" : "none";
      }

      // 4A. CLOUD TITLE ("CLOUD COMPUTING" - 0.84 -> 0.92)
      if (cloudTitleRef.current) {
        const cloudT = smoothstep(0.84, 0.92, p);
        const cloudTitleY = (1 - cloudT) * 30;
        const cloudTitleBlur = (1 - cloudT) * 8;

        cloudTitleRef.current.style.opacity = cloudT.toFixed(3);
        cloudTitleRef.current.style.transform = `translate3d(0, ${cloudTitleY.toFixed(1)}px, 0)`;
        cloudTitleRef.current.style.filter = `blur(${cloudTitleBlur.toFixed(1)}px)`;
      }

      // 4B. CLOUD DESCRIPTION (0.86 -> 0.94)
      if (cloudDescRef.current) {
        const cloudDescT = smoothstep(0.86, 0.94, p);
        const cloudDescY = (1 - cloudDescT) * 25;
        const cloudDescBlur = (1 - cloudDescT) * 6;

        cloudDescRef.current.style.opacity = cloudDescT.toFixed(3);
        cloudDescRef.current.style.transform = `translate3d(0, ${cloudDescY.toFixed(1)}px, 0)`;
        cloudDescRef.current.style.filter = `blur(${cloudDescBlur.toFixed(1)}px)`;
      }

      // 4C. CLOUD TELEMETRY BLOCK (0.88 -> 0.96)
      if (cloudTeleRef.current) {
        const cloudTeleT = smoothstep(0.88, 0.96, p);
        const cloudTeleY = (1 - cloudTeleT) * 20;
        const cloudTeleBlur = (1 - cloudTeleT) * 4;

        cloudTeleRef.current.style.opacity = cloudTeleT.toFixed(3);
        cloudTeleRef.current.style.transform = `translate3d(0, ${cloudTeleY.toFixed(1)}px, 0)`;
        cloudTeleRef.current.style.filter = `blur(${cloudTeleBlur.toFixed(1)}px)`;
      }
    });
  }, []);

  return (
    <>
      {/* 
        ==================================================
        LAYER 1: NATIVE CONTINUOUS SCROLL TRACK
        ==================================================
        Provides 750vh continuous document height for mouse wheel / trackpad,
        with semantic anchor tags for navigation jumps (#overview, #local, #edge, #cloud).
        Zero scroll-snapping, zero slide hijacking.
      */}
      <div className="relative w-full h-[750vh] pointer-events-none" aria-hidden="true">
        <div id="overview" className="absolute top-0 h-px w-px" />
        <div id="local" className="absolute top-[180vh] h-px w-px" />
        <div id="edge" className="absolute top-[440vh] h-px w-px" />
        <div id="cloud" className="absolute top-[660vh] h-px w-px" />
      </div>

      {/* 
        ==================================================
        LAYER 2: STABLE EDITORIAL DOM COLUMN
        ==================================================
        Anchored to the scene viewport at left: 7vw, width: 32vw, max-width: 520px.
        Vertically centered around 52% viewport height.
        NOT parented to the moving 3D camera.
        Horizontal position is stable; vertical content fades and drifts continuously with scroll.
      */}
      <aside
        style={editorialColumnStyle}
        className="pointer-events-none select-none flex flex-col justify-center"
      >
        {/* 1. HERO CONTENT BLOCK */}
        <div
          ref={heroContentRef}
          style={{ willChange: "transform, opacity, filter" }}
          className="pointer-events-auto w-full"
        >
          {/* Main Title: Large display typography */}
          <h1
            style={{
              fontSize: "clamp(52px, 5.2vw, 84px)",
              lineHeight: "0.92",
              letterSpacing: "-0.035em",
            }}
            className="font-black text-white uppercase tracking-tight block"
          >
            AI-BASED<br />
            DYNAMIC TASK<br />
            OFFLOADING
          </h1>

          {/* Subtitle with deliberate vertical rhythm: heading ↓ 28px */}
          <p
            style={{
              marginTop: "28px",
              fontSize: "clamp(17px, 1.4vw, 20px)",
              lineHeight: "1.5",
            }}
            className="text-slate-400 font-normal font-sans"
          >
            Dynamic execution across local, edge and cloud computing.
          </p>

          {/* Subtle Technical Scroll Indicator: description ↓ 40px */}
          <div
            style={{ marginTop: "40px" }}
            className="flex items-center gap-3 font-mono text-xs tracking-[0.25em] text-slate-500 uppercase"
          >
            <span className="h-px w-6 bg-slate-700" />
            <span>SCROLL TO EXPLORE</span>
          </div>
        </div>

        {/* 2. LOCAL CONTENT BLOCK (Exact identical footprint, left: 7vw) */}
        <div
          ref={localContainerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            opacity: 0,
          }}
          className="pointer-events-auto"
        >
          {/* LOCAL HEADING:
              LOCAL: 32–40px, uppercase, technical spacing
              COMPUTATION: 72–96px, bold, tight line height
          */}
          <div
            ref={localTitleRef}
            style={{ willChange: "transform, opacity, filter", opacity: 0 }}
            className="flex flex-col select-none"
          >
            <span
              style={{
                fontSize: "clamp(32px, 2.8vw, 40px)",
                lineHeight: "1.0",
                letterSpacing: "0.06em",
              }}
              className="font-bold text-slate-400 uppercase tracking-wider block font-sans"
            >
              LOCAL
            </span>
            <span
              style={{
                fontSize: "clamp(72px, 6.8vw, 96px)",
                lineHeight: "0.90",
                letterSpacing: "-0.035em",
              }}
              className="font-black text-white uppercase tracking-tight block mt-1 font-sans"
            >
              COMPUTATION
            </span>
          </div>

          {/* LOCAL DESCRIPTION: 16–18px Geist Sans, heading ↓ 24px */}
          <p
            ref={localDescRef}
            style={{
              marginTop: "24px",
              fontSize: "clamp(16px, 1.15vw, 18px)",
              lineHeight: "1.5",
              willChange: "transform, opacity, filter",
              opacity: 0,
            }}
            className="text-slate-300 font-normal font-sans"
          >
            The task is processed directly on the originating device instead of being transferred to a remote server.
          </p>

          {/* SUPPORTING INFORMATION & TELEMETRY BLOCK (Reveals continuously 0.55 -> 0.70) */}
          <div
            ref={localTeleRef}
            style={{
              marginTop: "28px",
              width: "100%",
              maxWidth: "460px",
              opacity: 0,
              willChange: "transform, opacity, filter",
            }}
            className="select-none"
          >
            {/* 3. Supporting Information: EXECUTION / ADVANTAGE / TRADE-OFF */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                rowGap: "10px",
                columnGap: "14px",
                lineHeight: "1.4",
              }}
              className="text-[13px]"
            >
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                EXECUTION
              </span>
              <span className="font-sans text-slate-200">
                Runs directly on the local device
              </span>

              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                ADVANTAGE
              </span>
              <span className="font-sans text-slate-200">
                No network transfer required
              </span>

              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                TRADE-OFF
              </span>
              <span className="font-sans text-slate-200">
                Limited by device compute, memory and battery
              </span>
            </div>

            {/* Subtle separator */}
            <div className="w-12 h-px bg-cyan-400/25 my-4" />

            {/* 4. CURRENT STATE */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                columnGap: "14px",
                alignItems: "baseline",
                lineHeight: "1.4",
              }}
            >
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-cyan-400">
                CURRENT STATE
              </span>
              <span className="font-mono text-[12px] font-bold tracking-wider text-cyan-300">
                TASK_001 · OBJECT DETECTION
              </span>
            </div>

            {/* Subtle separator */}
            <div className="w-12 h-px bg-cyan-400/25 my-4" />

            {/* 5. Existing Telemetry */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                rowGap: "7px",
                columnGap: "14px",
                fontSize: "12px",
                lineHeight: "1.4",
                letterSpacing: "0.10em",
              }}
              className="font-mono"
            >
              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                CPU
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                16-CORE @ 4.2 GHz
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                MEMORY
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                32 GB
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                BATTERY
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                94% HEALTH
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                LATENCY
              </span>
              <span className="text-cyan-300 font-semibold tracking-wider">
                0.8 MS
              </span>
            </div>
          </div>
        </div>

        {/* 3. EDGE CONTENT BLOCK (Exact identical footprint, left: 7vw) */}
        <div
          ref={edgeContainerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            opacity: 1,
          }}
          className="pointer-events-auto"
        >
          {/* EDGE HEADING:
              EDGE: 32–40px, uppercase, technical spacing
              COMPUTING: 72–96px, bold, tight line height
          */}
          <div
            ref={edgeTitleRef}
            style={{ willChange: "transform, opacity, filter", opacity: 0 }}
            className="flex flex-col select-none"
          >
            <span
              style={{
                fontSize: "clamp(32px, 2.8vw, 40px)",
                lineHeight: "1.0",
                letterSpacing: "0.06em",
              }}
              className="font-bold text-slate-400 uppercase tracking-wider block font-sans"
            >
              EDGE
            </span>
            <span
              style={{
                fontSize: "clamp(72px, 6.8vw, 96px)",
                lineHeight: "0.90",
                letterSpacing: "-0.035em",
              }}
              className="font-black text-white uppercase tracking-tight block mt-1 font-sans"
            >
              COMPUTING
            </span>
          </div>

          {/* EDGE DESCRIPTION: Heading ↓ 24px, matching Local hierarchy */}
          <div
            ref={edgeDescRef}
            style={{
              marginTop: "24px",
              willChange: "transform, opacity, filter",
              opacity: 0,
            }}
            className="flex flex-col gap-2"
          >
            <p
              style={{
                fontSize: "clamp(18px, 1.25vw, 20px)",
                lineHeight: "1.4",
              }}
              className="text-emerald-400 font-medium font-sans"
            >
              Move computation closer to the user.
            </p>
            <p
              style={{
                fontSize: "clamp(15px, 1.1vw, 17px)",
                lineHeight: "1.55",
              }}
              className="text-slate-300 font-normal font-sans"
            >
              Instead of executing entirely on the originating device, the task is processed by a nearby edge node positioned closer to the user.
            </p>
          </div>

          {/* SUPPORTING INFORMATION & TELEMETRY BLOCK (Continuous reveal 0.88 -> 1.00) */}
          <div
            ref={edgeTeleRef}
            style={{
              marginTop: "28px",
              width: "100%",
              maxWidth: "460px",
              opacity: 0,
              willChange: "transform, opacity, filter",
            }}
            className="select-none"
          >
            {/* Supporting Information: EXECUTION / ADVANTAGE / TRADE-OFF */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                rowGap: "10px",
                columnGap: "14px",
                lineHeight: "1.4",
              }}
              className="text-[13px]"
            >
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                EXECUTION
              </span>
              <span className="font-sans text-slate-200">
                Processed by nearby edge node
              </span>

              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                ADVANTAGE
              </span>
              <span className="font-sans text-slate-200">
                Lower network distance than remote cloud region
              </span>

              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                TRADE-OFF
              </span>
              <span className="font-sans text-slate-200">
                Limited by available edge capacity and queue conditions
              </span>
            </div>

            {/* Subtle separator */}
            <div className="w-12 h-px bg-emerald-400/25 my-4" />

            {/* CURRENT STATE */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                columnGap: "14px",
                alignItems: "baseline",
                lineHeight: "1.4",
              }}
            >
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-emerald-400">
                CURRENT STATE
              </span>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[12px] font-bold tracking-wider text-emerald-300">
                  TASK_001 · OBJECT DETECTION
                </span>
                <span className="font-mono text-[10px] tracking-[0.16em] text-emerald-300/90 uppercase font-semibold px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10">
                  OFFLOADED → EDGE
                </span>
              </div>
            </div>

            {/* Subtle separator */}
            <div className="w-12 h-px bg-emerald-400/25 my-4" />

            {/* Simulated Edge Telemetry */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                rowGap: "7px",
                columnGap: "14px",
                fontSize: "12px",
                lineHeight: "1.4",
                letterSpacing: "0.10em",
              }}
              className="font-mono"
            >
              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                LATENCY
              </span>
              <span className="text-emerald-300 font-semibold tracking-wider">
                3.8 MS
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                QUEUE
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                2 TASKS
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                CPU LOAD
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                41%
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                BANDWIDTH
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                10 GBPS
              </span>
            </div>

            {/* Clear Simulation / Demo Notice */}
            <div className="mt-3.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
              <span className="h-1 w-1 rounded-full bg-emerald-500/60" />
              <span>SIMULATED TELEMETRY · DEMO BENCHMARK</span>
            </div>
          </div>
        </div>

        {/* 4. CLOUD CONTENT BLOCK (Exact identical footprint, left: 7vw) */}
        <div
          ref={cloudContainerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            opacity: 1,
          }}
          className="pointer-events-auto"
        >
          {/* CLOUD HEADING:
              CLOUD: 32–40px, uppercase, technical spacing
              COMPUTING: 72–96px, bold, tight line height
          */}
          <div
            ref={cloudTitleRef}
            style={{ willChange: "transform, opacity, filter", opacity: 0 }}
            className="flex flex-col select-none"
          >
            <span
              style={{
                fontSize: "clamp(32px, 2.8vw, 40px)",
                lineHeight: "1.0",
                letterSpacing: "0.06em",
              }}
              className="font-bold text-slate-400 uppercase tracking-wider block font-sans"
            >
              CLOUD
            </span>
            <span
              style={{
                fontSize: "clamp(72px, 6.8vw, 96px)",
                lineHeight: "0.90",
                letterSpacing: "-0.035em",
              }}
              className="font-black text-white uppercase tracking-tight block mt-1 font-sans"
            >
              COMPUTING
            </span>
          </div>

          {/* CLOUD SUBTITLE & DESCRIPTION: Heading ↓ 24px, matching Local & Edge hierarchy */}
          <div
            ref={cloudDescRef}
            style={{
              marginTop: "24px",
              willChange: "transform, opacity, filter",
              opacity: 0,
            }}
            className="flex flex-col gap-2"
          >
            <p
              style={{
                fontSize: "clamp(18px, 1.25vw, 20px)",
                lineHeight: "1.4",
              }}
              className="text-violet-400 font-medium font-sans"
            >
              Scale computation beyond the edge.
            </p>
            <p
              style={{
                fontSize: "clamp(15px, 1.1vw, 17px)",
                lineHeight: "1.55",
              }}
              className="text-slate-300 font-normal font-sans"
            >
              Tasks that exceed local or edge capabilities can be forwarded to centralized cloud infrastructure for larger-scale computation.
            </p>
          </div>

          {/* SUPPORTING INFORMATION & TELEMETRY BLOCK (Continuous reveal 0.88 -> 1.00) */}
          <div
            ref={cloudTeleRef}
            style={{
              marginTop: "28px",
              width: "100%",
              maxWidth: "460px",
              opacity: 0,
              willChange: "transform, opacity, filter",
            }}
            className="select-none"
          >
            {/* Supporting Information: EXECUTION / ADVANTAGE / TRADE-OFF */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                rowGap: "10px",
                columnGap: "14px",
                lineHeight: "1.4",
              }}
              className="text-[13px]"
            >
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                EXECUTION
              </span>
              <span className="font-sans text-slate-200">
                Processed by centralized cloud infrastructure
              </span>

              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                ADVANTAGE
              </span>
              <span className="font-sans text-slate-200">
                High computational capacity and scalable resources
              </span>

              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">
                TRADE-OFF
              </span>
              <span className="font-sans text-slate-200">
                Greater network distance and potentially higher latency
              </span>
            </div>

            {/* Subtle separator */}
            <div className="w-12 h-px bg-violet-400/25 my-4" />

            {/* CURRENT STATE */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                columnGap: "14px",
                alignItems: "baseline",
                lineHeight: "1.4",
              }}
            >
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-violet-400">
                CURRENT STATE
              </span>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[12px] font-bold tracking-wider text-violet-300">
                  TASK_001 · OBJECT DETECTION
                </span>
                <span className="font-mono text-[10px] tracking-[0.16em] text-violet-300/90 uppercase font-semibold px-1.5 py-0.5 rounded border border-violet-500/30 bg-violet-500/10">
                  OFFLOADED → CLOUD
                </span>
              </div>
            </div>

            {/* Subtle separator */}
            <div className="w-12 h-px bg-violet-400/25 my-4" />

            {/* Simulated Cloud Telemetry */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                rowGap: "7px",
                columnGap: "14px",
                fontSize: "12px",
                lineHeight: "1.4",
                letterSpacing: "0.10em",
              }}
              className="font-mono"
            >
              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                LATENCY
              </span>
              <span className="text-violet-300 font-semibold tracking-wider">
                42 MS
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                QUEUE
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                18 TASKS
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                CPU LOAD
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                67%
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                BANDWIDTH
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                25 GBPS
              </span>
            </div>

            {/* Clear Simulation / Demo Notice */}
            <div className="mt-3.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
              <span className="h-1 w-1 rounded-full bg-violet-500/60" />
              <span>SIMULATED TELEMETRY · DEMO VALUES</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
