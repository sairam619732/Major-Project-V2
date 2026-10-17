"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSimulationState } from "@/lib/simulation/simulationState";
import { useEffect, useState } from "react";

export default function DevicesPage() {
  const { state, realLocalTelemetry, fetchRealTelemetry } = useSimulationState();
  const [lastPing, setLastPing] = useState<number | null>(null);

  useEffect(() => {
    // Record the ping when each request settles (also keeps Date out of the SSR render).
    const ping = () => fetchRealTelemetry().finally(() => setLastPing(Date.now()));
    ping();
    const interval = setInterval(ping, 5000);
    return () => clearInterval(interval);
  }, [fetchRealTelemetry]);

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold font-sans tracking-tight holo-title">Devices</h1>
          <p className="text-[14px] text-slate-400">Topology and Connection Status of all execution endpoints</p>
       </div>
       
       <div className="flex flex-col gap-6">
         {/* Local Host Node */}
         <div className="p-6 holo-panel border rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3">
               <h2 className="text-xl font-bold text-slate-200">Local Host Device</h2>
               <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">ONLINE</span>
             </div>
             <p className="text-[12px] font-mono text-slate-400 mt-1">Platform: {realLocalTelemetry?.platform || "Unknown"}</p>
             <p className="text-[12px] font-mono text-slate-400">Endpoint: Internal Process (NPU/CPU)</p>
           </div>
           <div className="flex flex-col gap-2 items-start sm:items-end">
             <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Specs</span>
             <span className="text-[12px] font-mono text-slate-300">CPU Cores: {realLocalTelemetry?.cpu_count || 8}</span>
             <span className="text-[12px] font-mono text-slate-300">Memory: {realLocalTelemetry?.memory_total_gb || 16} GB</span>
             <span className="text-[10px] font-mono text-slate-500 mt-1">Last Ping: {lastPing ? new Date(lastPing).toLocaleTimeString() : "—"}</span>
           </div>
         </div>

         {/* Edge Server Node */}
         <div className="p-6 holo-panel border border-emerald-900/30 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3">
               <h2 className="text-xl font-bold text-emerald-400">Edge Server</h2>
               <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">SIMULATED</span>
             </div>
             <p className="text-[12px] font-mono text-slate-400 mt-1">State: Simulated load ({state.edge.cpuLoadPct}% CPU)</p>
             <p className="text-[12px] font-mono text-slate-400">Endpoint: Cost model (executes on local host)</p>
           </div>
           <div className="flex flex-col gap-2 items-start sm:items-end">
             <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider">Specs</span>
             <span className="text-[12px] font-mono text-slate-300">Bandwidth: {state.edge.bandwidthGbps} Gbps</span>
             <span className="text-[12px] font-mono text-slate-300">Base Latency: {state.edge.latencyMs} ms</span>
             <span className="text-[10px] font-mono text-slate-500 mt-1">Status: Modelled tier, no server required</span>
           </div>
         </div>

         {/* Cloud Cluster Node */}
         <div className="p-6 holo-panel border border-purple-900/30 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3">
               <h2 className="text-xl font-bold text-purple-400">Cloud Datacenter</h2>
               <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-400">SIMULATED</span>
             </div>
             <p className="text-[12px] font-mono text-slate-400 mt-1">State: Simulated load ({state.cloud.cpuLoadPct}% CPU)</p>
             <p className="text-[12px] font-mono text-slate-400">Endpoint: Cost model (executes on local host)</p>
           </div>
           <div className="flex flex-col gap-2 items-start sm:items-end">
             <span className="text-[10px] font-mono text-purple-600 uppercase tracking-wider">Specs</span>
             <span className="text-[12px] font-mono text-slate-300">Bandwidth: {state.cloud.bandwidthGbps} Gbps</span>
             <span className="text-[12px] font-mono text-slate-300">Base Latency: {state.cloud.latencyMs} ms</span>
             <span className="text-[10px] font-mono text-slate-500 mt-1">Status: Modelled tier, no server required</span>
           </div>
         </div>
       </div>
    </DashboardLayout>
  );
}
