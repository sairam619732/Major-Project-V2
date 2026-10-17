"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";

import { useState } from "react";

interface ReadOnlyTelemetryProps {
  label: string;
  value: number | string;
  unit: string;
  accentColor: string;
  pct?: number;
  statusBadge?: string;
  statusColor?: string;
}

function CircularMetric({ label, value, color, inverse = false }: { label: string; value: number; color: string; inverse?: boolean }) {
  const displayValue = inverse ? 100 - value : value; // For CPU Available -> CPU Usage
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
          {displayValue.toFixed(1)}%
        </div>
      </div>
      <span className="text-[11px] font-medium text-slate-400 mt-1">{label}</span>
    </div>
  );
}

export function SimulationTelemetryPanel() {
  const { state, realLocalTelemetry, telemetryLoading, fetchRealTelemetry } = useSimulationState();
  const [dqnExpanded, setDqnExpanded] = useState(false);
  
  const isLocalReal = realLocalTelemetry?.cpu_is_real && state.experimentConditions?.localWorkload === "LOW";

  // DQN 17 Features Array
  const dqnFeatures = [
    { name: "Task Data Size", value: `${state.task.taskSizeMb} MB`, key: 0, hl: true },
    { name: "Task CPU Demand", value: `${state.task.cpuDemandPct}%`, key: 1, hl: true },
    { name: "Task Memory Demand", value: `${state.task.memoryDemandPct}%`, key: 2, hl: true },
    { name: "Task Deadline", value: `${state.task.deadlineMs} ms`, key: 3, hl: true },
    { name: "Task Priority", value: `LVL ${state.task.priority}`, key: 4, hl: true },
    { name: "Local CPU Avail", value: `${state.device.cpuAvailablePct}%`, key: 5 },
    { name: "Local Memory Avail", value: `${state.device.memoryAvailablePct}%`, key: 6 },
    { name: "Local Battery", value: `${state.device.batteryPct}%`, key: 7 },
    { name: "Local Base Latency", value: `${state.device.latencyMs} ms`, key: 8 },
    { name: "Edge CPU Load", value: `${state.edge.cpuLoadPct}%`, key: 9 },
    { name: "Edge Task Queue", value: `${state.edge.queueLength}`, key: 10 },
    { name: "Edge Network Lat", value: `${state.edge.latencyMs} ms`, key: 11 },
    { name: "Edge Bandwidth", value: `${state.edge.bandwidthGbps} Gbps`, key: 12 },
    { name: "Cloud CPU Load", value: `${state.cloud.cpuLoadPct}%`, key: 13 },
    { name: "Cloud Task Queue", value: `${state.cloud.queueLength}`, key: 14 },
    { name: "Cloud Network Lat", value: `${state.cloud.latencyMs} ms`, key: 15 },
    { name: "Cloud Bandwidth", value: `${state.cloud.bandwidthGbps} Gbps`, key: 16 },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* REAL-TIME METRICS (LOCAL) */}
      <div className="flex flex-col p-5 rounded-xl holo-panel border">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.05]">
          <span className="font-sans text-[15px] text-slate-200 font-bold">
            Real-time Metrics
          </span>
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
           <CircularMetric label="CPU Usage" value={state.device.cpuAvailablePct} color="#ef4444" inverse />
           <CircularMetric label="Memory" value={state.device.memoryAvailablePct} color="#f59e0b" inverse />
           <CircularMetric label="Battery" value={state.device.batteryPct} color="#38bdf8" />
        </div>

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
               <span className="w-24 text-slate-400">EDG → CLD</span>
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
                <span className="text-amber-400 font-bold text-[13px]">{f.value}</span>
             </div>
          ))}
          
          {dqnExpanded && dqnFeatures.slice(5).map((f) => (
             <div key={f.key} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-400">{(f.key + 1).toString().padStart(2, '0')}. {f.name}</span>
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
