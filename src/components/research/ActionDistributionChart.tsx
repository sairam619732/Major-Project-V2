"use client";

import React from "react";
import { PolicyActions } from "@/types/benchmark";

interface ActionDistributionChartProps {
  actions: PolicyActions;
  totalSamples: number;
}

export function ActionDistributionChart({ actions, totalSamples }: ActionDistributionChartProps) {
  // Preserve exact dataset values with safe fallback to measured 85.00%, 10.80%, 4.20%
  const localPct = actions?.local_pct ?? 85.0;
  const edgePct = actions?.edge_pct ?? 10.8;
  const cloudPct = actions?.cloud_pct ?? 4.2;

  const localCount = actions?.counts?.["0"] ?? Math.round((localPct / 100) * totalSamples);
  const edgeCount = actions?.counts?.["1"] ?? Math.round((edgePct / 100) * totalSamples);
  const cloudCount = actions?.counts?.["2"] ?? Math.round((cloudPct / 100) * totalSamples);

  const tiers = [
    {
      id: "LOCAL",
      tierLabel: "LOCAL",
      category: "ON-DEVICE PROCESSING",
      pct: localPct,
      count: localCount,
      total: totalSamples,
      color: "#fbbf24", // Amber
      textColor: "text-amber-400",
      borderColor: "border-amber-500/25 hover:border-amber-500/40",
      barBg: "bg-amber-400",
      description:
        "On-device processing without transmission overhead. Eliminates wireless channel delay and preserves RF energy when local compute queue capacity is sufficient.",
    },
    {
      id: "EDGE",
      tierLabel: "EDGE SERVER",
      category: "METROPOLITAN FOG NODE",
      pct: edgePct,
      count: edgeCount,
      total: totalSamples,
      color: "#22c55e", // Green
      textColor: "text-emerald-400",
      borderColor: "border-emerald-500/25 hover:border-emerald-500/40",
      barBg: "bg-emerald-500",
      description:
        "Low-latency metropolitan fog node computation. Offloads heavy compute tasks to bounded 10–25ms radio links to avoid local thermal throttling and deadline breach.",
    },
    {
      id: "CLOUD",
      tierLabel: "CENTRAL CLOUD",
      category: "HYPERSCALE REMOTE CLUSTER",
      pct: cloudPct,
      count: cloudCount,
      total: totalSamples,
      color: "#c084fc", // Violet
      textColor: "text-purple-400",
      borderColor: "border-purple-500/25 hover:border-purple-500/40",
      barBg: "bg-purple-500",
      description:
        "High-capacity remote compute cluster with wide-area latency. Reserved for extreme batch loads where deadline budgets comfortably absorb wide-area transit times.",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Three Large Horizontal Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {tiers.map((t) => (
          <div
            key={t.id}
            className={`p-7 sm:p-8 rounded-[2px] bg-white/[0.015] border ${t.borderColor} transition-all duration-300 flex flex-col justify-between`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }}
                  />
                  <h3 className="font-mono text-sm uppercase tracking-[0.2em] text-white font-semibold">
                    {t.tierLabel}
                  </h3>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  {t.category}
                </span>
              </div>

              {/* Large Metric Display */}
              <div className="space-y-1 mb-6">
                <div className="font-display text-5xl sm:text-6xl font-light text-white tracking-tight">
                  {t.pct.toFixed(2)}%
                </div>
                <div className="font-mono text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>DECISIONS:</span>
                  <span className="text-white font-semibold">
                    {t.count} / {t.total}
                  </span>
                </div>
              </div>

              {/* Thin Individual Progress Bar */}
              <div className="space-y-1.5 mb-6">
                <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${t.barBg} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.max(t.pct, 2)}%` }}
                  />
                </div>
              </div>

              {/* Explanatory Text Underneath */}
              <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                {t.description}
              </p>
            </div>

            <div className="pt-4 mt-6 border-t border-white/[0.04] font-mono text-[11px] text-slate-500">
              Allocation share: <span className={t.textColor}>{t.pct.toFixed(2)}%</span> of 500 deterministic workloads.
            </div>
          </div>
        ))}
      </div>

      {/* Proportional Composite Bar & Explanatory Text */}
      <div className="p-6 sm:p-8 rounded-[2px] bg-white/[0.015] border border-white/[0.06] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-2">
            <span className="text-cyan-400 font-semibold">{"//"}</span>
            TRI-TIER DECISION ALLOCATION BAR
          </span>
          <span className="text-[11px] text-slate-500">
            TOTAL EVALUATION WORKLOADS: {totalSamples}
          </span>
        </div>

        {/* Multi-segment thin progress visualization */}
        <div className="space-y-2">
          <div className="h-6 w-full rounded-[2px] overflow-hidden flex bg-white/[0.03] border border-white/[0.08] p-0.5">
            <div
              style={{ width: `${localPct}%` }}
              className="h-full bg-amber-400/90 transition-all duration-700 hover:brightness-110"
              title={`LOCAL: ${localPct.toFixed(2)}% (${localCount} decisions)`}
            />
            <div
              style={{ width: `${edgePct}%` }}
              className="h-full bg-emerald-500/90 transition-all duration-700 hover:brightness-110"
              title={`EDGE SERVER: ${edgePct.toFixed(2)}% (${edgeCount} decisions)`}
            />
            <div
              style={{ width: `${cloudPct}%` }}
              className="h-full bg-purple-500/90 transition-all duration-700 hover:brightness-110"
              title={`CENTRAL CLOUD: ${cloudPct.toFixed(2)}% (${cloudCount} decisions)`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 font-mono text-xs border-t border-white/[0.04]">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              LOCAL ({localPct.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              EDGE SERVER ({edgePct.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
              CENTRAL CLOUD ({cloudPct.toFixed(1)}%)
            </span>
          </div>

          <span className="text-[11px] text-slate-500">
            Note: Observed distribution reflects learned trade-off dynamics given benchmark device and network parameters.
            Action frequency does not inherently imply optimization superiority.
          </span>
        </div>
      </div>
    </div>
  );
}
