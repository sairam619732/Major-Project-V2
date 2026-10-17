// Phase 11.3: Dedicated Cinematic Signal Transition Overlay
// Physically carries the TASK_001 data signal across deep space into /simulation

"use client";

import { useEffect, useRef, useState } from "react";
import { transitionStore, TransitionMode } from "@/lib/transition/transitionStore";

interface Particle {
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export function SimulationTransition() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return transitionStore.subscribe((progress, isTrans, mode) => {
      setIsActive(isTrans);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      // Leaving from the Decision CTA, start on the TASK_001 core wherever the camera framing puts
      // it; nav-bar jumps (task possibly hidden or off screen) burst from the screen center.
      const origin = mode === "decision_exit" ? transitionStore.getOrigin() : { x: 0.5, y: 0.5 };
      const cx = w * origin.x;
      const cy = h * origin.y;

      // When starting a new transition, initialize particle field
      if (progress < 0.05 && particlesRef.current.length === 0) {
        const colors = ["#38bdf8", "#34d399", "#c084fc", "#ffffff", "#7dd3fc"];
        const count = mode === "direct_nav" ? 90 : 160;
        const newParticles: Particle[] = [];

        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (w * 0.0012) * (0.8 + Math.random() * 2.6);
          newParticles.push({
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1.5 + Math.random() * 3.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1.0,
            decay: 0.008 + Math.random() * 0.015,
          });
        }
        particlesRef.current = newParticles;
      }

      if (!isTrans) {
        particlesRef.current = [];
        ctx.clearRect(0, 0, w, h);
        return;
      }

      // Clear frame
      ctx.clearRect(0, 0, w, h);

      // 1. Fullscreen Dark Void Veil
      // Opacity ramps up as signal accelerates, peaks at 0.86 (handoff), then dissolves
      let veilOpacity = 0;
      if (progress <= 0.86) {
        veilOpacity = Math.max(0, Math.min(1, (progress - 0.45) / 0.41));
      } else {
        veilOpacity = Math.max(0, 1 - (progress - 0.86) / 0.14);
      }

      if (veilOpacity > 0.005) {
        ctx.fillStyle = `rgba(2, 4, 10, ${veilOpacity.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Data Core Visual Sequence
      if (mode === "decision_exit") {
        // STEP 2 & 3 (p: 0.15 -> 0.45): Signal contracts into bright concentrated core
        if (progress >= 0.15 && progress < 0.72) {
          const contractT = Math.min(1, (progress - 0.15) / 0.30);
          const coreRadius = (1 - contractT) * 36 + 14;
          const coreGlow = 1.0 + contractT * 2.5;

          // Pulsing outer atmospheric halo
          const haloGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreRadius * 4.5);
          haloGrad.addColorStop(0, "rgba(56, 189, 248, 0.8)");
          haloGrad.addColorStop(0.35, "rgba(52, 211, 153, 0.4)");
          haloGrad.addColorStop(1, "rgba(2, 4, 10, 0)");

          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, coreRadius * 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Intense core diamond/circle
          ctx.save();
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 18 * coreGlow;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(3, coreRadius * 0.45), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // STEP 4 & 5 (p: 0.50 -> 0.72): Core accelerates forward toward screen center/camera
          if (progress >= 0.50) {
            const accelT = (progress - 0.50) / 0.22;
            const streakCount = 12;
            ctx.strokeStyle = "rgba(125, 211, 252, 0.45)";
            ctx.lineWidth = 1.8;
            for (let s = 0; s < streakCount; s++) {
              const theta = (s / streakCount) * Math.PI * 2 + progress * 4;
              const innerR = coreRadius * 1.5;
              const outerR = innerR + accelT * (w * 0.18);
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(theta) * innerR, cy + Math.sin(theta) * innerR);
              ctx.lineTo(cx + Math.cos(theta) * outerR, cy + Math.sin(theta) * outerR);
              ctx.stroke();
            }
          }
        }

        // STEP 6 & 7 (p: 0.70 -> 0.95): Core breaks into small particles forming a luminous field
        if (progress >= 0.68) {
          const fragT = (progress - 0.68) / 0.27;
          const particles = particlesRef.current;

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dist = fragT * (w * 0.55);
            const px = cx + p.vx * dist * 0.7;
            const py = cy + p.vy * dist * 0.7;
            const particleAlpha = Math.max(0, (1 - fragT * 0.95));

            ctx.save();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = particleAlpha;
            ctx.beginPath();
            ctx.arc(px, py, p.size * (1 + fragT * 1.2), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      } else {
        // Direct Nav Mode: Sleek, rapid signal trace and particle dispersion (~900ms)
        if (progress < 0.60) {
          const tTrace = progress / 0.60;
          ctx.save();
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 24;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(cx, cy, (1 - tTrace) * 22 + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          const fragT = (progress - 0.60) / 0.40;
          const particles = particlesRef.current;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dist = fragT * (w * 0.45);
            const px = cx + p.vx * dist * 0.6;
            const py = cy + p.vy * dist * 0.6;
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, 1 - fragT);
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    });
  }, []);

  // Window resize handler for canvas backing store
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ${
        isActive ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    />
  );
}
