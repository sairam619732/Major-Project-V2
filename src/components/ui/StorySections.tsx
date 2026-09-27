"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { subscribeScroll } from "@/store/scrollStore";
import {
  evaluateOffloadingDecision,
  DEFAULT_TASK,
  DEFAULT_DEVICE,
  DEFAULT_EDGE,
  DEFAULT_CLOUD,
} from "@/lib/offloading/decisionEngine";
import { transitionStore } from "@/lib/transition/transitionStore";

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function StorySections() {
  const router = useRouter();
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

  // Phase 10 Decision Offloading Engine Refs
  const decisionContainerRef = useRef<HTMLDivElement>(null);
  const decisionTitleRef = useRef<HTMLDivElement>(null);
  const decisionDescRef = useRef<HTMLDivElement>(null);
  const decisionTaskRef = useRef<HTMLDivElement>(null);
  const decisionReasonRef = useRef<HTMLDivElement>(null);
  const decisionCtaRef = useRef<HTMLDivElement>(null);

  // Cinematic Transition to /simulation Veil Ref
  const transitionVeilRef = useRef<HTMLDivElement>(null);

  const candidateCardsContainerRef = useRef<HTMLDivElement>(null);
  const localCardRef = useRef<HTMLDivElement>(null);
  const edgeCardRef = useRef<HTMLDivElement>(null);
  const cloudCardRef = useRef<HTMLDivElement>(null);

  // Deterministic evaluation of simulated benchmark state
  const decisionResult = evaluateOffloadingDecision(
    DEFAULT_TASK,
    DEFAULT_DEVICE,
    DEFAULT_EDGE,
    DEFAULT_CLOUD
  );

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

      // 4. CLOUD CONTENT (Reveals 0.84 -> 0.96, exits 1.00 -> 1.08 as scroll enters Decision)
      const cloudExit = smoothstep(1.00, 1.08, p);

      if (cloudContainerRef.current) {
        cloudContainerRef.current.style.opacity = (1 - cloudExit).toFixed(3);
        cloudContainerRef.current.style.pointerEvents =
          p >= 0.82 && cloudExit < 0.85 ? "auto" : "none";
      }

      // 4A. CLOUD TITLE ("CLOUD COMPUTING" - 0.84 -> 0.92)
      if (cloudTitleRef.current) {
        const cloudT = smoothstep(0.84, 0.92, p);
        const cloudOpacity = cloudT * (1 - cloudExit);
        const cloudTitleY = (1 - cloudT) * 30 - cloudExit * 20;
        const cloudTitleBlur = (1 - cloudT) * 8 + cloudExit * 4;

        cloudTitleRef.current.style.opacity = cloudOpacity.toFixed(3);
        cloudTitleRef.current.style.transform = `translate3d(0, ${cloudTitleY.toFixed(1)}px, 0)`;
        cloudTitleRef.current.style.filter = `blur(${cloudTitleBlur.toFixed(1)}px)`;
      }

      // 4B. CLOUD DESCRIPTION (0.86 -> 0.94)
      if (cloudDescRef.current) {
        const cloudDescT = smoothstep(0.86, 0.94, p);
        const cloudDescOpacity = cloudDescT * (1 - cloudExit);
        const cloudDescY = (1 - cloudDescT) * 25 - cloudExit * 20;
        const cloudDescBlur = (1 - cloudDescT) * 6 + cloudExit * 4;

        cloudDescRef.current.style.opacity = cloudDescOpacity.toFixed(3);
        cloudDescRef.current.style.transform = `translate3d(0, ${cloudDescY.toFixed(1)}px, 0)`;
        cloudDescRef.current.style.filter = `blur(${cloudDescBlur.toFixed(1)}px)`;
      }

      // 4C. CLOUD TELEMETRY BLOCK (0.88 -> 0.96)
      if (cloudTeleRef.current) {
        const cloudTeleT = smoothstep(0.88, 0.96, p);
        const cloudTeleOpacity = cloudTeleT * (1 - cloudExit);
        const cloudTeleY = (1 - cloudTeleT) * 20 - cloudExit * 20;
        const cloudTeleBlur = (1 - cloudTeleT) * 4 + cloudExit * 4;

        cloudTeleRef.current.style.opacity = cloudTeleOpacity.toFixed(3);
        cloudTeleRef.current.style.transform = `translate3d(0, ${cloudTeleY.toFixed(1)}px, 0)`;
        cloudTeleRef.current.style.filter = `blur(${cloudTeleBlur.toFixed(1)}px)`;
      }

      // 5. DECISION CONTENT (Phase 10 & 11.2: Reveals 1.06 -> 1.18, evaluates 1.20 -> 1.34)
      // Main cinematic story stops at Decision.
      const decT = smoothstep(1.06, 1.18, p);
      const evalT = smoothstep(1.20, 1.34, p);

      if (decisionContainerRef.current) {
        decisionContainerRef.current.style.opacity = decT.toFixed(3);
        decisionContainerRef.current.style.pointerEvents =
          decT > 0.1 ? "auto" : "none";
      }

      if (decisionTitleRef.current) {
        const titleY = (1 - decT) * 30;
        const titleBlur = (1 - decT) * 8;
        decisionTitleRef.current.style.opacity = decT.toFixed(3);
        decisionTitleRef.current.style.transform = `translate3d(0, ${titleY.toFixed(1)}px, 0)`;
        decisionTitleRef.current.style.filter = `blur(${titleBlur.toFixed(1)}px)`;
      }

      if (decisionDescRef.current) {
        const descT = smoothstep(1.08, 1.20, p);
        const descY = (1 - descT) * 25;
        const descBlur = (1 - descT) * 6;
        decisionDescRef.current.style.opacity = descT.toFixed(3);
        decisionDescRef.current.style.transform = `translate3d(0, ${descY.toFixed(1)}px, 0)`;
        decisionDescRef.current.style.filter = `blur(${descBlur.toFixed(1)}px)`;
      }

      if (decisionTaskRef.current) {
        const taskT = smoothstep(1.12, 1.24, p);
        const taskY = (1 - taskT) * 20;
        const taskBlur = (1 - taskT) * 4;
        decisionTaskRef.current.style.opacity = taskT.toFixed(3);
        decisionTaskRef.current.style.transform = `translate3d(0, ${taskY.toFixed(1)}px, 0)`;
        decisionTaskRef.current.style.filter = `blur(${taskBlur.toFixed(1)}px)`;
      }

      if (decisionReasonRef.current) {
        const reasonY = (1 - evalT) * 15;
        const reasonBlur = (1 - evalT) * 4;
        decisionReasonRef.current.style.opacity = evalT.toFixed(3);
        decisionReasonRef.current.style.transform = `translate3d(0, ${reasonY.toFixed(1)}px, 0)`;
        decisionReasonRef.current.style.filter = `blur(${reasonBlur.toFixed(1)}px)`;
      }

      if (decisionCtaRef.current) {
        const ctaT = smoothstep(1.24, 1.34, p);
        const ctaY = (1 - ctaT) * 15;
        decisionCtaRef.current.style.opacity = ctaT.toFixed(3);
        decisionCtaRef.current.style.transform = `translate3d(0, ${ctaY.toFixed(1)}px, 0)`;
        decisionCtaRef.current.style.pointerEvents = ctaT > 0.4 ? "auto" : "none";
      }

      // Right Candidate Cards Column
      if (candidateCardsContainerRef.current) {
        const cardsT = smoothstep(1.08, 1.20, p);
        candidateCardsContainerRef.current.style.opacity = cardsT.toFixed(3);
        candidateCardsContainerRef.current.style.pointerEvents =
          cardsT > 0.1 ? "auto" : "none";
        candidateCardsContainerRef.current.style.transform = `translate3d(0, calc(-50% + ${(1 - cardsT) * 30}px), 0)`;
        candidateCardsContainerRef.current.style.filter = `blur(${((1 - cardsT) * 6).toFixed(1)}px)`;
      }

      // Candidate Card Highlights when evaluated
      if (localCardRef.current) {
        localCardRef.current.style.opacity = (1 - evalT * 0.35).toFixed(3);
      }
      if (edgeCardRef.current) {
        edgeCardRef.current.style.borderColor =
          evalT > 0.5 ? "rgba(52, 211, 153, 0.6)" : "rgba(255, 255, 255, 0.08)";
        edgeCardRef.current.style.boxShadow =
          evalT > 0.5 ? "0 0 24px -4px rgba(16, 185, 129, 0.25)" : "none";
      }
      if (cloudCardRef.current) {
        cloudCardRef.current.style.opacity = (1 - evalT * 0.35).toFixed(3);
      }
    });
  }, []);

  // Phase 11.2: Listen to transition store during ENTER SIMULATION activation
  useEffect(() => {
    return transitionStore.subscribe((progress, isTrans) => {
      if (!isTrans) {
        if (transitionVeilRef.current) {
          transitionVeilRef.current.style.opacity = "0";
        }
        return;
      }

      // 0.15 - 0.45: UI softly dissolves as signal detaches
      const uiFade = 1 - smoothstep(0.15, 0.45, progress);
      if (decisionContainerRef.current) {
        decisionContainerRef.current.style.opacity = (
          parseFloat(decisionContainerRef.current.style.opacity || "1") * uiFade
        ).toFixed(3);
      }
      if (candidateCardsContainerRef.current) {
        candidateCardsContainerRef.current.style.opacity = (
          parseFloat(candidateCardsContainerRef.current.style.opacity || "1") * uiFade
        ).toFixed(3);
      }

      // 0.72 - 0.98: Deep space dark void veil covers screen
      if (transitionVeilRef.current) {
        const veilT = smoothstep(0.72, 0.98, progress);
        transitionVeilRef.current.style.opacity = veilT.toFixed(3);
      }
    });
  }, []);

  return (
    <>
      {/* 
        ==================================================
        LAYER 1: NATIVE CONTINUOUS SCROLL TRACK
        ==================================================
        Provides 980vh continuous document height for mouse wheel / trackpad,
        with semantic anchor tags for navigation jumps (#overview, #local, #edge, #cloud, #decision).
        The main cinematic story stops at Decision.
        Zero scroll-snapping, zero slide hijacking.
      */}
      <div className="relative w-full h-[980vh] pointer-events-none" aria-hidden="true">
        <div id="overview" className="absolute top-0 h-px w-px" />
        <div id="local" className="absolute top-[180vh] h-px w-px" />
        <div id="edge" className="absolute top-[440vh] h-px w-px" />
        <div id="cloud" className="absolute top-[660vh] h-px w-px" />
        <div id="decision" className="absolute top-[880vh] h-px w-px" />
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

        {/* 5. DECISION CONTENT BLOCK (Exact identical footprint, left: 7vw) */}
        <div
          ref={decisionContainerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            opacity: 0,
          }}
          className="pointer-events-auto"
        >
          {/* DECISION HEADING:
              DECISION: 32–40px, uppercase, technical spacing
              OFFLOADING: 72–96px, bold, tight line height
          */}
          <div
            ref={decisionTitleRef}
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
              DECISION
            </span>
            <span
              style={{
                fontSize: "clamp(72px, 6.8vw, 96px)",
                lineHeight: "0.90",
                letterSpacing: "-0.035em",
              }}
              className="font-black text-white uppercase tracking-tight block mt-1 font-sans"
            >
              OFFLOADING
            </span>
          </div>

          {/* SUBTITLE & DESCRIPTION */}
          <div
            ref={decisionDescRef}
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
              className="text-cyan-400 font-medium font-sans"
            >
              Choose where the task should execute.
            </p>
            <p
              style={{
                fontSize: "clamp(15px, 1.1vw, 17px)",
                lineHeight: "1.55",
              }}
              className="text-slate-300 font-normal font-sans"
            >
              The system evaluates task requirements, device resources, network conditions, and compute availability before selecting an execution environment.
            </p>
          </div>

          {/* TASK_001 SPECIFICATION & TELEMETRY BLOCK */}
          <div
            ref={decisionTaskRef}
            style={{
              marginTop: "24px",
              width: "100%",
              maxWidth: "480px",
              opacity: 0,
              willChange: "transform, opacity, filter",
            }}
            className="select-none"
          >
            {/* Task Identification & Input Parameters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "130px 1fr",
                rowGap: "7px",
                columnGap: "14px",
                fontSize: "12px",
                lineHeight: "1.4",
                letterSpacing: "0.10em",
              }}
              className="font-mono"
            >
              <span className="text-cyan-400 font-semibold uppercase text-[11px] tracking-[0.16em]">
                CURRENT TASK
              </span>
              <span className="text-cyan-200 font-bold tracking-wider">
                {DEFAULT_TASK.id} · {DEFAULT_TASK.name}
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                TASK SIZE
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                {DEFAULT_TASK.taskSizeMb} MB
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                CPU DEMAND
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                {DEFAULT_TASK.cpuDemandPct} %
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                MEMORY DEMAND
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                {DEFAULT_TASK.memoryDemandPct} %
              </span>

              <span className="text-slate-400 uppercase text-[11px] tracking-[0.16em]">
                DEADLINE
              </span>
              <span className="text-slate-100 font-semibold tracking-wider">
                {DEFAULT_TASK.deadlineMs} MS
              </span>
            </div>

            {/* Subtle separator */}
            <div className="w-12 h-px bg-cyan-400/25 my-3.5" />

            {/* Dynamically Evaluated Selected Target & Reason */}
            <div
              ref={decisionReasonRef}
              style={{ willChange: "transform, opacity, filter", opacity: 0 }}
              className="p-3.5 rounded border border-emerald-500/40 bg-emerald-950/20 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SELECTED EXECUTION ENVIRONMENT
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                  {decisionResult.selectedCandidate.displayName}
                </span>
              </div>
              <p className="font-sans text-[13px] leading-relaxed text-slate-200">
                &ldquo;{decisionResult.reason}&rdquo;
              </p>
            </div>

            {/* Clear Simulation Notice */}
            <div className="mt-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
              <span className="h-1 w-1 rounded-full bg-cyan-500/60" />
              <span>SIMULATED INPUTS · DEMO VALUES</span>
            </div>

            {/* Editorial Restrained Transition CTA to /simulation */}
            <div
              ref={decisionCtaRef}
              style={{ willChange: "transform, opacity", opacity: 0 }}
              className="mt-6 flex flex-col gap-2.5 pointer-events-auto"
            >
              <button
                type="button"
                onClick={() => {
                  transitionStore.triggerTransition(
                    () => {
                      router.push("/simulation");
                    },
                    2200,
                    "decision_exit"
                  );
                }}
                className="group relative flex items-center justify-between w-full px-5 py-3.5 rounded border border-cyan-500/50 bg-[#03141f]/75 hover:border-cyan-400 hover:bg-cyan-950/60 transition-all duration-300 backdrop-blur-md cursor-pointer shadow-[0_0_24px_-6px_rgba(6,182,212,0.35)]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform duration-300 shadow-[0_0_8px_#38bdf8]" />
                  <span className="font-mono text-sm font-bold tracking-[0.22em] uppercase text-cyan-100 group-hover:text-white transition-colors">
                    ENTER SIMULATION
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs tracking-[0.20em] uppercase text-cyan-300/90 group-hover:text-cyan-200 transition-colors font-medium">
                    RESEARCH LAB
                  </span>
                  <span className="font-mono text-base text-cyan-400 group-hover:translate-x-1.5 transition-transform duration-300">
                    →
                  </span>
                </div>
              </button>
              <span className="font-mono text-xs tracking-[0.20em] text-slate-400 uppercase text-center">
                SYSTEM // EXPERIMENT TRANSITION
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 
        ==================================================
        LAYER 3: CANDIDATE EXECUTION ENVIRONMENTS COLUMN
        ==================================================
        Positioned fixed on the right side of the screen at right: 7vw.
        Features 3 restrained technical nodes/cards: LOCAL, EDGE, CLOUD.
        Matches editorial visual language; selected environment receives visual emphasis.
      */}
      <aside
        ref={candidateCardsContainerRef}
        style={{
          position: "fixed",
          right: "6vw",
          top: "52%",
          transform: "translateY(-50%)",
          width: "23vw",
          maxWidth: "340px",
          zIndex: 20,
          opacity: 0,
        }}
        className="pointer-events-none select-none flex flex-col gap-3 justify-center"
      >
        <div className="flex items-center justify-between px-1 mb-0.5">
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-400">
            EVALUATION CANDIDATES
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-slate-500">
            COST SCORE
          </span>
        </div>

        {/* 1. LOCAL CANDIDATE CARD */}
        <div
          ref={localCardRef}
          className="rounded border border-white/[0.08] bg-[#050914]/85 p-3.5 backdrop-blur-md transition-all duration-300 pointer-events-auto"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-mono text-xs font-bold tracking-[0.18em] uppercase text-amber-300">
                LOCAL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">
                SCORE
              </span>
              <span className="font-mono text-xs font-bold text-amber-200">
                {decisionResult.candidateScores.local.score}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px] text-slate-300">
            <div className="flex justify-between border-b border-white/[0.04] pb-1">
              <span className="text-slate-400 uppercase text-[10px]">CPU AVAIL</span>
              <span className="font-semibold">{DEFAULT_DEVICE.cpuAvailablePct}%</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-1">
              <span className="text-slate-400 uppercase text-[10px]">MEMORY AVAIL</span>
              <span className="font-semibold">{DEFAULT_DEVICE.memoryAvailablePct}%</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-400 uppercase text-[10px]">BATTERY</span>
              <span className="font-semibold">{DEFAULT_DEVICE.batteryPct}%</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-400 uppercase text-[10px]">LATENCY</span>
              <span className="font-semibold text-amber-300">{DEFAULT_DEVICE.latencyMs} MS</span>
            </div>
          </div>
        </div>

        {/* 2. EDGE CANDIDATE CARD (SELECTED ENVIRONMENT) */}
        <div
          ref={edgeCardRef}
          className="rounded border border-emerald-400/60 bg-[#041512]/90 p-3.5 backdrop-blur-md transition-all duration-300 relative overflow-hidden pointer-events-auto shadow-[0_0_24px_-4px_rgba(16,185,129,0.25)]"
        >
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-bold tracking-[0.18em] uppercase text-emerald-300">
                EDGE
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-emerald-300 px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 font-semibold">
                SELECTED
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.12em] text-emerald-400 uppercase">
                SCORE
              </span>
              <span className="font-mono text-xs font-bold text-emerald-200">
                {decisionResult.candidateScores.edge.score}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px] text-slate-200">
            <div className="flex justify-between border-b border-emerald-500/15 pb-1">
              <span className="text-emerald-400/80 uppercase text-[10px]">CPU LOAD</span>
              <span className="font-semibold">{DEFAULT_EDGE.cpuLoadPct}%</span>
            </div>
            <div className="flex justify-between border-b border-emerald-500/15 pb-1">
              <span className="text-emerald-400/80 uppercase text-[10px]">QUEUE</span>
              <span className="font-semibold">{DEFAULT_EDGE.queueLength} TASKS</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-emerald-400/80 uppercase text-[10px]">LATENCY</span>
              <span className="font-semibold text-emerald-300">{DEFAULT_EDGE.latencyMs} MS</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-emerald-400/80 uppercase text-[10px]">BANDWIDTH</span>
              <span className="font-semibold">{DEFAULT_EDGE.bandwidthGbps} GBPS</span>
            </div>
          </div>
        </div>

        {/* 3. CLOUD CANDIDATE CARD */}
        <div
          ref={cloudCardRef}
          className="rounded border border-white/[0.08] bg-[#070514]/85 p-3.5 backdrop-blur-md transition-all duration-300 pointer-events-auto"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="font-mono text-xs font-bold tracking-[0.18em] uppercase text-violet-300">
                CLOUD
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">
                SCORE
              </span>
              <span className="font-mono text-xs font-bold text-violet-200">
                {decisionResult.candidateScores.cloud.score}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px] text-slate-300">
            <div className="flex justify-between border-b border-white/[0.04] pb-1">
              <span className="text-slate-400 uppercase text-[10px]">CPU LOAD</span>
              <span className="font-semibold">{DEFAULT_CLOUD.cpuLoadPct}%</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-1">
              <span className="text-slate-400 uppercase text-[10px]">QUEUE</span>
              <span className="font-semibold">{DEFAULT_CLOUD.queueLength} TASKS</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-400 uppercase text-[10px]">LATENCY</span>
              <span className="font-semibold text-violet-300">{DEFAULT_CLOUD.latencyMs} MS</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-400 uppercase text-[10px]">BANDWIDTH</span>
              <span className="font-semibold">{DEFAULT_CLOUD.bandwidthGbps} GBPS</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 
        ==================================================
        LAYER 4: FULLSCREEN TRANSITION VEIL
        ==================================================
        Deep space dark void veil smoothly covers viewport during signal acceleration into /simulation
      */}
      <div
        ref={transitionVeilRef}
        style={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#02040A] pointer-events-none transition-opacity duration-300"
      />
    </>
  );
}
