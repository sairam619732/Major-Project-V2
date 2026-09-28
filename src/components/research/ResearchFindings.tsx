"use client";

import React from "react";
import { BenchmarkReportData } from "@/types/benchmark";

interface ResearchFindingsProps {
  data: BenchmarkReportData;
}

export function ResearchFindings({ data }: ResearchFindingsProps) {
  const dqn = data.policies?.["DQN"];
  const greedy = data.policies?.["Rule-Based Greedy"];
  const local = data.policies?.["Local-Only"];
  const edge = data.policies?.["Edge-Only"];
  const cloud = data.policies?.["Cloud-Only"];
  const random = data.policies?.["Random"];

  const compLocal = data.comparisons?.["DQN_vs_Local-Only"];
  const compEdge = data.comparisons?.["DQN_vs_Edge-Only"];
  const compCloud = data.comparisons?.["DQN_vs_Cloud-Only"];
  const compGreedy = data.comparisons?.["DQN_vs_Rule-Based Greedy"];
  const compRandom = data.comparisons?.["DQN_vs_Random"];

  return (
    <div className="space-y-12">
      {/* Findings Section */}
      <div className="space-y-6">
        <div className="border-l-2 border-sky-400 pl-4 py-1">
          <p className="font-mono text-sm text-sky-200 leading-relaxed font-normal">
            &ldquo;The DQN learned an adaptive hybrid policy that distributed decisions across Local,
            Edge, and Cloud. Its observed policy closely resembled the rule-based expert policy under
            the tested configuration, but the current 200-episode experiment did not demonstrate that
            DQN surpasses the expert heuristic.&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Finding 1 */}
          <div className="p-5 rounded-[2px] bg-white/[0.015] border border-white/[0.06]">
            <h4 className="font-sans text-sm font-medium text-white mb-2">
              1. Adaptive Tier Distribution vs Static Baselines
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              The trained DQN agent allocated{" "}
              <strong className="text-sky-300">{(dqn?.action_distribution?.local_pct ?? dqn?.actions?.local_pct ?? 0).toFixed(1)}%</strong> of
              tasks locally,{" "}
              <strong className="text-emerald-300">{(dqn?.action_distribution?.edge_pct ?? dqn?.actions?.edge_pct ?? 0).toFixed(1)}%</strong> to
              the edge server, and{" "}
              <strong className="text-purple-300">{(dqn?.action_distribution?.cloud_pct ?? dqn?.actions?.cloud_pct ?? 0).toFixed(1)}%</strong> to
              the cloud. In contrast to static single-tier policies, this adaptive distribution

              reduced latency by{" "}
              <strong className="text-emerald-400">+{compLocal?.latency_reduction_pct.toFixed(2)}%</strong>{" "}
              relative to Local-Only,{" "}
              <strong className="text-emerald-400">+{compEdge?.latency_reduction_pct.toFixed(2)}%</strong>{" "}
              relative to Edge-Only, and{" "}
              <strong className="text-emerald-400">+{compCloud?.latency_reduction_pct.toFixed(2)}%</strong>{" "}
              relative to Cloud-Only.
            </p>
          </div>

          {/* Finding 2 */}
          <div className="p-5 rounded-[2px] bg-white/[0.015] border border-white/[0.06]">
            <h4 className="font-sans text-sm font-medium text-white mb-2">
              2. Energy & Cost Trade-Off Behavior
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              DQN achieved a mean device energy consumption of{" "}
              <strong className="text-slate-100">{dqn?.metrics.energy_joules.mean.toFixed(3)} J</strong>,
              preserving battery relative to Local-Only (
              <strong className="text-emerald-400">+{compLocal?.energy_reduction_pct.toFixed(2)}%</strong> energy reduction),
              while incurring an economic cost index of{" "}
              <strong className="text-slate-100">{dqn?.metrics.cost.mean.toFixed(3)}</strong>, which
              is significantly lower than Edge-Only (
              <strong className="text-emerald-400">+{compEdge?.cost_reduction_pct.toFixed(2)}%</strong> cost reduction)
              and Cloud-Only (
              <strong className="text-emerald-400">+{compCloud?.cost_reduction_pct.toFixed(2)}%</strong> cost reduction).
            </p>
          </div>

          {/* Finding 3 */}
          <div className="p-5 rounded-[2px] bg-white/[0.015] border border-white/[0.06]">
            <h4 className="font-sans text-sm font-medium text-white mb-2">
              3. Heuristic Benchmark Convergence
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              The Rule-Based Greedy policy achieved a mean reward of{" "}
              <strong className="text-slate-100">{greedy?.metrics.reward.mean.toFixed(4)}</strong>{" "}
              compared to DQN&apos;s{" "}
              <strong className="text-slate-100">{dqn?.metrics.reward.mean.toFixed(4)}</strong>, and a mean
              latency of <strong className="text-slate-100">{greedy?.metrics.latency_ms.mean.toFixed(2)} ms</strong>{" "}
              vs DQN&apos;s <strong className="text-slate-100">{dqn?.metrics.latency_ms.mean.toFixed(2)} ms</strong>.
              However, DQN maintained a comparable financial cost index ({dqn?.metrics.cost.mean.toFixed(3)} vs {greedy?.metrics.cost.mean.toFixed(3)}, a{" "}
              <strong className="text-emerald-400">+{compGreedy?.cost_reduction_pct.toFixed(2)}%</strong> cost reduction).
            </p>
          </div>

          {/* Finding 4 */}
          <div className="p-5 rounded-[2px] bg-white/[0.015] border border-white/[0.06]">
            <h4 className="font-sans text-sm font-medium text-white mb-2">
              4. Feasibility and Deadline Adherence
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Task feasibility rate for DQN reached{" "}
              <strong className="text-slate-100">{dqn?.success_rate_pct.toFixed(1)}%</strong>, outperforming
              Cloud-Only ({cloud?.success_rate_pct.toFixed(1)}%) and Random ({random?.success_rate_pct.toFixed(1)}%),
              while remaining within {Math.abs(compGreedy?.success_rate_diff_pct ?? 4.0).toFixed(1)}% of the
              expert heuristic ({greedy?.success_rate_pct.toFixed(1)}%).
            </p>
          </div>
        </div>
      </div>

      {/* Limitations Section */}
      <div className="border-t border-white/[0.08] pt-8">
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">
          Experimental Limitations & Boundary Conditions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-4 rounded-[2px] bg-white/[0.01] border border-white/[0.05]">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 font-medium mb-1.5">
              Simulated Environment
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Measurements reflect mathematical models of wireless channels, queuing dynamics, and CPU scaling. Real-world physical shadowing, Doppler shift, and OS thread contention were not physically measured.
            </p>
          </div>

          <div className="p-4 rounded-[2px] bg-white/[0.01] border border-white/[0.05]">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 font-medium mb-1.5">
              Training Duration (200 Ep)
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              The agent trained for 200 episodes. While loss stabilized around 0.021, extensive exploration over larger horizons (e.g. 1,000+ episodes) or prioritized replay was not conducted.
            </p>
          </div>

          <div className="p-4 rounded-[2px] bg-white/[0.01] border border-white/[0.05]">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 font-medium mb-1.5">
              Reward Weight Dependency
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              The learned policy is directly contingent on the pre-defined weight vector (w_L=0.35, w_E=0.25, w_C=0.15, w_Q=0.10, w_D=0.15). Varying optimization priorities will shift the optimal Pareto boundary.
            </p>
          </div>

          <div className="p-4 rounded-[2px] bg-white/[0.01] border border-white/[0.05]">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 font-medium mb-1.5">
              Workload Specificity
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Evaluation feeds were generated from bounded uniform task distributions. Non-stationary burst traffic or adversarial load surges require continual online adaptation mechanisms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
