"use client";
import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DatasetPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Table state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const rowsPerPage = 10;

  useEffect(() => {
    fetch('/api/dataset')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load dataset", err);
        setLoading(false);
      });
  }, []);

  const filteredPreview = useMemo(() => {
    if (!data?.preview) return [];
    return data.preview.filter((row: any) => {
      const matchSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(search.toLowerCase())
      );
      const matchTask = taskFilter === "ALL" || row.task_type === taskFilter;
      const matchAction = actionFilter === "ALL" || row.optimal_action === actionFilter;
      return matchSearch && matchTask && matchAction;
    });
  }, [data, search, taskFilter, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPreview.length / rowsPerPage));
  const currentRows = filteredPreview.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const dqnFeatures = [
    "Task Data Size", "CPU Demand", "Memory Demand", "Deadline", "Priority",
    "Local CPU Availability", "Local Memory Availability", "Local Battery", "Local Base Latency",
    "Edge CPU Load", "Edge Task Queue", "Edge Network Latency", "Edge Bandwidth",
    "Cloud CPU Load", "Cloud Task Queue", "Cloud Network Latency", "Cloud Bandwidth"
  ];

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-3 mb-2">
          <h1 className="text-3xl font-bold font-sans tracking-tight holo-title">DATASET</h1>
          <p className="text-[14px] text-slate-400">
            Synthetic training and evaluation data for DQN-based cloud-edge task offloading.
          </p>
          <div className="flex items-center gap-2 mt-1">
             <span className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 font-mono text-[11px] font-bold uppercase border border-blue-400/30">
               SYNTHETIC DATASET
             </span>
             <span className="text-[12px] text-slate-500 max-w-2xl">
               This synthetic dataset is designed for experimentation and evaluation of dynamic task offloading across Local, Edge, and Cloud environments.
             </span>
          </div>
       </div>

       {loading ? (
         <div className="flex items-center justify-center h-64 text-slate-400 font-mono">Loading dataset...</div>
       ) : !data || data.error ? (
         <div className="flex items-center justify-center h-64 text-rose-400 font-mono">Error loading dataset</div>
       ) : (
         <div className="flex flex-col gap-8">
           {/* Row 1: Overview Cards */}
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 holo-panel border rounded-xl flex flex-col gap-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Total Samples</span>
                <span className="text-2xl font-bold text-slate-200">{data.meta.totalSamples.toLocaleString()}</span>
              </div>
              <div className="p-5 holo-panel border rounded-xl flex flex-col gap-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Features</span>
                <span className="text-2xl font-bold text-blue-400">{data.meta.numFeatures} Columns</span>
              </div>
              <div className="p-5 holo-panel border rounded-xl flex flex-col gap-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Dataset Type</span>
                <span className="text-2xl font-bold text-emerald-400">Synthetic</span>
              </div>
              <div className="p-5 holo-panel border rounded-xl flex flex-col gap-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Domain</span>
                <span className="text-[15px] font-bold text-slate-200 mt-1">Cloud-Edge Offloading</span>
              </div>
           </div>

           {/* Row 2: Distributions and Rewards */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Task Types */}
              <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
                 <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase">Task Type Distribution</h2>
                 <div className="flex flex-col gap-3 mt-2">
                   {Object.entries(data.distribution.taskType).map(([type, count]: [string, any]) => {
                     const pct = Math.round((count / data.meta.totalSamples) * 100);
                     return (
                       <div key={type} className="flex flex-col gap-1">
                         <div className="flex justify-between text-[11px] font-mono">
                           <span className="text-slate-300">{type}</span>
                           <span className="text-slate-500">{count.toLocaleString()} ({pct}%)</span>
                         </div>
                         <div className="w-full bg-white/[0.05] rounded-full h-1.5">
                           <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                         </div>
                       </div>
                     )
                   })}
                 </div>
              </div>

              {/* Optimal Action */}
              <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
                 <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase">Optimal Offloading Distribution</h2>
                 <div className="flex flex-col gap-3 mt-2">
                   {[
                     { label: 'LOCAL', val: data.distribution.optimalAction.LOCAL, idx: 0, color: 'bg-slate-400' },
                     { label: 'EDGE', val: data.distribution.optimalAction.EDGE, idx: 1, color: 'bg-emerald-400' },
                     { label: 'CLOUD', val: data.distribution.optimalAction.CLOUD, idx: 2, color: 'bg-purple-400' }
                   ].map(item => {
                     const pct = Math.round((item.val / data.meta.totalSamples) * 100);
                     return (
                       <div key={item.label} className="flex flex-col gap-1">
                         <div className="flex justify-between text-[11px] font-mono">
                           <div className="flex items-center gap-2">
                              <span className="text-slate-300">{item.label}</span>
                              <span className="text-[9px] text-slate-500 px-1.5 rounded border border-white/[0.1]">idx: {item.idx}</span>
                           </div>
                           <span className="text-slate-500">{item.val.toLocaleString()} ({pct}%)</span>
                         </div>
                         <div className="w-full bg-white/[0.05] rounded-full h-1.5">
                           <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${pct}%` }}></div>
                         </div>
                       </div>
                     )
                   })}
                 </div>
              </div>

              {/* Reward Analysis */}
              <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
                 <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase">Reward Analysis</h2>
                 <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1 bg-black/40 p-3 rounded border border-white/[0.05]">
                       <span className="text-[10px] text-slate-500 font-mono uppercase">Average Reward</span>
                       <span className="text-[16px] font-bold text-amber-400">{data.rewards.avg.toFixed(4)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-black/40 p-3 rounded border border-white/[0.05]">
                       <span className="text-[10px] text-slate-500 font-mono uppercase">Min Reward</span>
                       <span className="text-[16px] font-bold text-rose-400">{data.rewards.min.toFixed(4)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-black/40 p-3 rounded border border-white/[0.05]">
                       <span className="text-[10px] text-slate-500 font-mono uppercase">Max Reward</span>
                       <span className="text-[16px] font-bold text-emerald-400">{data.rewards.max.toFixed(4)}</span>
                    </div>
                    <div className="flex flex-col gap-1 bg-black/40 p-3 rounded border border-white/[0.05]">
                       <span className="text-[10px] text-slate-500 font-mono uppercase">Reward Source</span>
                       <span className="text-[13px] font-bold text-slate-300 mt-1">optimal_reward</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Row 3: DQN Connection */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-12 p-6 holo-panel border border-orange-500/30 rounded-xl flex flex-col gap-4 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                 </div>
                 
                 <div className="flex flex-col gap-1 relative z-10">
                    <h2 className="text-[14px] font-bold text-orange-400 font-sans uppercase tracking-widest flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>
                       DQN Input State Connection
                    </h2>
                    <p className="text-[13px] text-slate-400">
                       This dataset contains the exact <strong className="text-slate-200">17 features</strong> used as the state tensor for our Deep Q-Network, along with execution metrics and optimal targets.
                    </p>
                 </div>

                 <div className="flex flex-col lg:flex-row gap-8 mt-4 relative z-10">
                    <div className="flex-1">
                       <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3 border-b border-white/[0.1] pb-2">17 DQN State Features</h3>
                       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {dqnFeatures.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[10px] font-mono text-slate-300 bg-black/40 px-2 py-1.5 rounded border border-white/[0.05]">
                               <span className="text-orange-500/70">{idx + 1}.</span> {feat}
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="w-full lg:w-[280px]">
                       <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3 border-b border-white/[0.1] pb-2">Targets & Metrics</h3>
                       <div className="flex flex-wrap gap-2">
                          {["Latency", "Energy", "Cost", "Optimal Action", "Optimal Reward"].map((t, idx) => (
                             <div key={idx} className="text-[10px] font-mono text-cyan-300 bg-cyan-950/30 px-3 py-1.5 rounded border border-cyan-500/30">
                                {t}
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Row 4: Data Table Preview */}
           <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase">Data Sample Preview</h2>
                 
                 <div className="flex flex-wrap items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Search preview..." 
                      className="px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded text-[12px] font-mono text-slate-200 focus:outline-none focus:border-blue-500/50 w-[180px]"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                    
                    <select 
                      className="px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded text-[12px] font-mono text-slate-300 focus:outline-none"
                      value={taskFilter}
                      onChange={e => { setTaskFilter(e.target.value); setPage(1); }}
                    >
                      <option value="ALL">All Types</option>
                      {Object.keys(data.distribution.taskType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <select 
                      className="px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded text-[12px] font-mono text-slate-300 focus:outline-none"
                      value={actionFilter}
                      onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                    >
                      <option value="ALL">All Actions</option>
                      <option value="LOCAL">LOCAL</option>
                      <option value="EDGE">EDGE</option>
                      <option value="CLOUD">CLOUD</option>
                    </select>
                 </div>
              </div>

              <div className="w-full overflow-x-auto border border-white/[0.05] rounded mt-2">
                 <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                       <tr className="bg-black/40 border-b border-white/[0.05]">
                          {["Sample ID", "Task Type", "Data Size", "CPU Dmnd", "Mem Dmnd", "Deadline", "Priority", "Local CPU", "Edge CPU", "Cloud CPU", "Edge Lat", "Cloud Lat", "Opt Action", "Opt Reward"].map((th, idx) => (
                            <th key={idx} className="p-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap">
                              {th}
                            </th>
                          ))}
                       </tr>
                    </thead>
                    <tbody>
                       {currentRows.length === 0 ? (
                         <tr>
                           <td colSpan={14} className="p-8 text-center text-slate-500 font-mono text-[12px]">No samples match the filters in the current preview.</td>
                         </tr>
                       ) : (
                         currentRows.map((row: any, i: number) => (
                           <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                             <td className="p-3 text-[11px] font-mono text-slate-400">{row.sample_id}</td>
                             <td className="p-3 text-[11px] font-mono text-blue-300 font-bold">{row.task_type}</td>
                             <td className="p-3 text-[11px] font-mono text-slate-300">{row.data_size_mb} MB</td>
                             <td className="p-3 text-[11px] font-mono text-slate-300">{row.cpu_demand_percent}%</td>
                             <td className="p-3 text-[11px] font-mono text-slate-300">{row.memory_demand_percent}%</td>
                             <td className="p-3 text-[11px] font-mono text-amber-300">{row.deadline_ms} ms</td>
                             <td className="p-3 text-[11px] font-mono text-slate-300">{row.priority}</td>
                             <td className="p-3 text-[11px] font-mono text-slate-300">{row.local_cpu_available_percent}%</td>
                             <td className="p-3 text-[11px] font-mono text-slate-300">{row.edge_cpu_load_percent}%</td>
                             <td className="p-3 text-[11px] font-mono text-slate-300">{row.cloud_cpu_load_percent}%</td>
                             <td className="p-3 text-[11px] font-mono text-emerald-300">{row.edge_latency_ms} ms</td>
                             <td className="p-3 text-[11px] font-mono text-purple-300">{row.cloud_latency_ms} ms</td>
                             <td className="p-3 text-[11px] font-mono font-bold">
                               <span className={`px-2 py-0.5 rounded border ${row.optimal_action === 'LOCAL' ? 'bg-slate-500/20 text-slate-300 border-slate-500/50' : row.optimal_action === 'EDGE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-purple-500/20 text-purple-400 border-purple-500/50'}`}>
                                 {row.optimal_action}
                               </span>
                             </td>
                             <td className="p-3 text-[11px] font-mono text-cyan-300">{parseFloat(row.optimal_reward).toFixed(4)}</td>
                           </tr>
                         ))
                       )}
                    </tbody>
                 </table>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                 <span className="text-[11px] font-mono text-slate-500">
                   Showing {currentRows.length} of {filteredPreview.length} previewed samples (Total Dataset: {data.meta.totalSamples.toLocaleString()})
                 </span>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-black/40 border border-white/[0.1] rounded text-[11px] font-mono text-slate-300 disabled:opacity-50 transition-colors hover:bg-white/[0.05]"
                    >
                      Prev
                    </button>
                    <span className="text-[11px] font-mono text-slate-400">Page {page} of {totalPages}</span>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 bg-black/40 border border-white/[0.1] rounded text-[11px] font-mono text-slate-300 disabled:opacity-50 transition-colors hover:bg-white/[0.05]"
                    >
                      Next
                    </button>
                 </div>
              </div>
           </div>
         </div>
       )}
    </DashboardLayout>
  );
}
