"use client";

import React, { useState } from "react";
import { PolicySummary, ComparisonStats } from "@/types/benchmark";

interface PolicyComparisonTableProps {
  policies: Record<string, PolicySummary>;
  comparisons: Record<string, ComparisonStats>;
}

export function PolicyComparisonTable({ policies, comparisons }: PolicyComparisonTableProps) {
  const [activeTab, setActiveTab] = useState<"aggregate" | "relative">("aggregate");

  const policyOrder = [
    "DQN",
    "Rule-Based Greedy",
    "Local-Only",
    "Edge-Only",
    "Random",
    "Cloud-Only",
  ];

  const policyMeta: Record<
    string,
    { label: string; role: string; color: string; desc: string }
  > = {
    DQN: {
      label: "DQN",
      role: "LEARNED AGENT",
      color: "#38bdf8", // Cyan
      desc: "Deep Q-Network policy balancing latency, battery energy, and economic costs.",
    },
    "Rule-Based Greedy": {
      label: "Rule-Based Greedy",
      role: "EXPERT HEURISTIC",
      color: "#a3e635", // Lime
      desc: "Deterministic heuristic choosing minimal immediate latency subject to deadline bounds.",
    },
    "Local-Only": {
      label: "Local-Only",
      role: "STATIC ON-DEVICE",
      color: "#fbbf24", // Amber
      desc: "Executes 100% of tasks locally, zero transmission overhead but limited compute.",
    },
    "Edge-Only": {
      label: "Edge-Only",
      role: "STATIC FOG NODE",
      color: "#34d399", // Emerald
      desc: "Offloads 100% of tasks to metropolitan edge server with 10–25ms radio delay.",
    },
    Random: {
      label: "Random",
      role: "STOCHASTIC BASELINE",
      color: "#94a3b8", // Slate
      desc: "Uniformly chooses Local, Edge, or Cloud at random without state awareness.",
    },
    "Cloud-Only": {
      label: "Cloud-Only",
      role: "STATIC CLUSTER",
      color: "#c084fc", // Violet
      desc: "Offloads 100% of tasks to remote centralized cloud cluster across WAN link.",
    },
  };

  return (
    <div className="space-y-12">
      {/* ================================================== */}
      {/* 1. LARGE COMPARISON VISUALIZATION FIRST            */}
      {/* ================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300 font-semibold flex items-center gap-2">
            <span className="text-cyan-400">{"//"}</span>
            KEY BENCHMARK METRIC COMPARISON
          </span>
          <span className="font-mono text-[11px] text-slate-500 uppercase tracking-wider">
            6 POLICIES · 500 WORKLOADS EACH
          </span>
        </div>

        {/* Six Spacious Policy Comparison Cards/Rows */}
        <div className="space-y-3">
          {policyOrder.map((key) => {
            const pol = policies[key];
            if (!pol) return null;
            const meta = policyMeta[key] || {
              label: key,
              role: "BASELINE",
              color: "#94a3b8",
              desc: "",
            };
            const m = pol.metrics;
            const isDQN = key === "DQN";

            // Relative latency bar (against 220ms scale)
            const latPct = Math.min(100, Math.max(10, (m.latency_ms.mean / 220) * 100));

            return (
              <div
                key={key}
                className={`p-5 sm:p-6 rounded-[2px] border transition-all duration-200 ${
                  isDQN
                    ? "bg-cyan-500/[0.04] border-cyan-500/30 hover:border-cyan-500/50"
                    : "bg-white/[0.015] border-white/[0.07] hover:border-white/[0.14]"
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Policy Identifier */}
                  <div className="lg:col-span-4 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: meta.color,
                          boxShadow: isDQN ? "0 0 10px rgba(56, 189, 248, 0.8)" : "none",
                        }}
                      />
                      <span className={`text-base font-sans font-medium ${isDQN ? "text-cyan-300 font-semibold" : "text-white"}`}>
                        {meta.label}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded tracking-widest font-semibold ${
                          isDQN
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "bg-white/[0.05] text-slate-400 border border-white/[0.08]"
                        }`}
                      >
                        {meta.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-light line-clamp-1">
                      {meta.desc}
                    </p>
                  </div>

                  {/* Primary Metrics Grid */}
                  <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
                    {/* Latency */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Latency
                      </span>
                      <div className="text-sm font-semibold text-slate-100">
                        {m.latency_ms.mean.toFixed(2)}{" "}
                        <span className="text-[11px] text-slate-500 font-normal">ms</span>
                      </div>
                      <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400/80 rounded-full"
                          style={{ width: `${latPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Energy */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Device Energy
                      </span>
                      <div className="text-sm font-semibold text-slate-100">
                        {m.energy_joules.mean.toFixed(3)}{" "}
                        <span className="text-[11px] text-slate-500 font-normal">J</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        ± {(m.energy_joules.ci_95 ?? m.energy_joules.ci95 ?? 0).toFixed(3)}
                      </span>
                    </div>

                    {/* Cost Index */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Cost Index
                      </span>
                      <div className="text-sm font-semibold text-slate-100">
                        {m.cost.mean.toFixed(3)}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Norm. billing
                      </span>
                    </div>

                    {/* Feasibility & Placement */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Feasibility / Tier
                      </span>
                      <div className={`text-sm font-semibold ${pol.success_rate_pct >= 70 ? "text-emerald-400" : "text-slate-200"}`}>
                        {pol.success_rate_pct.toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {(pol.action_distribution?.local_pct ?? pol.actions?.local_pct ?? 0).toFixed(0)}L /{" "}
                        {(pol.action_distribution?.edge_pct ?? pol.actions?.edge_pct ?? 0).toFixed(0)}E /{" "}
                        {(pol.action_distribution?.cloud_pct ?? pol.actions?.cloud_pct ?? 0).toFixed(0)}C
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. COMPLETE BENCHMARK TABLE UNDERNEATH              */}
      {/* ================================================== */}
      <div className="space-y-6 pt-4 border-t border-white/[0.08]">
        {/* Table Header & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-semibold block mb-1">
              {"// COMPLETE EMPIRICAL BENCHMARK DATASET"}
            </span>
            <h3 className="font-mono text-sm uppercase tracking-[0.16em] text-white font-medium">
              Statistical Error Bounds & Relative Comparisons
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("aggregate")}
              className={`font-mono text-xs uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-[2px] transition-all ${
                activeTab === "aggregate"
                  ? "bg-white/[0.08] text-white border border-white/[0.2] font-semibold"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              Aggregates (± 95% CI)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("relative")}
              className={`font-mono text-xs uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-[2px] transition-all ${
                activeTab === "relative"
                  ? "bg-white/[0.08] text-white border border-white/[0.2] font-semibold"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              Relative vs DQN
            </button>
          </div>
        </div>

        {/* Scrollable Indicator */}
        <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
          <span>Horizontally scrollable table view (Desktop & Mobile)</span>
          <span>← SCROLL TABLE HORIZONTALLY →</span>
        </div>

        {/* Horizontally Scrollable Table Container */}
        {activeTab === "aggregate" ? (
          <div className="overflow-x-auto border border-white/[0.08] rounded-[2px] bg-white/[0.015]">
            <table className="w-full border-collapse text-left font-mono text-xs min-w-[780px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.025] text-slate-400">
                  <th className="py-4 px-5 uppercase tracking-wider font-medium whitespace-nowrap">
                    Policy Name
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Mean Reward (↑)
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Latency ms (↓)
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Energy J (↓)
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Cost Index (↓)
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Feasibility Rate (↑)
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-center whitespace-nowrap">
                    Placement (L / E / C)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {policyOrder.map((key) => {
                  const pol = policies[key];
                  if (!pol) return null;
                  const m = pol.metrics;
                  const isDQN = key === "DQN";

                  return (
                    <tr
                      key={key}
                      className={`transition-colors duration-150 ${
                        isDQN
                          ? "bg-cyan-500/[0.06] hover:bg-cyan-500/[0.09]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-4 px-5 font-sans font-medium text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: policyMeta[key]?.color ?? "#94a3b8" }}
                          />
                          <span className={isDQN ? "text-cyan-300 font-semibold" : "text-white"}>
                            {key}
                          </span>
                          {isDQN && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              AGENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right text-slate-200 whitespace-nowrap">
                        <span className="font-semibold">{m.reward.mean.toFixed(4)}</span>{" "}
                        <span className="text-slate-500 text-[10px]">
                          ± {(m.reward.ci_95 ?? m.reward.ci95 ?? 0).toFixed(4)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right text-slate-200 whitespace-nowrap">
                        <span className="font-semibold">{m.latency_ms.mean.toFixed(2)}</span>{" "}
                        <span className="text-slate-500 text-[10px]">
                          ± {(m.latency_ms.ci_95 ?? m.latency_ms.ci95 ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right text-slate-200 whitespace-nowrap">
                        <span className="font-semibold">{m.energy_joules.mean.toFixed(3)}</span>{" "}
                        <span className="text-slate-500 text-[10px]">
                          ± {(m.energy_joules.ci_95 ?? m.energy_joules.ci95 ?? 0).toFixed(3)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right text-slate-200 whitespace-nowrap">
                        <span className="font-semibold">{m.cost.mean.toFixed(3)}</span>{" "}
                        <span className="text-slate-500 text-[10px]">
                          ± {(m.cost.ci_95 ?? m.cost.ci95 ?? 0).toFixed(3)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right text-slate-200 whitespace-nowrap font-medium">
                        <span className={pol.success_rate_pct >= 70 ? "text-emerald-400" : ""}>
                          {pol.success_rate_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center text-slate-300 whitespace-nowrap text-[11px]">
                        <span className="text-amber-400 font-medium">
                          {(pol.action_distribution?.local_pct ?? pol.actions?.local_pct ?? 0).toFixed(0)}%
                        </span>
                        {" / "}
                        <span className="text-emerald-400 font-medium">
                          {(pol.action_distribution?.edge_pct ?? pol.actions?.edge_pct ?? 0).toFixed(0)}%
                        </span>
                        {" / "}
                        <span className="text-purple-400 font-medium">
                          {(pol.action_distribution?.cloud_pct ?? pol.actions?.cloud_pct ?? 0).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto border border-white/[0.08] rounded-[2px] bg-white/[0.015]">
            <table className="w-full border-collapse text-left font-mono text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.025] text-slate-400">
                  <th className="py-4 px-5 uppercase tracking-wider font-medium whitespace-nowrap">
                    Comparison Pair
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Latency Reduction %
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Energy Reduction %
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Cost Reduction %
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Reward Δ
                  </th>
                  <th className="py-4 px-5 uppercase tracking-wider font-medium text-right whitespace-nowrap">
                    Feasibility Δ %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {Object.entries(comparisons).map(([compKey, comp]) => {
                  const latPositive = comp.latency_reduction_pct >= 0;
                  const nrgPositive = comp.energy_reduction_pct >= 0;
                  const costPositive = comp.cost_reduction_pct >= 0;
                  const rewPositive = comp.reward_improvement >= 0;

                  return (
                    <tr key={compKey} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-5 font-sans font-medium text-white whitespace-nowrap">
                        DQN vs <span className="text-slate-300">{comp.baseline}</span>
                      </td>
                      <td
                        className={`py-4 px-5 text-right font-mono whitespace-nowrap ${
                          latPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {latPositive ? "+" : ""}
                        {comp.latency_reduction_pct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-4 px-5 text-right font-mono whitespace-nowrap ${
                          nrgPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {nrgPositive ? "+" : ""}
                        {comp.energy_reduction_pct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-4 px-5 text-right font-mono whitespace-nowrap ${
                          costPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {costPositive ? "+" : ""}
                        {comp.cost_reduction_pct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-4 px-5 text-right font-mono whitespace-nowrap ${
                          rewPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {rewPositive ? "+" : ""}
                        {comp.reward_improvement.toFixed(4)}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-slate-300 whitespace-nowrap">
                        {comp.success_rate_diff_pct >= 0 ? "+" : ""}
                        {comp.success_rate_diff_pct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-slate-500 pt-1 gap-2">
          <span>Formula: Relative Reduction = ((Baseline − DQN) / Baseline) × 100</span>
          <span>Optimization Directions: Latency (↓), Energy (↓), Cost (↓), Reward (↑), Feasibility (↑)</span>
        </div>
      </div>
    </div>
  );
}
