"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";

export function SimulationDqnDecisionOverlay() {
  const { decision, executionStage } = useSimulationState();
  const target = decision.selectedTarget;

  const targetColor = target === "local" ? "text-[#38bdf8] border-[#38bdf8]/50 bg-[#38bdf8]/10" 
                    : target === "edge" ? "text-[#34d399] border-[#34d399]/50 bg-[#34d399]/10" 
                    : "text-[#a78bfa] border-[#a78bfa]/50 bg-[#a78bfa]/10";

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none select-none z-10">
       <div className="px-4 py-1.5 rounded-t bg-amber-500/20 border-t border-l border-r border-amber-500/50 backdrop-blur-md">
          <span className="font-mono text-[12px] font-bold text-amber-400 tracking-widest uppercase">
             DQN AGENT DECISION
          </span>
       </div>
       <div className={`px-6 py-3 rounded border backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] ${targetColor}`}>
          <div className="flex flex-col items-center gap-1">
             <span className="font-mono text-[10px] text-slate-300 tracking-widest uppercase">
               TARGET
             </span>
             <span className="font-mono text-xl font-bold tracking-widest uppercase shadow-black drop-shadow-md">
               {target}
             </span>
          </div>
       </div>
    </div>
  );
}
