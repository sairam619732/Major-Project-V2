"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Navigation } from "@/components/ui/Navigation";
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
    <div className={styles.researchPage}>
      {/* 1. Atmospheric Ambient Background */}
      <div className={styles.ambientBackground} />
      <div className={styles.gridOverlay} />

      {/* 2. Global Top Navigation (Preserved exactly) */}
      <Navigation />

      {/* 3. Subtle Side Research Progress Indicator (Desktop only) */}
      <nav className={styles.sideRail} aria-label="Research sections navigation">
        <a href="#overview" className={styles.sideRailItem}>
          <span className={styles.sideRailDot} />
          <span>01 Overview</span>
        </a>
        <a href="#configuration" className={styles.sideRailItem}>
          <span className={styles.sideRailDot} />
          <span>02 Configuration</span>
        </a>
        <a href="#policy-behavior" className={styles.sideRailItem}>
          <span className={styles.sideRailDot} />
          <span>03 Policy</span>
        </a>
        <a href="#comparison" className={styles.sideRailItem}>
          <span className={styles.sideRailDot} />
          <span>04 Performance</span>
        </a>
        <a href="#convergence" className={styles.sideRailItem}>
          <span className={styles.sideRailDot} />
          <span>05 Training</span>
        </a>
        <a href="#summary" className={styles.sideRailItem}>
          <span className={styles.sideRailDot} />
          <span>06 Summary</span>
        </a>
      </nav>

      {/* 4. Main Long-Form Document Flow */}
      <main className={styles.mainContainer}>
        {/* PAGE HEADER & SECTION 01 — RESEARCH OVERVIEW */}
        <section className="relative">
          <ResearchHeader
            metadata={data?.metadata}
            dataSource={data?.dataSource}
            onRefresh={loadData}
            isLoading={loading}
          />
        </section>

        {/* Loading State */}
        {loading && !data && (
          <div className="py-32 text-center space-y-4 font-mono text-xs text-slate-500">
            <div className="inline-block w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="tracking-[0.25em] uppercase text-slate-400">
              RETRIEVING EMPIRICAL RESEARCH DATASET...
            </p>
          </div>
        )}

        {/* Error / Data Unavailable State */}
        {error && !data && (
          <div className="my-24 p-12 text-center border border-dashed border-red-500/25 rounded-[2px] bg-red-950/10 space-y-4">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-red-400 block font-semibold">
              // EXPERIMENTAL DATA UNAVAILABLE
            </span>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              The benchmark results could not be retrieved from the backend API or local dataset.
              Ensure the FastAPI server or Phase 15 benchmark outputs are accessible.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={loadData}
                className="font-mono text-xs uppercase tracking-wider px-5 py-2.5 border border-white/20 hover:border-white/50 text-white rounded-[2px] transition-colors"
              >
                Retry Fetch
              </button>
            </div>
          </div>
        )}

        {/* Real Data Loaded: Vertically Discovered Presentation Sections */}
        {data && (
          <div>
            {/* SECTION 02 — DQN CONFIGURATION */}
            <section id="configuration" className={`${styles.sectionWrapper} scroll-mt-28`}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderTop}>
                  <div className={styles.sectionIndex}>
                    <span>02 //</span>
                    <span>DQN CONFIGURATION</span>
                  </div>
                  <span className={styles.sectionCategory}>REPRODUCIBLE SETUP</span>
                </div>
                <h2 className={styles.sectionTitle}>DQN CONFIGURATION</h2>
                <p className={styles.sectionSubtitle}>
                  Reproducible setup detailing three-dimensional hyperparameter specifications,
                  evaluation protocol parameters, and multi-objective loss coefficients.
                </p>
              </div>

              <ExperimentConfigView
                metadata={data.metadata}
                config={data.training_config}
              />
            </section>

            {/* SECTION 03 — POLICY BEHAVIOR */}
            <section id="policy-behavior" className={`${styles.sectionWrapper} scroll-mt-28`}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderTop}>
                  <div className={styles.sectionIndex}>
                    <span>03 //</span>
                    <span>POLICY BEHAVIOR</span>
                  </div>
                  <span className={styles.sectionCategory}>DECISION ALLOCATION</span>
                </div>
                <h2 className={styles.sectionTitle}>POLICY BEHAVIOR</h2>
                <p className={styles.sectionSubtitle}>
                  Decision allocation across the evaluated workloads.
                </p>
              </div>

              <ActionDistributionChart
                actions={data.policies?.DQN?.action_distribution || data.policies?.DQN?.actions}
                totalSamples={data.metadata.total_evaluation_samples}
              />
            </section>

            {/* SECTION 04 — PERFORMANCE COMPARISON */}
            <section id="comparison" className={`${styles.sectionWrapper} scroll-mt-28`}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderTop}>
                  <div className={styles.sectionIndex}>
                    <span>04 //</span>
                    <span>PERFORMANCE COMPARISON</span>
                  </div>
                  <span className={styles.sectionCategory}>6-POLICY BENCHMARK</span>
                </div>
                <h2 className={styles.sectionTitle}>PERFORMANCE COMPARISON</h2>
                <p className={styles.sectionSubtitle}>
                  6-Policy benchmark measuring latency, energy, cost, and feasibility under
                  identical task arrival workloads.
                </p>
              </div>

              <PolicyComparisonTable
                policies={data.policies}
                comparisons={data.comparisons}
              />
            </section>

            {/* SECTION 05 — TRAINING CONVERGENCE */}
            <section id="convergence" className={`${styles.sectionWrapper} scroll-mt-28`}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderTop}>
                  <div className={styles.sectionIndex}>
                    <span>05 //</span>
                    <span>TRAINING CONVERGENCE</span>
                  </div>
                  <span className={styles.sectionCategory}>TRAJECTORY ANALYSIS</span>
                </div>
                <h2 className={styles.sectionTitle}>TRAINING CONVERGENCE</h2>
                <p className={styles.sectionSubtitle}>
                  Trajectory analysis showing average reward progression across training episodes.
                </p>
              </div>

              {data.training_history && data.training_history.length > 0 ? (
                <TrainingConvergenceChart history={data.training_history} />
              ) : (
                <div className="p-12 text-center font-mono text-xs text-slate-500 border border-white/[0.05]">
                  Training history trajectory unavailable.
                </div>
              )}
            </section>

            {/* SECTION 06 — EVALUATION SUMMARY */}
            <section id="summary" className={`${styles.sectionWrapper} scroll-mt-28`}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderTop}>
                  <div className={styles.sectionIndex}>
                    <span>06 //</span>
                    <span>EVALUATION SUMMARY</span>
                  </div>
                  <span className={styles.sectionCategory}>EMPIRICAL FINDINGS</span>
                </div>
                <h2 className={styles.sectionTitle}>EVALUATION SUMMARY</h2>
                <p className={styles.sectionSubtitle}>
                  Empirical findings and boundary conditions supported by the 500-workload evaluation dataset.
                </p>
              </div>

              <ResearchFindings data={data} />
            </section>
          </div>
        )}
      </main>

      {/* Editorial Scientific Presentation Footer */}
      <footer className={styles.editorialFooter}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-slate-300 font-semibold uppercase tracking-[0.2em]">
              AI-BASED DYNAMIC TASK OFFLOADING IN CLOUD-EDGE COMPUTING ENVIRONMENTS
            </p>
            <p className="text-slate-500 text-[11px] tracking-wider">
              PHASE 16 RESEARCH BENCHMARK VISUALIZATION · REPRODUCIBLE SCIENTIFIC RESULTS
            </p>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-slate-500 uppercase tracking-widest">
            <span>DETERMINISTIC EVALUATION</span>
            <span>·</span>
            <span>PYTORCH DQN</span>
            <span>·</span>
            <span className="text-cyan-400">PUBLISHED REPORT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
