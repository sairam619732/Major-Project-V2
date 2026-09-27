// Phase 11.3: Restrained Technical Telemetry Line
// Single subtle technical line positioned in the 3D viewport region, updating live with simulated inputs

"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";

export function SimulationTelemetryLine() {
  const { state } = useSimulationState();
  const { task, device, edge, cloud } = state;

  return (
    <div className="flex flex-col gap-1.5 font-mono select-none pointer-events-none text-right">
      <div className="flex items-center justify-end gap-2 text-[11px] tracking-[0.24em] uppercase text-slate-400 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#38bdf8]" />
        <span>SIMULATED TELEMETRY · DEMO VALUES</span>
      </div>

      <div className="text-xs sm:text-[13px] tracking-[0.16em] uppercase text-slate-200 font-medium">
        <span className="text-cyan-400 font-bold">{task.id}</span>
        <span className="text-slate-600 mx-1.5">·</span>
        <span>{task.taskSizeMb} MB</span>
        <span className="text-slate-600 mx-1.5">·</span>
        <span>CPU {task.cpuDemandPct}%</span>
        <span className="text-slate-600 mx-1.5">·</span>
        <span>MEM {task.memoryDemandPct}%</span>
        <span className="text-slate-600 mx-1.5">·</span>
        <span>DL {task.deadlineMs} MS</span>
      </div>

      <div className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
        <span>LOC: {device.cpuAvailablePct}% CPU</span>
        <span className="text-slate-600 mx-1.5">·</span>
        <span>EDG: {edge.cpuLoadPct}% CPU / {edge.queueLength}Q</span>
        <span className="text-slate-600 mx-1.5">·</span>
        <span>CLD: {cloud.cpuLoadPct}% CPU / {cloud.latencyMs}MS</span>
      </div>
    </div>
  );
}
