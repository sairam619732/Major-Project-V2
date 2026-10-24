"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSimulationState } from "@/lib/simulation/simulationState";

export default function ResultsPage() {
  const { executionHistory } = useSimulationState();

  const total = executionHistory.length;
  const edgeCount = executionHistory.filter(e => e.decision === "EDGE").length;

  const avgLatency = total > 0 ? executionHistory.reduce((acc, curr) => acc + curr.latency_ms, 0) / total : 0;
  const avgReward = total > 0 ? executionHistory.reduce((acc, curr) => acc + curr.reward, 0) / total : 0;

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-3xl font-bold font-sans tracking-tight holo-title">Results & Charts</h1>
          <p className="text-[14px] text-slate-400">Execution history and empirical metrics from actual workloads</p>
       </div>
       
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 holo-panel border rounded-xl flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase text-slate-500">Total Executions</span>
            <span className="text-2xl font-bold text-slate-200">{total}</span>
          </div>
          <div className="p-4 holo-panel border border-emerald-900/30 rounded-xl flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase text-emerald-600">Edge Executions</span>
            <span className="text-2xl font-bold text-emerald-400">{edgeCount}</span>
          </div>
          <div className="p-4 holo-panel border border-amber-900/30 rounded-xl flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase text-amber-600">Avg Latency</span>
            <span className="text-2xl font-bold text-amber-400">{avgLatency.toFixed(1)} ms</span>
          </div>
          <div className="p-4 holo-panel border border-cyan-900/30 rounded-xl flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase text-cyan-600">Avg Reward</span>
            <span className="text-2xl font-bold text-cyan-400">{avgReward.toFixed(3)}</span>
          </div>
       </div>

       <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
         <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase">Execution Log</h2>
         {total === 0 ? (
           <div className="py-12 flex items-center justify-center border border-white/[0.05] bg-black/40 rounded border-dashed">
             <span className="text-slate-500 font-mono text-[12px]">No executions recorded.</span>
           </div>
         ) : (
           <div className="w-full overflow-x-auto rounded border border-white/[0.05]">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-black/40 border-b border-white/[0.05]">
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Task ID</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Decision</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Conf.</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Latency</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Process Time</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Cost</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Reward</th>
                       <th className="p-3 text-[10px] font-mono uppercase text-slate-500">Deadline Status</th>
                    </tr>
                 </thead>
                 <tbody>
                    {executionHistory.map((exec, idx) => {
                      const tierColor = exec.decision === "EDGE" ? "text-emerald-400" : exec.decision === "CLOUD" ? "text-purple-400" : "text-slate-300";
                      return (
                      <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="p-3 text-[11px] font-mono text-slate-300">{exec.task_id}</td>
                        <td className={"p-3 text-[11px] font-mono font-bold " + tierColor}>{exec.decision}</td>
                        <td className="p-3 text-[11px] font-mono text-slate-400">{(exec.confidence * 100).toFixed(1)}%</td>
                        <td className="p-3 text-[11px] font-mono text-amber-400">{exec.latency_ms.toFixed(1)} ms</td>
                        <td className="p-3 text-[11px] font-mono text-slate-400">{exec.execution_time_ms.toFixed(1)} ms</td>
                        <td className="p-3 text-[11px] font-mono text-slate-400">{exec.cost.toFixed(2)}</td>
                        <td className="p-3 text-[11px] font-mono text-cyan-400">{exec.reward.toFixed(3)}</td>
                        <td className="p-3 text-[11px] font-mono">
                          {exec.feasible ? (
                             <span className="text-emerald-400">MET</span>
                          ) : (
                             <span className="text-rose-400">MISSED</span>
                          )}
                        </td>
                      </tr>
                    )})}
                 </tbody>
              </table>
           </div>
         )}
       </div>
    </DashboardLayout>
  );
}
