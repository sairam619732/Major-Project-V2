"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSimulationState } from "@/lib/simulation/simulationState";

export default function ConfigurationPage() {
  const { state } = useSimulationState();

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold font-sans tracking-tight holo-title">Configuration</h1>
          <p className="text-[14px] text-slate-400">Current simulation and agent parameters</p>
       </div>
       
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Environment Config */}
         <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
           <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase border-b border-white/[0.05] pb-2">Environment State</h2>
           <div className="flex flex-col gap-3">
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Active Preset</span>
               <span className="text-emerald-400 font-bold">{state.activePresetId?.toUpperCase() || "CUSTOM"}</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Local Workload Mode</span>
               <span className="text-slate-200">{state.experimentConditions?.localWorkload || "N/A"}</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Edge Congestion Mode</span>
               <span className="text-slate-200">{state.experimentConditions?.edgeCongestion || "N/A"}</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Cloud Load Mode</span>
               <span className="text-slate-200">{state.experimentConditions?.cloudLoad || "N/A"}</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Network Condition</span>
               <span className="text-slate-200">{state.experimentConditions?.networkCondition || "N/A"}</span>
             </div>
           </div>
         </div>

         {/* Workload Config */}
         <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4">
           <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase border-b border-white/[0.05] pb-2">Task Configuration</h2>
           <div className="flex flex-col gap-3">
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Task Type</span>
               <span className="text-slate-200">{state.task.name}</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Priority Level</span>
               <span className="text-slate-200">{state.task.priority}</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Deadline</span>
               <span className="text-amber-400">{state.task.deadlineMs} ms</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Payload Size</span>
               <span className="text-blue-400">{state.task.taskSizeMb.toFixed(1)} MB</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Estimated CPU Demand</span>
               <span className="text-slate-200">{state.task.cpuDemandPct}%</span>
             </div>
             <div className="flex justify-between font-mono text-[12px]">
               <span className="text-slate-400">Estimated Memory Demand</span>
               <span className="text-slate-200">{state.task.memoryDemandPct}%</span>
             </div>
           </div>
         </div>

         {/* Model Config */}
         <div className="p-6 holo-panel border rounded-xl flex flex-col gap-4 lg:col-span-2">
           <h2 className="text-[14px] font-bold text-slate-200 font-sans uppercase border-b border-white/[0.05] pb-2">DQN Agent & Reward Parameters</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">Algorithm</span>
                <span className="font-mono text-[13px] text-blue-400 font-bold">Deep Q-Network (PyTorch)</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">Input Space</span>
                <span className="font-mono text-[13px] text-slate-200">17-Dimensional State Vector</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">Action Space</span>
                <span className="font-mono text-[13px] text-slate-200">3 (LOCAL, EDGE, CLOUD)</span>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">Alpha (Latency Weight)</span>
                <span className="font-mono text-[13px] text-slate-200">0.5</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">Beta (Energy Weight)</span>
                <span className="font-mono text-[13px] text-slate-200">0.3</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">Gamma (Cost Weight)</span>
                <span className="font-mono text-[13px] text-slate-200">0.2</span>
              </div>
           </div>
           <p className="text-[11px] font-mono text-slate-500 mt-2">
             Note: Reward weights are fixed for the trained model. To modify these weights, retrain the DQN model on the backend using the dataset page.
           </p>
         </div>

       </div>
    </DashboardLayout>
  );
}
