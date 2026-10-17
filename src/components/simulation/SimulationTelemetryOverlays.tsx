"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";

export function SimulationEdgeTelemetryOverlay() {
  const { state } = useSimulationState();
  
  return (
    <div className="absolute top-4 left-4 pointer-events-none z-10 hidden md:flex flex-col gap-2 p-3 rounded-lg bg-[#030712]/80 backdrop-blur border border-[#34d399]/40 shadow-[0_0_20px_rgba(52,211,153,0.1)] w-[160px]">
      <div className="flex items-center gap-2 mb-1 border-b border-[#34d399]/30 pb-2">
         <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
         <span className="font-mono text-[10px] uppercase text-[#34d399] font-bold tracking-widest">Edge Server</span>
      </div>
      
      <div className="flex flex-col gap-1.5 font-mono text-[9px] text-slate-300">
         <div className="flex justify-between items-center">
            <span>CPU</span>
            <span className="text-white font-bold">{state.edge.cpuLoadPct}%</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Queue</span>
            <span className="text-white font-bold">{state.edge.queueLength} tasks</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Latency</span>
            <span className="text-white font-bold">{state.edge.latencyMs}ms</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Bandwidth</span>
            <span className="text-white font-bold">{state.edge.bandwidthGbps} Gbps</span>
         </div>
      </div>
    </div>
  );
}

export function SimulationCloudTelemetryOverlay() {
  const { state } = useSimulationState();
  
  return (
    <div className="absolute top-4 right-4 pointer-events-none z-10 hidden md:flex flex-col gap-2 p-3 rounded-lg bg-[#030712]/80 backdrop-blur border border-[#a78bfa]/40 shadow-[0_0_20px_rgba(167,139,250,0.1)] w-[160px]">
      <div className="flex items-center gap-2 mb-1 border-b border-[#a78bfa]/30 pb-2">
         <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] shadow-[0_0_8px_#a78bfa]" />
         <span className="font-mono text-[10px] uppercase text-[#a78bfa] font-bold tracking-widest">Cloud DataCenter</span>
      </div>
      
      <div className="flex flex-col gap-1.5 font-mono text-[9px] text-slate-300">
         <div className="flex justify-between items-center">
            <span>CPU</span>
            <span className="text-white font-bold">{state.cloud.cpuLoadPct}%</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Queue</span>
            <span className="text-white font-bold">{state.cloud.queueLength} tasks</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Latency</span>
            <span className="text-white font-bold">{state.cloud.latencyMs}ms</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Bandwidth</span>
            <span className="text-white font-bold">{state.cloud.bandwidthGbps} Gbps</span>
         </div>
      </div>
    </div>
  );
}
