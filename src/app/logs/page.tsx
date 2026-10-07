"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSimulationState } from "@/lib/simulation/simulationState";

export default function LogsPage() {
  const { sessionLogs } = useSimulationState();

  const getLogColor = (type: string) => {
    switch (type) {
      case "INFO": return "text-blue-400";
      case "WARNING": return "text-amber-400";
      case "ERROR": return "text-rose-400";
      case "EXECUTION": return "text-emerald-400";
      default: return "text-slate-400";
    }
  };

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold font-sans tracking-tight">System Logs</h1>
          <p className="text-[14px] text-slate-400">In-memory execution and system event trace</p>
       </div>
       
       <div className="p-6 bg-[#060b14] border border-white/[0.05] rounded-xl flex flex-col gap-4 shadow-xl">
         {sessionLogs.length === 0 ? (
           <div className="py-12 flex items-center justify-center border border-white/[0.05] bg-black/40 rounded border-dashed">
             <span className="text-slate-500 font-mono text-[12px]">No logs recorded in this session.</span>
           </div>
         ) : (
           <div className="w-full overflow-x-auto rounded border border-white/[0.05] bg-black/40 h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse relative">
                 <thead className="sticky top-0 bg-[#060b14] z-10">
                    <tr className="border-b border-white/[0.1]">
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 w-[180px]">Timestamp</th>
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 w-[100px]">Level</th>
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 w-[120px]">Source</th>
                       <th className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">Message</th>
                    </tr>
                 </thead>
                 <tbody>
                    {sessionLogs.map((log) => (
                      <tr key={log.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="p-3 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toISOString()}
                        </td>
                        <td className={`p-3 text-[11px] font-mono font-bold ${getLogColor(log.type)}`}>
                          [{log.type}]
                        </td>
                        <td className="p-3 text-[11px] font-mono text-slate-400">
                          {log.source}
                        </td>
                        <td className="p-3 text-[11px] font-mono text-slate-300">
                          {log.message}
                          {log.details && (
                            <details className="mt-1">
                              <summary className="text-[10px] text-slate-500 cursor-pointer">View Details</summary>
                              <pre className="mt-2 p-2 bg-black/60 rounded border border-white/[0.05] text-[10px] overflow-x-auto text-slate-400">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </td>
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
