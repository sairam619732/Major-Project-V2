"use client";

import { simulationStore, useSimulationState } from "@/lib/simulation/simulationState";

import { useEffect, useState } from "react";

interface ReadOnlyTelemetryProps {
  label: string;
  value: number | string;
  unit: string;
  accentColor: string;
  pct?: number;
  statusBadge?: string;
  statusColor?: string;
}

function CircularMetric({ label, value, color, inverse = false }: { label: string; value: number | null; color: string; inverse?: boolean }) {
  // null = no real reading yet: empty ring and a dash instead of a made-up number.
  const displayValue = value === null ? 0 : inverse ? 100 - value : value; // For CPU Available -> CPU Usage
  const circumference = 2 * Math.PI * 24;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[70px] h-[70px] flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/[0.05]" />
          <circle cx="30" cy="30" r="24" stroke={color} strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-bold text-[13px] text-slate-100 tabular-nums">
          {value === null ? "—" : `${displayValue.toFixed(1)}%`}
        </div>
      </div>
      <span className="text-[11px] font-medium text-slate-400 mt-1">{label}</span>
    </div>
  );
}

// Where a DQN input comes from, shown next to its value.
const SOURCE_STYLES = {
  file: "text-cyan-300 border-cyan-500/30",
  est: "text-slate-300 border-white/[0.12]",
  set: "text-slate-300 border-white/[0.12]",
  live: "text-emerald-300 border-emerald-500/30",
  sim: "text-violet-300 border-violet-500/30",
  assumed: "text-amber-300 border-amber-500/30",
  offline: "text-rose-300 border-rose-500/30",
} as const;
type FeatureSource = keyof typeof SOURCE_STYLES;

function SourceTag({ source }: { source: FeatureSource }) {
  return (
    <span className={`ml-auto mr-2 px-1.5 py-px rounded border text-[8.5px] uppercase tracking-wider ${SOURCE_STYLES[source]}`}>
      {source}
    </span>
  );
}

export function SimulationTelemetryPanel() {
  const { state, realLocalTelemetry, telemetryLoading, fetchRealTelemetry } = useSimulationState();
  const [dqnExpanded, setDqnExpanded] = useState(false);
  
  // Poll the backend's psutil telemetry while this panel is on screen (shared poller).
  useEffect(() => simulationStore.startTelemetryPolling(), []);

  // Local values are only ever real; until the backend answers they are shown as unavailable.
  const isLocalReal = Boolean(realLocalTelemetry?.cpu_is_real);
  const batteryReal = isLocalReal && Boolean(realLocalTelemetry?.battery_is_real);
  const localSource: FeatureSource = isLocalReal ? "live" : "offline";
  const localValue = (v: string) => (isLocalReal ? v : "—");

  const metricsBadge = isLocalReal
    ? { text: "LIVE · THIS DEVICE", cls: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" }
    : telemetryLoading
      ? { text: "CONNECTING…", cls: "text-slate-300 border-white/[0.12]" }
      : { text: "BACKEND OFFLINE", cls: "text-rose-300 border-rose-500/30 bg-rose-500/10" };

  // DQN 17 Features Array
  const dqnFeatures: { name: string; value: string; key: number; source: FeatureSource }[] = [
    { name: "Task Data Size", value: `${state.task.taskSizeMb} MB`, key: 0, source: "file" },
    { name: "Task CPU Demand", value: `${state.task.cpuDemandPct}%`, key: 1, source: "est" },
    { name: "Task Memory Demand", value: `${state.task.memoryDemandPct}%`, key: 2, source: "est" },
    { name: "Task Deadline", value: `${state.task.deadlineMs} ms`, key: 3, source: "set" },
    { name: "Task Priority", value: `LVL ${state.task.priority}`, key: 4, source: "set" },
    { name: "Local CPU Avail", value: localValue(`${state.device.cpuAvailablePct}%`), key: 5, source: localSource },
    { name: "Local Memory Avail", value: localValue(`${state.device.memoryAvailablePct}%`), key: 6, source: localSource },
    { name: "Local Battery", value: localValue(`${state.device.batteryPct}%`), key: 7, source: batteryReal ? "live" : isLocalReal ? "assumed" : "offline" },
    { name: "Local Base Latency", value: localValue(`${state.device.latencyMs} ms`), key: 8, source: isLocalReal ? "assumed" : "offline" },
    { name: "Edge CPU Load", value: `${state.edge.cpuLoadPct}%`, key: 9, source: "sim" },
    { name: "Edge Task Queue", value: `${state.edge.queueLength}`, key: 10, source: "sim" },
    { name: "Edge Network Lat", value: `${state.edge.latencyMs} ms`, key: 11, source: "sim" },
    { name: "Edge Bandwidth", value: `${state.edge.bandwidthGbps} Gbps`, key: 12, source: "sim" },
    { name: "Cloud CPU Load", value: `${state.cloud.cpuLoadPct}%`, key: 13, source: "sim" },
    { name: "Cloud Task Queue", value: `${state.cloud.queueLength}`, key: 14, source: "sim" },
    { name: "Cloud Network Lat", value: `${state.cloud.latencyMs} ms`, key: 15, source: "sim" },
    { name: "Cloud Bandwidth", value: `${state.cloud.bandwidthGbps} Gbps`, key: 16, source: "sim" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* REAL-TIME METRICS (LOCAL) */}
      <div className="flex flex-col p-5 rounded-xl holo-panel border">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.05]">
          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-[15px] text-slate-200 font-bold">
              Real-time Metrics
            </span>
            <span className={`self-start px-1.5 py-px rounded border font-mono text-[8.5px] tracking-wider ${metricsBadge.cls}`}>
              {metricsBadge.text}
            </span>
          </div>
          <button
            type="button"
            onClick={() => fetchRealTelemetry()}
            disabled={telemetryLoading}
            className="text-[10px] font-mono text-slate-400 hover:text-[#38bdf8] transition-colors"
          >
            {telemetryLoading ? "SYNCING..." : "SYNC"}
          </button>
        </div>
        
        <div className="flex items-center justify-between gap-2 px-2">
           <CircularMetric label="CPU Usage" value={isLocalReal ? state.device.cpuAvailablePct : null} color="#ef4444" inverse />
           <CircularMetric label="Memory" value={isLocalReal ? state.device.memoryAvailablePct : null} color="#f59e0b" inverse />
           <CircularMetric label={isLocalReal && !batteryReal ? "Battery (none)" : "Battery"} value={isLocalReal ? state.device.batteryPct : null} color="#38bdf8" />
        </div>

        {isLocalReal && (
          <p className="mt-4 text-[10px] leading-relaxed text-slate-500 font-mono text-center">
            {!batteryReal && "No battery detected: DQN assumes 100%. "}
            Base latency {state.device.latencyMs} ms is an assumed dispatch overhead.
          </p>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 text-[10px] text-slate-400 font-mono">
           <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> CPU</div>
           <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Memory</div>
           <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span> Battery</div>
        </div>
      </div>

      {/* NETWORK LATENCY CARD */}
      <div className="flex flex-col p-5 rounded-xl holo-panel border">
         <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3 mb-4">
            <span className="font-mono text-[13px] tracking-[0.15em] uppercase text-slate-300 font-bold">
              NETWORK LATENCY
            </span>
            <span className="ml-auto px-1.5 py-px rounded border font-mono text-[8.5px] tracking-wider text-violet-300 border-violet-500/30 bg-violet-500/10">
              SIMULATED
            </span>
         </div>
         <div className="flex flex-col gap-4 font-mono text-[12px]">
            <div className="flex items-center gap-4">
               <span className="w-24 text-slate-400">LOC → EDG</span>
               <div className="flex-1 h-3 bg-white/[0.05] rounded-full overflow-hidden border border-white/[0.02]">
                  <div className="h-full bg-emerald-400 shadow-[0_0_10px_#34d399]" style={{ width: `${Math.min(100, (state.edge.latencyMs / 100) * 100)}%` }} />
               </div>
               <span className="w-14 text-right text-emerald-300 font-bold text-[14px]">{state.edge.latencyMs}ms</span>
            </div>
            <div className="flex items-center gap-4">
               <span className="w-24 text-slate-400">LOC → CLD</span>
               <div className="flex-1 h-3 bg-white/[0.05] rounded-full overflow-hidden border border-white/[0.02]">
                  <div className="h-full bg-violet-400 shadow-[0_0_10px_#a78bfa]" style={{ width: `${Math.min(100, (state.cloud.latencyMs / 300) * 100)}%` }} />
               </div>
               <span className="w-14 text-right text-violet-300 font-bold text-[14px]">{state.cloud.latencyMs}ms</span>
            </div>
            <div className="flex items-center gap-4">
               <span className="w-24 text-slate-400">EDG → CLD <span className="text-slate-600">est.</span></span>
               <div className="flex-1 h-3 bg-white/[0.05] rounded-full overflow-hidden border border-white/[0.02]">
                  <div className="h-full bg-slate-500" style={{ width: `${Math.min(100, (Math.abs(state.cloud.latencyMs - state.edge.latencyMs) / 300) * 100)}%` }} />
               </div>
               <span className="w-14 text-right text-slate-300 font-bold text-[14px]">{Math.max(10, state.cloud.latencyMs - state.edge.latencyMs)}ms</span>
            </div>
         </div>
      </div>

      {/* DQN STATE FEATURES */}
      <div className="flex flex-col p-5 rounded-xl holo-panel border border-amber-500/30">
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]" />
            <span className="font-mono text-[13px] tracking-[0.15em] uppercase text-amber-400 font-bold">
              DQN STATE TENSOR
            </span>
          </div>
          <span className="text-[10px] text-amber-500 font-mono border border-amber-500/30 px-2 py-0.5 rounded-full">
            SHAPE: (17,)
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 font-mono text-[11px]">
          {dqnFeatures.slice(0, 5).map((f) => (
             <div key={f.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-950/40 border border-amber-500/30">
                <span className="text-amber-200">{(f.key + 1).toString().padStart(2, '0')}. {f.name}</span>
                <SourceTag source={f.source} />
                <span className="text-amber-400 font-bold text-[13px]">{f.value}</span>
             </div>
          ))}
          
          {dqnExpanded && dqnFeatures.slice(5).map((f) => (
             <div key={f.key} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-400">{(f.key + 1).toString().padStart(2, '0')}. {f.name}</span>
                <SourceTag source={f.source} />
                <span className="text-slate-200 font-bold">{f.value}</span>
             </div>
          ))}

          <button 
             type="button" 
             onClick={() => setDqnExpanded(!dqnExpanded)} 
             className="w-full mt-2 py-2 text-[10px] text-slate-400 hover:text-amber-300 font-mono uppercase tracking-widest border border-white/[0.05] hover:border-amber-500/40 rounded-lg transition-all"
          >
             {dqnExpanded ? "COLLAPSE" : "+ 12 MORE FEATURES"}
          </button>
        </div>
      </div>

    </div>
  );
}
