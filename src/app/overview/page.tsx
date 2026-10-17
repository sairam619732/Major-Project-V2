"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSimulationState } from "@/lib/simulation/simulationState";

export default function OverviewPage() {
  const { state, decision, apiStatus, apiError, executionHistory } = useSimulationState();

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-3xl font-bold font-sans tracking-tight holo-title">Overview</h1>
          <p className="text-[14px] text-slate-400">High-level system status and recent activity</p>
       </div>
       
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="p-6 holo-panel border rounded-xl flex flex-col gap-2 relative overflow-hidden">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">System Status</span>
            {apiStatus === "error" ? (
              <span className="text-2xl font-bold text-rose-500">Error</span>
            ) : (
              <span className="text-2xl font-bold text-emerald-400">Healthy</span>
            )}
            <div className="absolute -bottom-2 -right-2 text-white/[0.02]">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
          </div>
          
          <div className="p-6 holo-panel border rounded-xl flex flex-col gap-2">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">DQN Agent</span>
            {apiStatus === "running" ? (
              <span className="text-2xl font-bold text-blue-400 animate-pulse">Evaluating...</span>
            ) : (
              <span className="text-2xl font-bold text-blue-400">Online & Active</span>
            )}
            <span className="text-[11px] text-slate-500 font-mono mt-1">Current Target: {decision?.selectedTarget.toUpperCase() || "N/A"}</span>
          </div>

          <div className="p-6 holo-panel border rounded-xl flex flex-col gap-2">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">Network Tier States</span>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex justify-between items-center text-[12px] font-mono">
                <span className="text-slate-300">Local (CPU Free):</span>
                <span className="text-slate-400">{state.device.cpuAvailablePct}%</span>
              </div>
              <div className="flex justify-between items-center text-[12px] font-mono">
                <span className="text-slate-300">Edge (Load):</span>
                <span className="text-emerald-400">{state.edge.cpuLoadPct}%</span>
              </div>
              <div className="flex justify-between items-center text-[12px] font-mono">
                <span className="text-slate-300">Cloud (Load):</span>
                <span className="text-purple-400">{state.cloud.cpuLoadPct}%</span>
              </div>
            </div>
          </div>
       </div>

       <div className="mt-4 p-6 holo-panel border rounded-xl flex flex-col gap-4">
         <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase">Recent Executions</h2>
         {executionHistory.length === 0 ? (
           <div className="min-h-[150px] flex items-center justify-center border border-white/[0.05] bg-black/40 rounded border-dashed">
             <span className="text-slate-500 font-mono text-[12px]">No executions yet in this session. Run a workload in Simulation to see history.</span>
           </div>
         ) : (
           <div className="w-full overflow-x-auto border border-white/[0.05] rounded">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-black/40 border-b border-white/[0.05]">
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">Task ID</th>
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">Workload</th>
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">Tier</th>
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">Latency</th>
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">Reward</th>
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">Status</th>
                    </tr>
                 </thead>
                 <tbody>
                    {executionHistory.slice(0, 5).map((exec, idx) => (
                      <tr key={idx} className="border-b border-white/[0.02]">
                        <td className="p-3 text-[11px] font-mono text-slate-300">{exec.task_id}</td>
                        <td className="p-3 text-[11px] font-mono text-slate-400">{exec.workload_type}</td>
                        <td className="p-3 text-[11px] font-mono font-bold">
                          <span className={exec.decision === "EDGE" ? "text-emerald-400" : exec.decision === "CLOUD" ? "text-purple-400" : "text-slate-300"}>
                            {exec.decision}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] font-mono text-amber-400">{exec.latency_ms.toFixed(1)} ms</td>
                        <td className="p-3 text-[11px] font-mono text-cyan-400">{exec.reward.toFixed(4)}</td>
                        <td className="p-3 text-[11px] font-mono text-emerald-400">{exec.status || "SUCCESS"}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
         )}
       </div>
    </DashboardLayout>
  );
}
