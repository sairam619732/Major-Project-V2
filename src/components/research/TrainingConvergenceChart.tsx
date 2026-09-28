"use client";

import React, { useState, useMemo } from "react";
import { TrainingEpisodeRecord } from "@/types/benchmark";

interface TrainingConvergenceChartProps {
  history: TrainingEpisodeRecord[];
}

type MetricKey = "average_reward" | "cumulative_reward" | "loss" | "epsilon";

export function TrainingConvergenceChart({ history }: TrainingConvergenceChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("average_reward");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const metricConfigs: Record<
    MetricKey,
    { label: string; unit: string; color: string; higherIsBetter: boolean }
  > = {
    average_reward: {
      label: "Average Step Reward",
      unit: "score",
      color: "#38bdf8",
      higherIsBetter: true,
    },
    cumulative_reward: {
      label: "Episode Cumulative Reward",
      unit: "score",
      color: "#22d3ee",
      higherIsBetter: true,
    },
    loss: {
      label: "Bellman Loss (MSE)",
      unit: "loss",
      color: "#f59e0b",
      higherIsBetter: false,
    },
    epsilon: {
      label: "Exploration Rate (ε)",
      unit: "prob",
      color: "#ec4899",
      higherIsBetter: false,
    },
  };

  const currentConfig = metricConfigs[activeMetric];

  // Calculate min, max, points
  const { points, minValue, maxValue, validData } = useMemo(() => {
    if (!history || history.length === 0) {
      return { points: "", minValue: 0, maxValue: 1, validData: [] };
    }

    const valid = history.filter((d) => d[activeMetric] !== null && !isNaN(Number(d[activeMetric])));
    if (valid.length === 0) {
      return { points: "", minValue: 0, maxValue: 1, validData: [] };
    }

    const values = valid.map((d) => Number(d[activeMetric]));
    let min = Math.min(...values);
    let max = Math.max(...values);

    // Padding for visual balance
    if (min === max) {
      min -= 1;
      max += 1;
    } else {
      const padding = (max - min) * 0.08;
      min -= padding;
      max += padding;
    }

    const width = 800;
    const height = 260;

    const coords = valid.map((d, i) => {
      const x = (i / (valid.length - 1)) * width;
      const y = height - ((Number(d[activeMetric]) - min) / (max - min)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      points: coords.join(" "),
      minValue: min,
      maxValue: max,
      validData: valid,
    };
  }, [history, activeMetric]);

  if (!history || history.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs border border-white/[0.05]">
        No training history trajectory available for this run.
      </div>
    );
  }

  const hoveredItem = hoveredIndex !== null && validData[hoveredIndex] ? validData[hoveredIndex] : null;

  return (
    <div className="space-y-5">
      {/* Metric Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(metricConfigs) as MetricKey[]).map((key) => {
            const cfg = metricConfigs[key];
            const isActive = activeMetric === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveMetric(key);
                  setHoveredIndex(null);
                }}
                className={`font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-[2px] transition-all ${
                  isActive
                    ? "bg-white/[0.08] text-white border border-white/[0.2] font-medium"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="font-mono text-[11px] text-slate-400">
          EPISODES: {history.length} · SEED: 42
        </div>
      </div>

      {/* SVG Canvas Chart */}
      <div className="relative bg-white/[0.015] border border-white/[0.06] rounded-[2px] p-4">
        {/* Metric Header Values */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              {currentConfig.label} Trajectory
            </span>
            {hoveredItem ? (
              <div className="font-mono text-sm text-white font-medium">
                Ep {hoveredItem.episode}: {Number(hoveredItem[activeMetric]).toFixed(4)}{" "}
                <span className="text-[11px] text-slate-500">
                  (ε: {hoveredItem.epsilon.toFixed(3)})
                </span>
              </div>
            ) : (
              <div className="font-mono text-sm text-slate-300">
                Final: {Number(history[history.length - 1][activeMetric]).toFixed(4)}
              </div>
            )}
          </div>

          <div className="text-right font-mono text-[11px] text-slate-500">
            <span>Range: [{minValue.toFixed(3)} → {maxValue.toFixed(3)}]</span>
          </div>
        </div>

        {/* Scalable Vector Graphics line curve */}
        <div className="relative w-full h-[260px] overflow-hidden">
          <svg
            viewBox="0 0 800 260"
            preserveAspectRatio="none"
            className="w-full h-full cursor-crosshair"
            onMouseLeave={() => setHoveredIndex(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
              const idx = Math.round((relX / rect.width) * (validData.length - 1));
              setHoveredIndex(idx);
            }}
          >
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1="0"
                y1={260 * pct}
                x2="800"
                y2={260 * pct}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="4 4"
              />
            ))}

            {/* Area fill */}
            {points && (
              <polygon
                points={`0,260 ${points} 800,260`}
                fill="url(#curveGradient)"
              />
            )}

            {/* Polyline curve */}
            {points && (
              <polyline
                fill="none"
                stroke={currentConfig.color}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            )}

            {/* Hover Vertical Marker */}
            {hoveredIndex !== null && validData[hoveredIndex] && (
              <g>
                <line
                  x1={(hoveredIndex / (validData.length - 1)) * 800}
                  y1="0"
                  x2={(hoveredIndex / (validData.length - 1)) * 800}
                  y2="260"
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={(hoveredIndex / (validData.length - 1)) * 800}
                  cy={
                    260 -
                    ((Number(validData[hoveredIndex][activeMetric]) - minValue) /
                      (maxValue - minValue)) *
                      260
                  }
                  r="4"
                  fill="#ffffff"
                  stroke={currentConfig.color}
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>
        </div>

        {/* X Axis Labels */}
        <div className="flex justify-between font-mono text-[10px] text-slate-500 pt-2 border-t border-white/[0.04]">
          <span>Episode 1</span>
          <span>Episode {Math.round(history.length / 2)}</span>
          <span>Episode {history.length}</span>
        </div>
      </div>

      <div className="text-[11px] font-mono text-slate-500">
        Note: Raw trajectory displayed without artificial post-hoc smoothing. Replay sampling started at episode 5 once buffer exceeded batch threshold.
      </div>
    </div>
  );
}
