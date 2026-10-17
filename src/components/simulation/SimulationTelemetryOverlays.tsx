"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";

const TIERS = {
  edge: { title: "Edge Server", color: "#34d399" },
  cloud: { title: "Cloud DataCenter", color: "#a78bfa" },
} as const;

// Rendered inside the 3D canvas (drei <Html>) so each card stays anchored beside its model.
function TelemetryCard({ tier }: { tier: keyof typeof TIERS }) {
  const { state } = useSimulationState();
  const { title, color } = TIERS[tier];
  const node = state[tier];

  return (
    <div
      className="pointer-events-none select-none flex flex-col gap-2 p-3 rounded-lg bg-[#030712]/80 backdrop-blur w-[160px]"
      style={{ border: `1px solid ${color}66`, boxShadow: `0 0 20px ${color}1a` }}
    >
      <div className="flex items-center gap-2 mb-1 pb-2" style={{ borderBottom: `1px solid ${color}4d` }}>
         <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
         <span className="font-mono text-[10px] uppercase font-bold tracking-widest" style={{ color }}>{title}</span>
      </div>

      <div className="flex flex-col gap-1.5 font-mono text-[9px] text-slate-300">
         <div className="flex justify-between items-center">
            <span>CPU</span>
            <span className="text-white font-bold">{node.cpuLoadPct}%</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Queue</span>
            <span className="text-white font-bold">{node.queueLength} tasks</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Latency</span>
            <span className="text-white font-bold">{node.latencyMs}ms</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Bandwidth</span>
            <span className="text-white font-bold">{node.bandwidthGbps} Gbps</span>
         </div>
      </div>
    </div>
  );
}

export function SimulationEdgeTelemetryOverlay() {
  return <TelemetryCard tier="edge" />;
}

export function SimulationCloudTelemetryOverlay() {
  return <TelemetryCard tier="cloud" />;
}
