"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";
import { nodeSource } from "@/services/apiClient";

const TIERS = {
  edge: { title: "Edge Server", color: "#34d399" },
  cloud: { title: "Cloud DataCenter", color: "#a78bfa" },
} as const;

const SOURCE_TAG = {
  live: { text: "LIVE", cls: "text-emerald-300" },
  offline: { text: "OFFLINE", cls: "text-rose-300" },
  sim: { text: "SIM", cls: "text-slate-400" },
} as const;

const unit = (v: number | string, suffix: string) => (typeof v === "number" ? `${v}${suffix}` : v);

// Positioned by SimulationSceneCanvas so each card stays beside its model.
function TelemetryCard({ tier }: { tier: keyof typeof TIERS }) {
  const { state, nodeTelemetry } = useSimulationState();
  const { title, color } = TIERS[tier];
  const source = nodeSource(nodeTelemetry?.[tier]);
  // An offline node has no current readings; show dashes rather than the what-if values.
  const node = source === "offline"
    ? { cpuLoadPct: "—", queueLength: "—", latencyMs: "—", bandwidthGbps: "—" }
    : state[tier];

  return (
    <div
      className="pointer-events-none select-none flex flex-col gap-2 p-3 rounded-lg holo-panel w-[160px]"
      style={{ border: `1px solid ${color}66`, boxShadow: `0 0 20px ${color}1a` }}
    >
      <div className="flex items-center gap-2 mb-1 pb-2" style={{ borderBottom: `1px solid ${color}4d` }}>
         <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
         <span className="font-mono text-[10px] uppercase font-bold tracking-widest" style={{ color }}>{title}</span>
         <span className={`ml-auto font-mono text-[7.5px] tracking-wider ${SOURCE_TAG[source].cls}`}>{SOURCE_TAG[source].text}</span>
      </div>

      <div className="flex flex-col gap-1.5 font-mono text-[9px] text-slate-300">
         <div className="flex justify-between items-center">
            <span>CPU</span>
            <span className="text-white font-bold">{unit(node.cpuLoadPct, "%")}</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Queue</span>
            <span className="text-white font-bold">{unit(node.queueLength, " tasks")}</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Latency</span>
            <span className="text-white font-bold">{unit(node.latencyMs, "ms")}</span>
         </div>
         <div className="flex justify-between items-center">
            <span>Bandwidth</span>
            <span className="text-white font-bold">{unit(node.bandwidthGbps, " Gbps")}</span>
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
