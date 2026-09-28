"use client";

import React from "react";
import { PolicyActions } from "@/types/benchmark";

interface ActionDistributionChartProps {
  actions: PolicyActions;
  totalSamples: number;
}

export function ActionDistributionChart({ actions, totalSamples }: ActionDistributionChartProps) {
  const localPct = actions?.local_pct ?? 0;
  const edgePct = actions?.edge_pct ?? 0;
  const cloudPct = actions?.cloud_pct ?? 0;

  const localCount = actions?.counts?.["0"] ?? Math.round((localPct / 100) * totalSamples);
  const edgeCount = actions?.counts?.["1"] ?? Math.round((edgePct / 100) * totalSamples);
  const cloudCount = actions?.counts?.["2"] ?? Math.round((cloudPct / 100) * totalSamples);

  const targets = [
    {
      id: "LOCAL",
      label: "LOCAL TIER (0)",
      description: "On-device processing without transmission overhead",
      pct: localPct,
      count: localCount,
      color: "#38bdf8",
      bgBar: "bg-sky-400",
    },
    {
      id: "EDGE",
      label: "EDGE SERVER (1)",
      description: "Low-latency metropolitan fog node computation",
      pct: edgePct,
      count: edgeCount,
      color: "#22c55e",
      bgBar: "bg-emerald-500",
    },
    {
      id: "CLOUD",
      label: "CENTRAL CLOUD (2)",
      description: "High-capacity remote compute cluster with wide-area latency",
      pct: cloudPct,
      count: cloudCount,
      color: "#a855f7",
      bgBar: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-200">
            DQN action distribution
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Measured during empirical evaluation ({totalSamples} deterministic test workloads)
          </p>
        </div>
        <span className="font-mono text-[11px] text-slate-400 tracking-wider">
          TOTAL EVALUATIONS: {totalSamples}
        </span>
      </div>

      {/* Proportional Multi-Segment Bar */}
      <div className="space-y-2">
        <div className="h-6 w-full rounded-[2px] overflow-hidden flex bg-white/[0.03] border border-white/[0.08] p-0.5">
          <div
            style={{ width: `${Math.max(localPct, 1)}%` }}
            className="h-full bg-sky-400/90 transition-all duration-500"
            title={`LOCAL: ${localPct.toFixed(2)}% (${localCount} decisions)`}
          />
          <div
            style={{ width: `${Math.max(edgePct, 1)}%` }}
            className="h-full bg-emerald-500/90 transition-all duration-500"
            title={`EDGE: ${edgePct.toFixed(2)}% (${edgeCount} decisions)`}
          />
          <div
            style={{ width: `${Math.max(cloudPct, 1)}%` }}
            className="h-full bg-purple-500/90 transition-all duration-500"
            title={`CLOUD: ${cloudPct.toFixed(2)}% (${cloudCount} decisions)`}
          />
        </div>

        {/* Legend labels */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {targets.map((t) => (
          <div
            key={t.id}
            className="p-4 rounded-[2px] bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 font-mono text-xs text-slate-300 font-medium">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.label}
              </span>
              <span className="font-mono text-xs text-slate-400">
                {t.count} / {totalSamples}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-mono text-2xl font-light text-white tracking-tight">
                {t.pct.toFixed(2)}%
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {t.description}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.04] pt-3 text-[11px] text-slate-500 font-mono">
        Note: Observed distribution reflects learned trade-off dynamics given benchmark device and network parameters.
        Action frequency does not inherently imply optimization superiority.
      </div>
    </div>
  );
}
