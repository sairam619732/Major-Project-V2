"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { simulationStore, useSimulationState } from "@/lib/simulation/simulationState";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useEffect } from "react";
import { nodeSource } from "@/services/apiClient";

const ACCENTS = {
  emerald: { border: "border-emerald-900/30", title: "text-emerald-400", specs: "text-emerald-600" },
  purple: { border: "border-purple-900/30", title: "text-purple-400", specs: "text-purple-600" },
} as const;

const BADGES = {
  live: { text: "LIVE", cls: "bg-emerald-500/20 text-emerald-400" },
  offline: { text: "OFFLINE", cls: "bg-rose-500/20 text-rose-400" },
  sim: { text: "SIMULATED", cls: "bg-white/[0.08] text-slate-300" },
} as const;

/** Edge or cloud tier: a live node's real readings, an offline notice, or the simulated what-if values. */
function TierCard({ tier, title, accent }: { tier: "edge" | "cloud"; title: string; accent: keyof typeof ACCENTS }) {
  const { state, nodeTelemetry } = useSimulationState();
  const node = nodeTelemetry?.[tier];
  const source = nodeSource(node);
  const colors = ACCENTS[accent];
  const sim = state[tier];

  const lines =
    source === "live" && node
      ? {
          left: [
            `Node: ${node.node_id ?? "—"}`,
            `Platform: ${node.platform ?? "—"}`,
            `Endpoint: ${node.url}`,
            // Which hardware runs detection there (e.g. the cloud desktop's GPU).
            `Detector: ${node.detector?.split(" · ").slice(1).join(" · ") || "—"}`,
          ],
          right: [
            `CPU: ${node.cpu_load}% of ${node.cpu_count} cores`,
            `Memory: ${node.memory_used}% of ${node.memory_total_gb} GB`,
            `Queue: ${node.task_queue} tasks`,
            `Latency: ${node.network_latency_ms} ms · Bandwidth: ${node.bandwidth_gbps} Gbps`,
          ],
          footer: node.network_emulation
            ? `Measured every 3 s · network emulated on this machine (${node.network_emulation.rtt_ms} ms round trip${
                node.network_emulation.bandwidth_mbps ? `, ${node.network_emulation.bandwidth_mbps} Mbps` : ""
              })`
            : "Measured every 3 s",
        }
      : source === "offline" && node
        ? {
            left: [`Endpoint: ${node.url}`, `Error: ${node.error ?? "not answering"}`],
            right: [],
            footer: "Not answering: tasks are not sent here",
          }
        : {
            left: [`State: Simulated load (${sim.cpuLoadPct}% CPU)`, "Endpoint: Cost model (executes on local host)"],
            right: [`Bandwidth: ${sim.bandwidthGbps} Gbps`, `Base Latency: ${sim.latencyMs} ms`],
            footer: `No node configured (${tier.toUpperCase()}_NODE_URL)`,
          };

  return (
    <div className={`p-6 holo-panel border ${colors.border} rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4`}>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-3">
          <h2 className={`text-xl font-bold ${colors.title}`}>{title}</h2>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${BADGES[source].cls}`}>{BADGES[source].text}</span>
        </div>
        {lines.left.map((l) => (
          <p key={l} className="text-[12px] font-mono text-slate-400 break-all">{l}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2 items-start sm:items-end">
        <span className={`text-[10px] font-mono uppercase tracking-wider ${colors.specs}`}>Specs</span>
        {lines.right.map((l) => (
          <span key={l} className="text-[12px] font-mono text-slate-300">{l}</span>
        ))}
        <span className="text-[10px] font-mono text-slate-500 mt-1">{lines.footer}</span>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const { realLocalTelemetry } = useSimulationState();
  const backend = useBackendStatus();

  // Poll the backend's psutil telemetry while this page is open (shared poller).
  useEffect(() => simulationStore.startTelemetryPolling(), []);

  // Only show local values from a live reading; without one, show "—" rather than a guess.
  const local = realLocalTelemetry;
  const localBadge = local
    ? { text: "LIVE", cls: "bg-emerald-500/20 text-emerald-400" }
    : backend.kind === "offline"
      ? { text: "BACKEND OFFLINE", cls: "bg-rose-500/20 text-rose-400" }
      : { text: "CONNECTING…", cls: "bg-white/[0.08] text-slate-300" };

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold font-sans tracking-tight holo-title">Devices</h1>
          <p className="text-[14px] text-slate-400">Topology and Connection Status of all execution endpoints</p>
       </div>
       
       <div className="flex flex-col gap-6">
         {/* Local Host Node */}
         <div className="p-6 holo-panel border rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3">
               <h2 className="text-xl font-bold text-slate-200">Local Host Device</h2>
               <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${localBadge.cls}`}>{localBadge.text}</span>
             </div>
             <p className="text-[12px] font-mono text-slate-400 mt-1">Platform: {local?.platform ?? "—"}</p>
             <p className="text-[12px] font-mono text-slate-400">Endpoint: Internal process (CPU)</p>
           </div>
           <div className="flex flex-col gap-2 items-start sm:items-end">
             <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Specs</span>
             <span className="text-[12px] font-mono text-slate-300">CPU Cores: {local ? local.cpu_count : "—"}</span>
             <span className="text-[12px] font-mono text-slate-300">Memory: {local ? `${local.memory_total_gb} GB` : "—"}</span>
             <span className="text-[10px] font-mono text-slate-500 mt-1">Last Reading: {local ? new Date(local.timestamp * 1000).toLocaleTimeString() : "—"}</span>
           </div>
         </div>

         <TierCard tier="edge" title="Edge Server" accent="emerald" />
         <TierCard tier="cloud" title="Cloud Datacenter" accent="purple" />
       </div>
    </DashboardLayout>
  );
}
