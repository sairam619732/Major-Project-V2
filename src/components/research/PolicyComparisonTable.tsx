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

  // Helper to safely get policy dot color
  const getPolicyColor = (name: string) => {
    switch (name) {
      case "DQN":
        return "#38bdf8"; // Cyan
      case "Rule-Based Greedy":
        return "#a3e635"; // Lime
      case "Local-Only":
        return "#60a5fa"; // Blue
      case "Edge-Only":
        return "#34d399"; // Emerald
      case "Cloud-Only":
        return "#c084fc"; // Purple
      case "Random":
        return "#fbbf24"; // Amber
      default:
        return "#94a3b8";
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("aggregate")}
            className={`font-mono text-xs uppercase tracking-[0.15em] pb-1 transition-colors ${
              activeTab === "aggregate"
                ? "text-white border-b-2 border-sky-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Statistical Aggregates (Mean ± 95% CI)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("relative")}
            className={`font-mono text-xs uppercase tracking-[0.15em] pb-1 transition-colors ${
              activeTab === "relative"
                ? "text-white border-b-2 border-sky-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Relative Differences vs DQN
          </button>
        </div>

        <span className="font-mono text-[11px] text-slate-500 uppercase tracking-wider hidden sm:inline">
          Evaluation Samples: {policies["DQN"]?.samples ?? 500} per policy
        </span>
      </div>

      {activeTab === "aggregate" ? (
        <div className="overflow-x-auto border border-white/[0.06] rounded-[2px] bg-white/[0.01]">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400">
                <th className="py-3 px-4 uppercase tracking-wider font-medium">Policy Name</th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Mean Reward (↑)
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Latency ms (↓)
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Energy J (↓)
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Cost Index (↓)
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Feasibility Rate (↑)
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-center">
                  Placement (L / E / C)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {policyOrder.map((key) => {
                const pol = policies[key];
                if (!pol) return null;
                const m = pol.metrics;
                const isDQN = key === "DQN";

                return (
                  <tr
                    key={key}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isDQN ? "bg-sky-500/[0.04]" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-200 flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getPolicyColor(key) }}
                      />
                      <span className={isDQN ? "text-sky-300 font-semibold" : "text-white"}>
                        {key}
                      </span>
                      {isDQN && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          AGENT
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-200">
                      {m.reward.mean.toFixed(4)} <span className="text-slate-500 text-[10px]">± {(m.reward.ci_95 ?? m.reward.ci95 ?? 0).toFixed(4)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-200">
                      {m.latency_ms.mean.toFixed(2)} <span className="text-slate-500 text-[10px]">± {(m.latency_ms.ci_95 ?? m.latency_ms.ci95 ?? 0).toFixed(2)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-200">
                      {m.energy_joules.mean.toFixed(3)} <span className="text-slate-500 text-[10px]">± {(m.energy_joules.ci_95 ?? m.energy_joules.ci95 ?? 0).toFixed(3)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-200">
                      {m.cost.mean.toFixed(3)} <span className="text-slate-500 text-[10px]">± {(m.cost.ci_95 ?? m.cost.ci95 ?? 0).toFixed(3)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-200 font-medium">
                      {pol.success_rate_pct.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 text-[11px]">
                      {(pol.action_distribution?.local_pct ?? pol.actions?.local_pct ?? 0).toFixed(0)}% /{" "}
                      {(pol.action_distribution?.edge_pct ?? pol.actions?.edge_pct ?? 0).toFixed(0)}% /{" "}
                      {(pol.action_distribution?.cloud_pct ?? pol.actions?.cloud_pct ?? 0).toFixed(0)}%
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/[0.06] rounded-[2px] bg-white/[0.01]">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400">
                <th className="py-3 px-4 uppercase tracking-wider font-medium">Comparison Pair</th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Latency Reduction %
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Energy Reduction %
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Cost Reduction %
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Reward $\Delta$
                </th>
                <th className="py-3 px-4 uppercase tracking-wider font-medium text-right">
                  Feasibility $\Delta$ %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {Object.entries(comparisons).map(([compKey, comp]) => {
                const latPositive = comp.latency_reduction_pct >= 0;
                const nrgPositive = comp.energy_reduction_pct >= 0;
                const costPositive = comp.cost_reduction_pct >= 0;
                const rewPositive = comp.reward_improvement >= 0;

                return (
                  <tr key={compKey} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-sans font-medium text-white">
                      DQN vs <span className="text-slate-300">{comp.baseline}</span>
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono ${latPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {latPositive ? "+" : ""}{comp.latency_reduction_pct.toFixed(2)}%
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono ${nrgPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {nrgPositive ? "+" : ""}{comp.energy_reduction_pct.toFixed(2)}%
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono ${costPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {costPositive ? "+" : ""}{comp.cost_reduction_pct.toFixed(2)}%
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono ${rewPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {rewPositive ? "+" : ""}{comp.reward_improvement.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {comp.success_rate_diff_pct >= 0 ? "+" : ""}{comp.success_rate_diff_pct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-slate-500 pt-1 gap-2">
        <span>Formula: Relative Reduction = ((Baseline - DQN) / Baseline) × 100</span>
        <span>Optimization Directions: Latency (↓), Energy (↓), Cost (↓), Reward (↑), Feasibility (↑)</span>
      </div>
    </div>
  );
}
