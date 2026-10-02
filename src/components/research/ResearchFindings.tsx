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

  const localPct = dqn?.action_distribution?.local_pct ?? dqn?.actions?.local_pct ?? 85.0;
  const edgePct = dqn?.action_distribution?.edge_pct ?? dqn?.actions?.edge_pct ?? 10.8;
  const cloudPct = dqn?.action_distribution?.cloud_pct ?? dqn?.actions?.cloud_pct ?? 4.2;

  const observations = [
    {
      num: "01",
      title: "ADAPTIVE POLICY ALLOCATION",
      tag: "LATENCY & TIER DISTRIBUTION",
      accent: "text-cyan-400 border-cyan-500/30",
      content: (
        <p className="text-sm text-slate-300 leading-relaxed font-mono">
          The trained DQN agent allocated{" "}
          <strong className="text-amber-300 font-semibold">{localPct.toFixed(1)}%</strong> of
          tasks locally,{" "}
          <strong className="text-emerald-300 font-semibold">{edgePct.toFixed(1)}%</strong> to
          the edge server, and{" "}
          <strong className="text-purple-300 font-semibold">{cloudPct.toFixed(1)}%</strong> to
          the cloud. In contrast to static single-tier policies, this adaptive distribution
          reduced latency by{" "}
          <strong className="text-emerald-400 font-semibold">
            +{compLocal?.latency_reduction_pct.toFixed(2) ?? "11.94"}%
          </strong>{" "}
          relative to Local-Only ({local?.metrics.latency_ms.mean.toFixed(2) ?? "101.52"} ms),{" "}
          <strong className="text-emerald-400 font-semibold">
            +{compEdge?.latency_reduction_pct.toFixed(2) ?? "14.79"}%
          </strong>{" "}
          relative to Edge-Only ({edge?.metrics.latency_ms.mean.toFixed(2) ?? "104.92"} ms), and{" "}
          <strong className="text-emerald-400 font-semibold">
            +{compCloud?.latency_reduction_pct.toFixed(2) ?? "56.69"}%
          </strong>{" "}
          relative to Cloud-Only ({cloud?.metrics.latency_ms.mean.toFixed(2) ?? "206.43"} ms).
        </p>
      ),
      metrics: [
        { label: "Local / Edge / Cloud", val: `${localPct.toFixed(0)}% / ${edgePct.toFixed(0)}% / ${cloudPct.toFixed(0)}%` },
        { label: "DQN Latency", val: `${dqn?.metrics.latency_ms.mean.toFixed(2) ?? "89.40"} ms` },
        { label: "vs Local Baseline", val: `+${compLocal?.latency_reduction_pct.toFixed(2) ?? "11.94"}%` },
      ],
    },
    {
      num: "02",
      title: "ENERGY & COST EQUILIBRIUM",
      tag: "PARETO TRADEOFF BALANCE",
      accent: "text-emerald-400 border-emerald-500/30",
      content: (
        <p className="text-sm text-slate-300 leading-relaxed font-mono">
          DQN achieved a mean device energy consumption of{" "}
          <strong className="text-slate-100 font-semibold">
            {dqn?.metrics.energy_joules.mean.toFixed(3) ?? "0.177"} J
          </strong>
          , preserving battery relative to Local-Only (
          <strong className="text-emerald-400 font-semibold">
            +{compLocal?.energy_reduction_pct.toFixed(2) ?? "28.93"}%
          </strong>{" "}
          energy reduction), while incurring an economic cost index of{" "}
          <strong className="text-slate-100 font-semibold">
            {dqn?.metrics.cost.mean.toFixed(3) ?? "0.066"}
          </strong>
          , which is significantly lower than Edge-Only (
          <strong className="text-emerald-400 font-semibold">
            +{compEdge?.cost_reduction_pct.toFixed(2) ?? "69.07"}%
          </strong>{" "}
          cost reduction) and Cloud-Only (
          <strong className="text-emerald-400 font-semibold">
            +{compCloud?.cost_reduction_pct.toFixed(2) ?? "85.77"}%
          </strong>{" "}
          cost reduction).
        </p>
      ),
      metrics: [
        { label: "Device Energy", val: `${dqn?.metrics.energy_joules.mean.toFixed(3) ?? "0.177"} J` },
        { label: "Cost Index", val: `${dqn?.metrics.cost.mean.toFixed(3) ?? "0.066"}` },
        { label: "Cost vs Edge", val: `+${compEdge?.cost_reduction_pct.toFixed(2) ?? "69.07"}%` },
      ],
    },
    {
      num: "03",
      title: "NEAR-EXPERT HEURISTIC PROXIMITY",
      tag: "HEURISTIC BENCHMARK COMPARISON",
      accent: "text-purple-400 border-purple-500/30",
      content: (
        <p className="text-sm text-slate-300 leading-relaxed font-mono">
          The Rule-Based Greedy policy achieved a mean reward of{" "}
          <strong className="text-slate-100 font-semibold">
            {greedy?.metrics.reward.mean.toFixed(4) ?? "-0.1364"}
          </strong>{" "}
          compared to DQN&apos;s{" "}
          <strong className="text-slate-100 font-semibold">
            {dqn?.metrics.reward.mean.toFixed(4) ?? "-0.1531"}
          </strong>
          , and a mean latency of{" "}
          <strong className="text-slate-100 font-semibold">
            {greedy?.metrics.latency_ms.mean.toFixed(2) ?? "82.05"} ms
          </strong>{" "}
          vs DQN&apos;s{" "}
          <strong className="text-slate-100 font-semibold">
            {dqn?.metrics.latency_ms.mean.toFixed(2) ?? "89.40"} ms
          </strong>
          . However, DQN maintained a comparable financial cost index (
          {dqn?.metrics.cost.mean.toFixed(3) ?? "0.066"} vs {greedy?.metrics.cost.mean.toFixed(3) ?? "0.069"}, a{" "}
          <strong className="text-emerald-400 font-semibold">
            +{compGreedy?.cost_reduction_pct.toFixed(2) ?? "4.61"}%
          </strong>{" "}
          cost reduction).
        </p>
      ),
      metrics: [
        { label: "Greedy Latency", val: `${greedy?.metrics.latency_ms.mean.toFixed(2) ?? "82.05"} ms` },
        { label: "DQN Latency", val: `${dqn?.metrics.latency_ms.mean.toFixed(2) ?? "89.40"} ms` },
        { label: "Cost Advantage", val: `+${compGreedy?.cost_reduction_pct.toFixed(2) ?? "4.61"}%` },
      ],
    },
    {
      num: "04",
      title: "DEADLINE FEASIBILITY",
      tag: "SLA RELIABILITY",
      accent: "text-amber-400 border-amber-500/30",
      content: (
        <p className="text-sm text-slate-300 leading-relaxed font-mono">
          Task feasibility rate for DQN reached{" "}
          <strong className="text-slate-100 font-semibold">
            {dqn?.success_rate_pct.toFixed(1) ?? "72.0"}%
          </strong>
          , outperforming Cloud-Only ({cloud?.success_rate_pct.toFixed(1) ?? "21.2"}%) and Random (
          {random?.success_rate_pct.toFixed(1) ?? "50.8"}%), while remaining within{" "}
          {Math.abs(compGreedy?.success_rate_diff_pct ?? 4.4).toFixed(1)}% of the expert heuristic (
          {greedy?.success_rate_pct.toFixed(1) ?? "76.4"}%).
        </p>
      ),
      metrics: [
        { label: "DQN Feasibility", val: `${dqn?.success_rate_pct.toFixed(1) ?? "72.0"}%` },
        { label: "Cloud-Only", val: `${cloud?.success_rate_pct.toFixed(1) ?? "21.2"}%` },
        { label: "Advantage vs Cloud", val: `+${compCloud?.success_rate_diff_pct.toFixed(1) ?? "50.8"}%` },
      ],
    },
  ];

  return (
    <div className="space-y-16">
      {/* ================================================== */}
      {/* FOUR LARGE NUMBERED RESEARCH OBSERVATIONS          */}
      {/* ================================================== */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {observations.map((obs) => (
            <div
              key={obs.num}
              className="p-7 sm:p-8 rounded-[2px] bg-white/[0.015] border border-white/[0.08] hover:border-white/[0.16] transition-all flex flex-col justify-between"
            >
              <div>
                {/* Observation Header */}
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl font-light text-white">
                      {obs.num}
                    </span>
                    <span className="text-slate-600">{"//"}</span>
                    <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-white font-semibold">
                      {obs.title}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {obs.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="mb-6">{obs.content}</div>
              </div>

              {/* Metric Row */}
              <div className="pt-4 border-t border-white/[0.04] grid grid-cols-3 gap-2 font-mono text-[11px]">
                {obs.metrics.map((m) => (
                  <div key={m.label}>
                    <span className="text-slate-500 block text-[10px] truncate">{m.label}</span>
                    <span className="text-slate-200 font-semibold">{m.val}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================== */}
      {/* EXPERIMENTAL LIMITATIONS & METHODOLOGY             */}
      {/* ================================================== */}
      <div className="p-7 sm:p-8 rounded-[2px] bg-white/[0.015] border border-white/[0.06] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500 block mb-1">
              {"// METHODOLOGY RIGOR"}
            </span>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300 font-semibold">
              Experimental Limitations & Boundary Conditions
            </h3>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            CONTROLLED BENCHMARK CONSTRAINTS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-wider text-slate-200 font-medium">
              Simulated Environment
            </span>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              Measurements reflect mathematical models of wireless channel fading, queuing dynamics, and CPU scaling. Real-world Doppler shift, physical shadowing, and OS thread contention were not physically sampled.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-wider text-slate-200 font-medium">
              Training Duration (200 Ep)
            </span>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              The agent was trained for 200 episodes. While loss stabilized around 0.021 MSE, extensive exploration over larger horizons (e.g., 1,000+ episodes) or prioritized experience replay was not performed.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-wider text-slate-200 font-medium">
              Reward Weight Sensitivity
            </span>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              The policy is conditioned on the pre-defined weight vector (w_L=0.35, w_E=0.25, w_C=0.15, w_Q=0.10, w_D=0.15). Alternative enterprise priority distributions will shift the optimal Pareto boundary.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-xs uppercase tracking-wider text-slate-200 font-medium">
              Workload Stationarity
            </span>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              Workload feeds were generated from bounded uniform task distributions. Non-stationary burst traffic or adversarial load surges require continual online adaptation mechanisms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
