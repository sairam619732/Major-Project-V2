"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { fetchBenchmarkReport } from "@/services/apiClient";
import { BenchmarkReportData } from "@/types/benchmark";
import {
  ResearchHeader,
  ActionDistributionChart,
  PolicyComparisonTable,
  TrainingConvergenceChart,
  ExperimentConfigView,
  ResearchFindings,
} from "@/components/research";
import styles from "./research.module.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export default function ResearchPage() {
  const [data, setData] = useState<BenchmarkReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBenchmarkReport();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Experimental data unavailable.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div
      className={`${styles.researchPage} ${sans.variable} ${mono.variable} ${display.variable} selection:bg-sky-500/20 selection:text-sky-300`}
    >
      <main className={styles.mainContent}>
        {/* Header Block */}
        <ResearchHeader
          metadata={data?.metadata}
          dataSource={data?.dataSource}
          onRefresh={loadData}
          isLoading={loading}
        />

        {/* Loading State */}
        {loading && !data && (
          <div className="py-24 text-center space-y-3 font-mono text-xs text-slate-500">
            <div className="inline-block w-6 h-6 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin mb-2" />
            <p className="tracking-widest uppercase">LOADING EXPERIMENTAL DATA...</p>
          </div>
        )}

        {/* Error / Data Unavailable State */}
        {error && !data && (
          <div className="my-16 p-12 text-center border border-dashed border-red-500/20 rounded-[2px] bg-red-950/10 space-y-4">
            <span className="font-mono text-xs uppercase tracking-widest text-red-400 block">
              // EXPERIMENTAL DATA UNAVAILABLE
            </span>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              The benchmark results could not be retrieved from the backend API or local dataset.
              Ensure the FastAPI server or Phase 15 benchmark outputs are accessible.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={loadData}
                className="font-mono text-xs uppercase tracking-wider px-4 py-2 border border-white/20 hover:border-white/40 text-white rounded-[2px] transition-colors"
              >
                Retry Fetch
              </button>
            </div>
          </div>
        )}

        {/* Main Content Sections (Rendered only when real data is loaded) */}
        {data && (
          <div className="space-y-24 mt-16">
            {/* SECTION 1: EXPERIMENT */}
            <section id="experiment" className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-sky-400 font-semibold tracking-widest">
                    01 //
                  </span>
                  <h2 className="font-display text-2xl text-white font-normal tracking-tight">
                    EXPERIMENT CONFIGURATION
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-500 tracking-wider uppercase hidden sm:inline">
                  REPRODUCIBLE SETUP
                </span>
              </div>
              <ExperimentConfigView
                metadata={data.metadata}
                config={data.training_config}
              />
            </section>

            {/* SECTION 2: POLICY BEHAVIOR */}
            <section id="policy-behavior" className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-sky-400 font-semibold tracking-widest">
                    02 //
                  </span>
                  <h2 className="font-display text-2xl text-white font-normal tracking-tight">
                    POLICY BEHAVIOR
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-500 tracking-wider uppercase hidden sm:inline">
                  DECISION ALLOCATION
                </span>
              </div>
              <ActionDistributionChart
                actions={data.policies.DQN.action_distribution || data.policies.DQN.actions}
                totalSamples={data.metadata.total_evaluation_samples}
              />

            </section>

            {/* SECTION 3: PERFORMANCE COMPARISON */}
            <section id="comparison" className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-sky-400 font-semibold tracking-widest">
                    03 //
                  </span>
                  <h2 className="font-display text-2xl text-white font-normal tracking-tight">
                    PERFORMANCE COMPARISON
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-500 tracking-wider uppercase hidden sm:inline">
                  6-POLICY BENCHMARK
                </span>
              </div>
              <PolicyComparisonTable
                policies={data.policies}
                comparisons={data.comparisons}
              />
            </section>

            {/* SECTION 4: TRAINING CONVERGENCE */}
            <section id="convergence" className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-sky-400 font-semibold tracking-widest">
                    04 //
                  </span>
                  <h2 className="font-display text-2xl text-white font-normal tracking-tight">
                    TRAINING CONVERGENCE
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-500 tracking-wider uppercase hidden sm:inline">
                  200 EPISODES · TRAJECTORY
                </span>
              </div>
              {data.training_history && data.training_history.length > 0 ? (
                <TrainingConvergenceChart history={data.training_history} />
              ) : (
                <div className="p-8 text-center font-mono text-xs text-slate-500 border border-white/[0.05]">
                  Training history trajectory unavailable.
                </div>
              )}
            </section>

            {/* SECTION 5 & 6: FINDINGS & LIMITATIONS */}
            <section id="findings-limitations" className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-sky-400 font-semibold tracking-widest">
                    05 & 06 //
                  </span>
                  <h2 className="font-display text-2xl text-white font-normal tracking-tight">
                    EMPIRICAL FINDINGS & LIMITATIONS
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-500 tracking-wider uppercase hidden sm:inline">
                  ACADEMIC DISCUSSION
                </span>
              </div>
              <ResearchFindings data={data} />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12 px-[7vw] text-center font-mono text-xs text-slate-600">
        <p>AI-BASED DYNAMIC TASK OFFLOADING IN CLOUD-EDGE COMPUTING ENVIRONMENTS</p>
        <p className="mt-1 text-slate-700">PHASE 16 RESEARCH BENCHMARK VISUALIZATION · REPRODUCIBLE SCIENTIFIC RESULTS</p>
      </footer>
    </div>
  );
}
