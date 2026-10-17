"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";

// Inline chip for the visualization panel header; kept out of the canvas so it never covers scene labels.
export function SimulationDqnDecisionOverlay() {
  const { decision } = useSimulationState();
  const target = decision.selectedTarget;

  const targetColor = target === "local" ? "text-[#38bdf8] border-[#38bdf8]/50 bg-[#38bdf8]/10"
                    : target === "edge" ? "text-[#34d399] border-[#34d399]/50 bg-[#34d399]/10"
                    : "text-[#a78bfa] border-[#a78bfa]/50 bg-[#a78bfa]/10";

  return (
    <div className="flex items-stretch rounded-md overflow-hidden border border-amber-500/50 select-none font-mono text-[11px] font-bold tracking-widest uppercase">
       <span className="px-2.5 py-1 bg-amber-500/15 text-amber-400 flex items-center">DQN Decision</span>
       <span className={`px-2.5 py-1 border-l flex items-center ${targetColor}`}>{target}</span>
    </div>
  );
}
