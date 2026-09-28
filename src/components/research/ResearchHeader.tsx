"use client";

import React from "react";
import Link from "next/link";
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
    <header className="space-y-10 border-b border-white/[0.08] pb-12">
      {/* Top utility row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs uppercase tracking-[0.18em]">
        <div className="flex items-center gap-6 text-slate-400">
          <Link
            href="/#decision"
            className="hover:text-white transition-colors flex items-center gap-2"
          >
            ← RETURN TO STORY
          </Link>
          <span className="text-slate-700">/</span>
          <Link href="/simulation" className="hover:text-white transition-colors">
            SIMULATION LAB
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.08] text-[11px]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dataSource === "live_api"
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : "bg-sky-400 shadow-[0_0_8px_#38bdf8]"
              }`}
            />
            <span className="text-slate-300">
              {dataSource === "live_api" ? "LIVE BACKEND API" : "SAVED PHASE 15 SNAPSHOT"}
            </span>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="text-slate-400 hover:text-white px-2 py-1 transition-colors text-[11px]"
              title="Refresh experimental data from backend"
            >
              {isLoading ? "SYNCING..." : "RE-SYNC"}
            </button>
          )}
        </div>
      </div>

      {/* Editorial Title Block */}
      <div className="space-y-4 max-w-4xl">
        <span className="font-mono text-xs tracking-[0.25em] text-sky-400 uppercase block font-semibold">
          // EMPIRICAL RESEARCH EVALUATION
        </span>
        <h1 className="font-display text-4xl sm:text-6xl font-light tracking-tight text-white leading-[1.05]">
          RESEARCH RESULTS
        </h1>
        <p className="text-base sm:text-lg text-slate-400 font-light leading-relaxed">
          The learned policy was evaluated against fixed local, edge, cloud, random, and rule-based
          strategies under the same simulated workload.
        </p>
      </div>

      {/* Metadata strip */}
      {metadata && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-2 font-mono text-[11px] text-slate-500 uppercase tracking-wider">
          <div>
            <span className="text-slate-400">EVAL SAMPLES:</span> {metadata.total_evaluation_samples}
          </div>
          <div>
            <span className="text-slate-400">TOTAL RUNS:</span> {metadata.total_eval_runs}
          </div>
          <div>
            <span className="text-slate-400">SEEDS:</span> [{metadata.seeds.join(", ")}]
          </div>
          <div>
            <span className="text-slate-400">DURATION:</span> {metadata.elapsed_seconds.toFixed(2)}s
          </div>
          <div>
            <span className="text-slate-400">MODEL:</span> {metadata.model_path}
          </div>
        </div>
      )}
    </header>
  );
}
