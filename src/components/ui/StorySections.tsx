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
  const edgeDescRef = useRef<HTMLParagraphElement>(null);
  const edgeTeleRef = useRef<HTMLDivElement>(null);

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

      // 1. HERO CONTENT (Fully visible at p = 0, leaves gradually as user scrolls)
      if (heroContentRef.current) {
        const heroT = smoothstep(0.12, 0.30, p);
        const heroOpacity = Math.max(0, 1 - heroT);
        const heroY = -heroT * 40;
        const heroBlur = heroT * 6;

        heroContentRef.current.style.opacity = heroOpacity.toFixed(3);
        heroContentRef.current.style.transform = `translate3d(0, ${heroY.toFixed(1)}px, 0)`;
        heroContentRef.current.style.filter = `blur(${heroBlur.toFixed(1)}px)`;
        heroContentRef.current.style.pointerEvents = heroOpacity > 0.1 ? "auto" : "none";
      }

      // Shared exit curve for Local content as task travels toward Edge (0.76–0.90)
      const localExit = smoothstep(0.76, 0.90, p);

      if (localContainerRef.current) {
        localContainerRef.current.style.opacity = (1 - localExit).toFixed(3);
        localContainerRef.current.style.pointerEvents =
          p >= 0.18 && localExit < 0.85 ? "auto" : "none";
      }

      // 2A. LOCAL TITLE ("LOCAL COMPUTATION" - continuous scroll reveal 0.20 -> 0.38)
      if (localTitleRef.current) {
        const titleT = smoothstep(0.20, 0.38, p);
        const titleOpacity = titleT * (1 - localExit);
        const titleY = (1 - titleT) * 40 - localExit * 20;
        const titleBlur = (1 - titleT) * 8 + localExit * 4;

        localTitleRef.current.style.opacity = titleOpacity.toFixed(3);
        localTitleRef.current.style.transform = `translate3d(0, ${titleY.toFixed(1)}px, 0)`;
        localTitleRef.current.style.filter = `blur(${titleBlur.toFixed(1)}px)`;
      }

      // 2B. LOCAL DESCRIPTION (Same scroll interpolation, slightly delayed 0.24 -> 0.42)
      if (localDescRef.current) {
        const descT = smoothstep(0.24, 0.42, p);
        const descOpacity = descT * (1 - localExit);
        const descY = (1 - descT) * 35 - localExit * 20;
        const descBlur = (1 - descT) * 6 + localExit * 4;

        localDescRef.current.style.opacity = descOpacity.toFixed(3);
        localDescRef.current.style.transform = `translate3d(0, ${descY.toFixed(1)}px, 0)`;
        localDescRef.current.style.filter = `blur(${descBlur.toFixed(1)}px)`;
      }

      // 2C. LOCAL TELEMETRY BLOCK (Continuous reveal as task materializes 0.55 -> 0.70)
      if (localTeleRef.current) {
        const teleT = smoothstep(0.55, 0.70, p);
        const teleOpacity = teleT * (1 - localExit);
        const teleY = (1 - teleT) * 25 - localExit * 20;
        const teleBlur = (1 - teleT) * 4 + localExit * 4;

        localTeleRef.current.style.opacity = teleOpacity.toFixed(3);
        localTeleRef.current.style.transform = `translate3d(0, ${teleY.toFixed(1)}px, 0)`;
        localTeleRef.current.style.filter = `blur(${teleBlur.toFixed(1)}px)`;
      }

      // 3. EDGE CONTAINER
      if (edgeContainerRef.current) {
        edgeContainerRef.current.style.pointerEvents = p >= 0.80 ? "auto" : "none";
      }

      // 3A. EDGE TITLE ("EDGE COMPUTING" - continuous scroll reveal 0.82 -> 0.98)
      if (edgeTitleRef.current) {
        const edgeReveal = smoothstep(0.82, 0.98, p);
        const edgeTitleY = (1 - edgeReveal) * 30;
        const edgeTitleBlur = (1 - edgeReveal) * 8;

        edgeTitleRef.current.style.opacity = edgeReveal.toFixed(3);
        edgeTitleRef.current.style.transform = `translate3d(0, ${edgeTitleY.toFixed(1)}px, 0)`;
        edgeTitleRef.current.style.filter = `blur(${edgeTitleBlur.toFixed(1)}px)`;
      }

      // 3B. EDGE DESCRIPTION (Slightly delayed 0.85 -> 0.99)
      if (edgeDescRef.current) {
        const edgeDescReveal = smoothstep(0.85, 0.99, p);
        const edgeDescY = (1 - edgeDescReveal) * 25;
        const edgeDescBlur = (1 - edgeDescReveal) * 6;

        edgeDescRef.current.style.opacity = edgeDescReveal.toFixed(3);
        edgeDescRef.current.style.transform = `translate3d(0, ${edgeDescY.toFixed(1)}px, 0)`;
        edgeDescRef.current.style.filter = `blur(${edgeDescBlur.toFixed(1)}px)`;
      }

      // 3C. EDGE TELEMETRY BLOCK (Continuous reveal 0.88 -> 1.00)
      if (edgeTeleRef.current) {
        const edgeTeleReveal = smoothstep(0.88, 1.00, p);
        const edgeTeleY = (1 - edgeTeleReveal) * 20;
        const edgeTeleBlur = (1 - edgeTeleReveal) * 4;

        edgeTeleRef.current.style.opacity = edgeTeleReveal.toFixed(3);
        edgeTeleRef.current.style.transform = `translate3d(0, ${edgeTeleY.toFixed(1)}px, 0)`;
        edgeTeleRef.current.style.filter = `blur(${edgeTeleBlur.toFixed(1)}px)`;
      }
    });
  }, []);

  return (
    <>
      {/* 
        ==================================================
        LAYER 1: NATIVE CONTINUOUS SCROLL TRACK
        ==================================================
        Provides 500vh continuous document height for mouse wheel / trackpad,
        with semantic anchor tags for navigation jumps (#overview, #local, #edge, #cloud).
        Zero scroll-snapping, zero slide hijacking.
      */}
      <div className="relative w-full h-[500vh] pointer-events-none" aria-hidden="true">
        <div id="overview" className="absolute top-0 h-px w-px" />
        <div id="local" className="absolute top-[160vh] h-px w-px" />
        <div id="edge" className="absolute top-[380vh] h-px w-px" />
        <div id="cloud" className="absolute top-[480vh] h-px w-px" />
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

          {/* EDGE DESCRIPTION: 18–20px Geist Sans, heading ↓ 28px */}
          <p
            ref={edgeDescRef}
            style={{
              marginTop: "28px",
              fontSize: "clamp(18px, 1.3vw, 20px)",
              lineHeight: "1.5",
              willChange: "transform, opacity, filter",
              opacity: 0,
            }}
            className="text-slate-300 font-normal font-sans"
          >
            Move computation closer to the user.
          </p>

          {/* METADATA & TELEMETRY BLOCK: description ↓ 36px, Geist Mono */}
          <div
            ref={edgeTeleRef}
            style={{
              marginTop: "36px",
              width: "100%",
              maxWidth: "340px",
              opacity: 0,
              willChange: "transform, opacity, filter",
            }}
            className="select-none font-mono"
          >
            {/* Task Identity */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span
                  style={{
                    fontSize: "clamp(24px, 1.8vw, 28px)",
                    lineHeight: "1.1",
                    letterSpacing: "0.06em",
                  }}
                  className="text-emerald-400 font-bold uppercase tracking-wider block"
                >
                  TASK_001
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.16em",
                  }}
                  className="text-emerald-300/90 uppercase font-semibold px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10"
                >
                  OFFLOADED → EDGE
                </span>
              </div>
              <span
                style={{
                  fontSize: "clamp(12px, 0.95vw, 14px)",
                  lineHeight: "1.2",
                  letterSpacing: "0.14em",
                }}
                className="text-slate-400 font-medium uppercase mt-1.5 block"
              >
                OBJECT DETECTION
              </span>
            </div>

            {/* Subtle separator */}
            <div className="w-14 h-px bg-emerald-400/25 my-4" />

            {/* Clean Fixed-Width CSS Grid Telemetry: 120px 1fr */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                rowGap: "8px",
                fontSize: "clamp(12px, 0.95vw, 13px)",
                lineHeight: "1.4",
                letterSpacing: "0.10em",
              }}
            >
              <span className="text-slate-400 uppercase">LATENCY</span>
              <span className="text-emerald-300 font-semibold tracking-wider">3.8 MS</span>

              <span className="text-slate-400 uppercase">QUEUE</span>
              <span className="text-slate-100 font-semibold tracking-wider">2 TASKS</span>

              <span className="text-slate-400 uppercase">CPU LOAD</span>
              <span className="text-slate-100 font-semibold tracking-wider">41%</span>

              <span className="text-slate-400 uppercase">BANDWIDTH</span>
              <span className="text-slate-100 font-semibold tracking-wider">10 GBPS</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
