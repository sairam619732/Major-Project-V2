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
      color: "#22d3ee", // Cyan
      higherIsBetter: true,
    },
    cumulative_reward: {
      label: "Episode Cumulative Reward",
      unit: "score",
      color: "#38bdf8",
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
      color: "#c084fc",
      higherIsBetter: false,
    },
  };

  const currentConfig = metricConfigs[activeMetric];

  // SVG coordinate dimensions
  const chartWidth = 1000;
  const chartHeight = 400;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 50;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const { points, areaPoints, minValue, maxValue, validData, yTicks } = useMemo(() => {
    if (!history || history.length === 0) {
      return {
        points: "",
        areaPoints: "",
        minValue: 0,
        maxValue: 1,
        validData: [],
        yTicks: [],
      };
    }

    const valid = history.filter((d) => d[activeMetric] !== null && !isNaN(Number(d[activeMetric])));
    if (valid.length === 0) {
      return {
        points: "",
        areaPoints: "",
        minValue: 0,
        maxValue: 1,
        validData: [],
        yTicks: [],
      };
    }

    const values = valid.map((d) => Number(d[activeMetric]));
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (min === max) {
      min -= 1;
      max += 1;
    } else {
      const padding = (max - min) * 0.1;
      min -= padding;
      max += padding;
    }

    const coords = valid.map((d, i) => {
      const x = paddingLeft + (i / (valid.length - 1)) * innerWidth;
      const y = paddingTop + innerHeight - ((Number(d[activeMetric]) - min) / (max - min)) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const baselineY = paddingTop + innerHeight;
    const firstX = paddingLeft;
    const lastX = paddingLeft + innerWidth;
    const area = `${firstX},${baselineY} ${coords.join(" ")} ${lastX},${baselineY}`;

    // 5 Y-ticks
    const ticks = [0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
      const val = min + frac * (max - min);
      const y = paddingTop + innerHeight - frac * innerHeight;
      return { val, y };
    });

    return {
      points: coords.join(" "),
      areaPoints: area,
      minValue: min,
      maxValue: max,
      validData: valid,
      yTicks: ticks,
    };
  }, [history, activeMetric, innerWidth, innerHeight]);

  if (!history || history.length === 0) {
    return (
      <div className="p-16 text-center text-slate-500 font-mono text-xs border border-white/[0.05]">
        No training history trajectory available for this run.
      </div>
    );
  }

  const finalRecord = history[history.length - 1];
  const hoveredItem = hoveredIndex !== null && validData[hoveredIndex] ? validData[hoveredIndex] : null;

  return (
    <div className="space-y-8">
      {/* ================================================== */}
      {/* SMALL METADATA ROW ABOVE CHART                     */}
      {/* ================================================== */}
      <div className="p-4 sm:p-5 rounded-[2px] bg-white/[0.015] border border-white/[0.08] flex flex-wrap items-center justify-between gap-6 font-mono text-xs uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">EPISODES:</span>
          <span className="text-white font-medium">{history.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">SEED:</span>
          <span className="text-cyan-300 font-medium">42</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">REWARD RANGE:</span>
          <span className="text-slate-200 font-medium">
            [{minValue.toFixed(3)} → {maxValue.toFixed(3)}]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">FINAL REWARD:</span>
          <span className="text-cyan-300 font-semibold">
            {Number(finalRecord.average_reward).toFixed(4)}
          </span>
        </div>
      </div>

      {/* Metric Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex flex-wrap gap-2.5">
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
                className={`font-mono text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-[2px] transition-all ${
                  isActive
                    ? "bg-white/[0.08] text-white border border-white/[0.2] font-semibold"
                    : "text-slate-400 hover:text-white border border-transparent"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="font-mono text-[11px] text-slate-400">
          HOVER CURVE TO INSPECT STEP DATA
        </div>
      </div>

      {/* Enlarged Technical Chart Canvas */}
      <div className="relative p-6 sm:p-8 rounded-[2px] bg-white/[0.015] border border-white/[0.08] space-y-4">
        {/* Dynamic Readout Header */}
        <div className="flex items-center justify-between font-mono text-xs border-b border-white/[0.04] pb-3">
          <div>
            <span className="text-slate-400 uppercase tracking-widest text-[11px]">
              {currentConfig.label} Trajectory
            </span>
            {hoveredItem ? (
              <div className="text-white text-base font-medium mt-0.5">
                Episode {hoveredItem.episode}:{" "}
                <span className="text-cyan-300 font-semibold">
                  {Number(hoveredItem[activeMetric]).toFixed(4)}
                </span>{" "}
                <span className="text-slate-500 text-xs ml-2">
                  (ε: {hoveredItem.epsilon.toFixed(3)} · Return: {hoveredItem.cumulative_reward.toFixed(2)})
                </span>
              </div>
            ) : (
              <div className="text-slate-200 text-sm mt-0.5">
                Episode 200 (Terminal):{" "}
                <span className="text-cyan-300 font-medium">
                  {Number(finalRecord[activeMetric]).toFixed(4)}
                </span>
              </div>
            )}
          </div>

          <div className="text-right text-[11px] text-slate-500 hidden sm:block">
            <span>UNSMOOTHED EMPIRICAL TRACE</span>
          </div>
        </div>

        {/* Scalable Vector Graphics Large Canvas */}
        <div className="relative w-full h-[380px] sm:h-[440px]">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full cursor-crosshair select-none"
            onMouseLeave={() => setHoveredIndex(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
              const svgX = (relX / rect.width) * chartWidth;
              const normalizedX = Math.max(0, Math.min(1, (svgX - paddingLeft) / innerWidth));
              const idx = Math.round(normalizedX * (validData.length - 1));
              setHoveredIndex(idx);
            }}
          >
            <defs>
              <linearGradient id="convergenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.25" />
                <stop offset="65%" stopColor={currentConfig.color} stopOpacity="0.06" />
                <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines and Y-axis labels */}
            {yTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={t.y}
                  x2={paddingLeft + innerWidth}
                  y2={t.y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 12}
                  y={t.y + 3.5}
                  textAnchor="end"
                  fill="rgba(148, 163, 184, 0.65)"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {t.val.toFixed(3)}
                </text>
              </g>
            ))}

            {/* Vertical Guide lines for major episode markers */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const epNum = Math.max(1, Math.round(frac * history.length));
              const x = paddingLeft + frac * innerWidth;
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + innerHeight}
                    stroke="rgba(255, 255, 255, 0.03)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={x}
                    y={paddingTop + innerHeight + 24}
                    textAnchor="middle"
                    fill="rgba(148, 163, 184, 0.6)"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    Ep {epNum}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {areaPoints && <polygon points={areaPoints} fill="url(#convergenceGradient)" />}

            {/* Polyline curve */}
            {points && (
              <polyline
                fill="none"
                stroke={currentConfig.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            )}

            {/* Hover Vertical Guide & Point Marker */}
            {hoveredIndex !== null && validData[hoveredIndex] && (
              <g>
                <line
                  x1={paddingLeft + (hoveredIndex / (validData.length - 1)) * innerWidth}
                  y1={paddingTop}
                  x2={paddingLeft + (hoveredIndex / (validData.length - 1)) * innerWidth}
                  y2={paddingTop + innerHeight}
                  stroke="rgba(255, 255, 255, 0.5)"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={paddingLeft + (hoveredIndex / (validData.length - 1)) * innerWidth}
                  cy={
                    paddingTop +
                    innerHeight -
                    ((Number(validData[hoveredIndex][activeMetric]) - minValue) /
                      (maxValue - minValue)) *
                      innerHeight
                  }
                  r="5"
                  fill="#ffffff"
                  stroke={currentConfig.color}
                  strokeWidth="2.5"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Existing Explanation Below the Chart */}
        <div className="pt-4 border-t border-white/[0.04] text-xs font-mono text-slate-400 space-y-1 leading-relaxed">
          <p>
            Note: Raw trajectory displayed without artificial post-hoc smoothing. Replay sampling started at episode 5 once buffer exceeded batch threshold.
          </p>
          <p className="text-slate-500 text-[11px]">
            Bellman loss stabilized around 0.021 MSE under Adam optimization (α = 0.0005) with target network synchronized every 20 steps.
          </p>
        </div>
      </div>
    </div>
  );
}
