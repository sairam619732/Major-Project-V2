"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { fetchBenchmarkReport } from "@/services/apiClient";
import { BenchmarkReportData } from "@/types/benchmark";

export default function ModelPerformancePage() {
  const [data, setData] = useState<BenchmarkReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBenchmarkReport()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-3xl font-bold font-sans tracking-tight holo-title">Model Performance</h1>
          <p className="text-[14px] text-slate-400">DQN Offloading Agent Benchmarks & Training State</p>
       </div>
       
       {loading ? (
         <div className="p-8 text-center text-slate-500 font-mono text-[12px]">Loading benchmark report...</div>
       ) : error ? (
         <div className="p-8 text-center text-rose-400 font-mono text-[12px]">Error loading model data: {error}</div>
       ) : data ? (
         <div className="flex flex-col gap-6">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="p-4 holo-panel border rounded-xl flex flex-col gap-1">
               <span className="text-[11px] font-mono uppercase text-slate-500">Model Source</span>
               <span className="text-xl font-bold text-slate-200">{data.dataSource === "live_api" ? "LIVE API" : "STATIC SNAPSHOT"}</span>
             </div>
             <div className="p-4 holo-panel border rounded-xl flex flex-col gap-1">
               <span className="text-[11px] font-mono uppercase text-slate-500">Avg Reward (DQN)</span>
               <span className="text-2xl font-bold text-cyan-400">{data.policies?.["dqn"]?.metrics?.reward?.mean?.toFixed(4) || "N/A"}</span>
             </div>
             <div className="p-4 holo-panel border rounded-xl flex flex-col gap-1">
               <span className="text-[11px] font-mono uppercase text-slate-500">Feasibility Rate</span>
               <span className="text-2xl font-bold text-blue-400">{data.policies?.["dqn"]?.success_rate_pct?.toFixed(1) || "0"}%</span>
             </div>
           </div>

           <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
             <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase">Action Distribution (DQN)</h2>
             <div className="grid grid-cols-1 gap-8">
               <div className="border border-white/[0.05] p-4 rounded bg-black/20">
                 <h3 className="text-[11px] font-mono text-slate-400 mb-4 uppercase">DQN Policy Selections</h3>
                 <div className="flex flex-col gap-2">
                   <div className="flex justify-between font-mono text-[12px]"><span className="text-slate-300">Local</span> <span className="text-slate-200">{data.policies?.["dqn"]?.action_distribution?.local_pct?.toFixed(1) || "0"}%</span></div>
                   <div className="flex justify-between font-mono text-[12px]"><span className="text-emerald-400">Edge</span> <span className="text-emerald-400">{data.policies?.["dqn"]?.action_distribution?.edge_pct?.toFixed(1) || "0"}%</span></div>
                   <div className="flex justify-between font-mono text-[12px]"><span className="text-purple-400">Cloud</span> <span className="text-purple-400">{data.policies?.["dqn"]?.action_distribution?.cloud_pct?.toFixed(1) || "0"}%</span></div>
                 </div>
               </div>
             </div>
           </div>
           
           <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
             <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase">Baseline Comparisons</h2>
             <table className="w-full text-left border-collapse border border-white/[0.05]">
                 <thead>
                    <tr className="bg-black/40 border-b border-white/[0.05]">
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Strategy</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Reward</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Latency</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Feasible</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr className="border-b border-white/[0.02]">
                       <td className="p-3 text-[11px] font-mono font-bold text-blue-400">DQN (Ours)</td>
                       <td className="p-3 text-[11px] font-mono text-cyan-400">{data.policies?.["dqn"]?.metrics?.reward?.mean?.toFixed(4) || "N/A"}</td>
                       <td className="p-3 text-[11px] font-mono text-amber-400">{data.policies?.["dqn"]?.metrics?.latency_ms?.mean?.toFixed(2) || "N/A"} ms</td>
                       <td className="p-3 text-[11px] font-mono text-emerald-400">{data.policies?.["dqn"]?.success_rate_pct?.toFixed(1) || "0"}%</td>
                    </tr>
                    <tr className="border-b border-white/[0.02]">
                       <td className="p-3 text-[11px] font-mono text-slate-400">Local Only</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["local_only"]?.metrics?.reward?.mean?.toFixed(4) || "N/A"}</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["local_only"]?.metrics?.latency_ms?.mean?.toFixed(2) || "N/A"} ms</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["local_only"]?.success_rate_pct?.toFixed(1) || "0"}%</td>
                    </tr>
                    <tr className="border-b border-white/[0.02]">
                       <td className="p-3 text-[11px] font-mono text-slate-400">Edge Only</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["edge_only"]?.metrics?.reward?.mean?.toFixed(4) || "N/A"}</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["edge_only"]?.metrics?.latency_ms?.mean?.toFixed(2) || "N/A"} ms</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["edge_only"]?.success_rate_pct?.toFixed(1) || "0"}%</td>
                    </tr>
                    <tr className="border-b border-white/[0.02]">
                       <td className="p-3 text-[11px] font-mono text-slate-400">Cloud Only</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["cloud_only"]?.metrics?.reward?.mean?.toFixed(4) || "N/A"}</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["cloud_only"]?.metrics?.latency_ms?.mean?.toFixed(2) || "N/A"} ms</td>
                       <td className="p-3 text-[11px] font-mono text-slate-500">{data.policies?.["cloud_only"]?.success_rate_pct?.toFixed(1) || "0"}%</td>
                    </tr>
                 </tbody>
              </table>
           </div>

         </div>
       ) : null}
    </DashboardLayout>
  );
}
