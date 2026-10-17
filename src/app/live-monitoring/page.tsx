"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSimulationState } from "@/lib/simulation/simulationState";
import { useEffect } from "react";

export default function LiveMonitoringPage() {
  const { state, realLocalTelemetry, telemetryLoading, fetchRealTelemetry } = useSimulationState();

  // Poll real telemetry every 3 seconds while on this page
  useEffect(() => {
    fetchRealTelemetry();
    const interval = setInterval(() => {
      fetchRealTelemetry();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchRealTelemetry]);

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold font-sans tracking-tight holo-title">Live Monitoring</h1>
              <p className="text-[14px] text-slate-400">Real-time Node Telemetry & Environment State</p>
            </div>
            {telemetryLoading && (
              <span className="text-[10px] font-mono text-slate-500 animate-pulse uppercase">Refreshing...</span>
            )}
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* LOCAL NODE */}
         <div className="flex flex-col border holo-panel rounded-xl overflow-hidden">
           <div className="p-4 border-b border-white/[0.05] bg-black/40 flex justify-between items-center">
             <h2 className="font-mono text-[13px] uppercase text-slate-300 font-bold tracking-widest">Local Device</h2>
             <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
           </div>
           <div className="p-4 flex flex-col gap-4">
             <div>
               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">CPU Load</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-slate-200">
                   {realLocalTelemetry?.cpu_is_real ? realLocalTelemetry.cpu_load.toFixed(1) : (100 - state.device.cpuAvailablePct).toFixed(1)}%
                 </span>
                 <span className="text-[10px] font-mono text-slate-500 mb-1">{realLocalTelemetry?.cpu_is_real ? "(Empirical)" : "(Simulated)"}</span>
               </div>
               <div className="w-full h-1.5 bg-black/50 rounded mt-2 overflow-hidden">
                 <div className="h-full bg-slate-500" style={{ width: `${realLocalTelemetry?.cpu_is_real ? realLocalTelemetry.cpu_load : (100 - state.device.cpuAvailablePct)}%` }}></div>
               </div>
             </div>
             
             <div>
               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Memory Available</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-slate-200">
                   {realLocalTelemetry?.memory_is_real ? realLocalTelemetry.memory_available.toFixed(1) : state.device.memoryAvailablePct.toFixed(1)}%
                 </span>
                 <span className="text-[10px] font-mono text-slate-500 mb-1">{realLocalTelemetry?.memory_is_real ? `(${realLocalTelemetry.memory_total_gb}GB)` : "(Simulated)"}</span>
               </div>
               <div className="w-full h-1.5 bg-black/50 rounded mt-2 overflow-hidden">
                 <div className="h-full bg-blue-500" style={{ width: `${realLocalTelemetry?.memory_is_real ? realLocalTelemetry.memory_available : state.device.memoryAvailablePct}%` }}></div>
               </div>
             </div>

             <div>
               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Battery Level</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-slate-200">
                   {realLocalTelemetry?.battery_pct !== null && realLocalTelemetry?.battery_pct !== undefined ? `${realLocalTelemetry.battery_pct}%` : `${state.device.batteryPct}%`}
                 </span>
                 <span className="text-[10px] font-mono text-slate-500 mb-1">{realLocalTelemetry?.battery_status || "Simulated"}</span>
               </div>
               <div className="w-full h-1.5 bg-black/50 rounded mt-2 overflow-hidden">
                 <div className="h-full bg-emerald-500" style={{ width: `${realLocalTelemetry?.battery_pct ?? state.device.batteryPct}%` }}></div>
               </div>
             </div>
           </div>
         </div>

         {/* EDGE NODE */}
         <div className="flex flex-col border border-emerald-900/30 holo-panel rounded-xl overflow-hidden">
           <div className="p-4 border-b border-white/[0.05] bg-black/40 flex justify-between items-center">
             <h2 className="font-mono text-[13px] uppercase text-emerald-400 font-bold tracking-widest">Edge Server</h2>
             <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
           </div>
           <div className="p-4 flex flex-col gap-4">
             <div>
               <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider block mb-1">CPU Load</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-emerald-400">
                   {state.edge.cpuLoadPct.toFixed(1)}%
                 </span>
                 <span className="text-[10px] font-mono text-slate-500 mb-1">(State)</span>
               </div>
               <div className="w-full h-1.5 bg-black/50 rounded mt-2 overflow-hidden">
                 <div className="h-full bg-emerald-500" style={{ width: `${state.edge.cpuLoadPct}%` }}></div>
               </div>
             </div>
             
             <div>
               <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider block mb-1">Task Queue</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-emerald-400">
                   {state.edge.queueLength} tasks
                 </span>
               </div>
             </div>

             <div>
               <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider block mb-1">Network Base Latency</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-emerald-400">
                   {state.edge.latencyMs} ms
                 </span>
               </div>
             </div>
             
             <div>
               <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider block mb-1">Bandwidth Available</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-emerald-400">
                   {state.edge.bandwidthGbps} Gbps
                 </span>
               </div>
             </div>
           </div>
         </div>

         {/* CLOUD NODE */}
         <div className="flex flex-col border border-purple-900/30 holo-panel rounded-xl overflow-hidden">
           <div className="p-4 border-b border-white/[0.05] bg-black/40 flex justify-between items-center">
             <h2 className="font-mono text-[13px] uppercase text-purple-400 font-bold tracking-widest">Cloud Cluster</h2>
             <span className="text-[10px] uppercase font-bold text-purple-600">Off-Premise</span>
           </div>
           <div className="p-4 flex flex-col gap-4">
             <div>
               <span className="text-[10px] font-mono text-purple-600 uppercase tracking-wider block mb-1">CPU Load</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-purple-400">
                   {state.cloud.cpuLoadPct.toFixed(1)}%
                 </span>
               </div>
               <div className="w-full h-1.5 bg-black/50 rounded mt-2 overflow-hidden">
                 <div className="h-full bg-purple-500" style={{ width: `${state.cloud.cpuLoadPct}%` }}></div>
               </div>
             </div>
             
             <div>
               <span className="text-[10px] font-mono text-purple-600 uppercase tracking-wider block mb-1">Task Queue</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-purple-400">
                   {state.cloud.queueLength} tasks
                 </span>
               </div>
             </div>

             <div>
               <span className="text-[10px] font-mono text-purple-600 uppercase tracking-wider block mb-1">Network Base Latency</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-purple-400">
                   {state.cloud.latencyMs} ms
                 </span>
               </div>
             </div>
             
             <div>
               <span className="text-[10px] font-mono text-purple-600 uppercase tracking-wider block mb-1">Bandwidth Available</span>
               <div className="flex justify-between items-end">
                 <span className="font-mono text-2xl font-bold text-purple-400">
                   {state.cloud.bandwidthGbps} Gbps
                 </span>
               </div>
             </div>
           </div>
         </div>
       </div>
    </DashboardLayout>
  );
}
