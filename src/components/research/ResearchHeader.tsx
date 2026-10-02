"use client";

import React from "react";
import { ExperimentMetadata } from "@/types/benchmark";

interface ResearchHeaderProps {
  metadata?: ExperimentMetadata;
  dataSource?: "live_api" | "static_snapshot";
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function ResearchHeader({
  metadata,
  dataSource = "static_snapshot",
  onRefresh,
  isLoading,
}: ResearchHeaderProps) {
  return (
    <div className="space-y-24">
      {/* ================================================== */}
      {/* PAGE HEADER: EDITORIAL TITLE & PROVENANCE METADATA  */}
      {/* ================================================== */}
      <header className="space-y-8 pb-16 border-b border-white/[0.08]">
        {/* Top Eyebrow & Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs uppercase tracking-[0.22em]">
          <div className="flex items-center gap-2.5 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="font-semibold">{"// EMPIRICAL RESEARCH EVALUATION"}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.08] text-[11px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dataSource === "live_api"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                }`}
              />
              <span className="text-slate-300 tracking-wider">
                {dataSource === "live_api" ? "LIVE BACKEND API" : "SAVED PHASE 15 SNAPSHOT"}
              </span>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="font-mono text-[11px] tracking-wider text-slate-400 hover:text-white px-2.5 py-1 border border-white/[0.08] hover:border-white/[0.2] rounded-[2px] transition-all disabled:opacity-50"
                title="Refresh experimental data from backend"
              >
                {isLoading ? "SYNCING..." : "RE-SYNC"}
              </button>
            )}
          </div>
        </div>

        {/* Editorial Title Block */}
        <div className="space-y-4 max-w-5xl">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
            RESEARCH
          </div>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white leading-[1.02]">
            RESEARCH RESULTS
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 font-light leading-relaxed max-w-4xl">
            The learned policy was evaluated against fixed local, edge, cloud, random, and
            rule-based strategies under the same simulated workload.
          </p>
        </div>

        {/* Small Horizontal Metadata Row */}
        {metadata && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-2 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
            <div>
              <span className="text-slate-500">SAMPLES:</span>{" "}
              <span className="text-slate-200">{metadata.total_evaluation_samples}</span>
            </div>
            <div>
              <span className="text-slate-500">POLICY RUNS:</span>{" "}
              <span className="text-slate-200">{metadata.total_eval_runs.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500">SEEDS:</span>{" "}
              <span className="text-slate-200">[{metadata.seeds.join(", ")}]</span>
            </div>
            <div>
              <span className="text-slate-500">DURATION:</span>{" "}
              <span className="text-slate-200">{metadata.elapsed_seconds.toFixed(2)}s</span>
            </div>
            <div className="truncate max-w-[280px]" title={metadata.model_path}>
              <span className="text-slate-500">CHECKPOINT:</span>{" "}
              <span className="text-cyan-300">{metadata.model_path.split("/").pop()}</span>
            </div>
          </div>
        )}
      </header>

      {/* ================================================== */}
      {/* SECTION 01: RESEARCH OVERVIEW                      */}
      {/* ================================================== */}
      <section id="overview" className="space-y-10 scroll-mt-28">
        <div className="space-y-3 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-cyan-400 font-semibold uppercase">
            <span>01 //</span>
            <span>RESEARCH OVERVIEW</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl text-white font-light tracking-tight">
            RESEARCH OVERVIEW
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-3xl">
            To evaluate autonomous task offloading performance under realistic heterogeneous conditions,
            a Deep Q-Network (DQN) policy was benchmarked against five foundational strategies across 500
            deterministic evaluation workloads. Below is the primary experimental execution profile.
          </p>
        </div>

        {/* 5 Clean Metric Blocks */}
        {metadata && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-6 rounded-[2px] bg-white/[0.015] border border-white/[0.07] hover:border-white/[0.15] transition-colors space-y-1">
              <div className="font-display text-3xl sm:text-4xl font-light text-white tracking-tight">
                {metadata.total_evaluation_samples.toLocaleString()}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                EVALUATION SAMPLES
              </div>
              <div className="font-mono text-[10px] text-slate-500 pt-1">
                100 ep × 5 seeds
              </div>
            </div>

            <div className="p-6 rounded-[2px] bg-white/[0.015] border border-white/[0.07] hover:border-white/[0.15] transition-colors space-y-1">
              <div className="font-display text-3xl sm:text-4xl font-light text-white tracking-tight">
                {metadata.total_eval_runs.toLocaleString()}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                TOTAL POLICY RUNS
              </div>
              <div className="font-mono text-[10px] text-slate-500 pt-1">
                6-policy benchmark
              </div>
            </div>

            <div className="p-6 rounded-[2px] bg-white/[0.015] border border-white/[0.07] hover:border-white/[0.15] transition-colors space-y-1">
              <div className="font-mono text-lg sm:text-xl font-light text-cyan-300 tracking-tight truncate pt-2" title={metadata.seeds.join(", ")}>
                [{metadata.seeds.join(", ")}]
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                EVALUATION SEEDS
              </div>
              <div className="font-mono text-[10px] text-slate-500 pt-1">
                Deterministic seeds
              </div>
            </div>

            <div className="p-6 rounded-[2px] bg-white/[0.015] border border-white/[0.07] hover:border-white/[0.15] transition-colors space-y-1">
              <div className="font-display text-3xl sm:text-4xl font-light text-white tracking-tight">
                {metadata.elapsed_seconds.toFixed(2)}s
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                DURATION
              </div>
              <div className="font-mono text-[10px] text-slate-500 pt-1">
                Wall-clock duration
              </div>
            </div>

            <div className="p-6 rounded-[2px] bg-white/[0.015] border border-white/[0.07] hover:border-white/[0.15] transition-colors space-y-1 col-span-2 sm:col-span-1">
              <div className="font-mono text-xs sm:text-sm font-medium text-slate-200 truncate pt-3" title={metadata.model_path}>
                {metadata.model_path.split("/").pop()}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                CHECKPOINT PATH
              </div>
              <div className="font-mono text-[10px] text-emerald-400 pt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active checkpoint
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
