// Phase 11.3: Cinematic Editorial Simulation Parameters & Results
// Large readable typography, zero card borders or dashboard boxes, generous negative space

"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";
import { SCENARIO_PRESETS } from "@/lib/simulation/simulationPresets";

interface MinimalSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  accent?: string;
  onChange: (val: number) => void;
}

function MinimalSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  accent = "accent-cyan-400",
  onChange,
}: MinimalSliderProps) {
  return (
    <div className="flex flex-col py-2.5 group">
      <div className="flex items-center justify-between font-mono mb-1.5">
        <span className="text-slate-300 group-hover:text-white transition-colors text-[13px] sm:text-sm uppercase tracking-[0.16em] font-medium">
          {label}
        </span>
        <span className="text-slate-100 font-semibold tabular-nums text-sm sm:text-[15px] tracking-wider">
          {value}{" "}
          <span className="text-slate-400 font-normal text-xs uppercase ml-0.5">
            {unit}
          </span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 bg-white/[0.12] group-hover:bg-white/[0.22] appearance-none cursor-pointer ${accent} transition-colors rounded-full`}
      />
    </div>
  );
}

export function SimulationEditorialRail() {
  const {
    state,
    decision,
    updateTask,
    updateDevice,
    updateEdge,
    updateCloud,
    applyPreset,
    reset,
    runSimulation,
  } = useSimulationState();

  const selectedTarget = decision.selectedTarget;

  const targetColor = {
    local: "text-amber-400",
    edge: "text-emerald-400",
    cloud: "text-violet-400",
  }[selectedTarget];

  const targetGlow = {
    local: "shadow-[0_0_28px_-4px_rgba(245,158,11,0.35)] border-amber-500/50",
    edge: "shadow-[0_0_28px_-4px_rgba(16,185,129,0.35)] border-emerald-500/50",
    cloud: "shadow-[0_0_28px_-4px_rgba(139,92,246,0.35)] border-violet-500/50",
  }[selectedTarget];

  return (
    <div className="flex flex-col gap-14 w-full text-slate-200 select-none">
      {/* ================================================== */}
      {/* 1. SECTION TITLE: SIMULATION PARAMETERS             */}
      {/* ================================================== */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.24em] text-cyan-400 uppercase font-semibold">
          // CONFIGURATION
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight">
          SIMULATION PARAMETERS
        </h2>
        <p className="text-base text-slate-300 font-sans mt-1">
          Tune task dimensions and distributed compute conditions. Real-time cost scoring responds dynamically.
        </p>
      </div>

      {/* ================================================== */}
      {/* 2. PARAMETERS GRID (NO BOXED CARDS, CLEAN DIVIDERS)*/}
      {/* ================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        {/* GROUP 1: // TASK */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-cyan-500/30 pb-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-mono text-sm tracking-[0.20em] uppercase text-cyan-300 font-bold">
              // TASK_001
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04]">
            <MinimalSlider
              label="Task Size"
              value={state.task.taskSizeMb}
              min={1}
              max={100}
              unit="MB"
              accent="accent-cyan-400"
              onChange={(val) => updateTask({ taskSizeMb: val })}
            />
            <MinimalSlider
              label="CPU Demand"
              value={state.task.cpuDemandPct}
              min={5}
              max={100}
              unit="%"
              accent="accent-cyan-400"
              onChange={(val) => updateTask({ cpuDemandPct: val })}
            />
            <MinimalSlider
              label="Memory Demand"
              value={state.task.memoryDemandPct}
              min={5}
              max={100}
              unit="%"
              accent="accent-cyan-400"
              onChange={(val) => updateTask({ memoryDemandPct: val })}
            />
            <MinimalSlider
              label="Deadline"
              value={state.task.deadlineMs}
              min={10}
              max={500}
              step={5}
              unit="MS"
              accent="accent-cyan-400"
              onChange={(val) => updateTask({ deadlineMs: val })}
            />
            <MinimalSlider
              label="Priority"
              value={state.task.priority}
              min={1}
              max={5}
              unit="LVL"
              accent="accent-cyan-400"
              onChange={(val) => updateTask({ priority: val })}
            />
          </div>
        </div>

        {/* GROUP 2: // LOCAL RUNTIME */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-amber-500/30 pb-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-mono text-sm tracking-[0.20em] uppercase text-amber-300 font-bold">
              // LOCAL DEVICE
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04]">
            <MinimalSlider
              label="CPU Available"
              value={state.device.cpuAvailablePct}
              min={0}
              max={100}
              unit="%"
              accent="accent-amber-400"
              onChange={(val) => updateDevice({ cpuAvailablePct: val })}
            />
            <MinimalSlider
              label="Memory Available"
              value={state.device.memoryAvailablePct}
              min={0}
              max={100}
              unit="%"
              accent="accent-amber-400"
              onChange={(val) => updateDevice({ memoryAvailablePct: val })}
            />
            <MinimalSlider
              label="Battery Level"
              value={state.device.batteryPct}
              min={5}
              max={100}
              unit="%"
              accent="accent-amber-400"
              onChange={(val) => updateDevice({ batteryPct: val })}
            />
            <MinimalSlider
              label="Base Latency"
              value={state.device.latencyMs}
              min={1}
              max={50}
              unit="MS"
              accent="accent-amber-400"
              onChange={(val) => updateDevice({ latencyMs: val })}
            />
          </div>
        </div>

        {/* GROUP 3: // EDGE RUNTIME */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-emerald-500/30 pb-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-sm tracking-[0.20em] uppercase text-emerald-300 font-bold">
              // EDGE SERVER
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04]">
            <MinimalSlider
              label="CPU Load"
              value={state.edge.cpuLoadPct}
              min={0}
              max={100}
              unit="%"
              accent="accent-emerald-400"
              onChange={(val) => updateEdge({ cpuLoadPct: val })}
            />
            <MinimalSlider
              label="Task Queue"
              value={state.edge.queueLength}
              min={0}
              max={20}
              unit="TASKS"
              accent="accent-emerald-400"
              onChange={(val) => updateEdge({ queueLength: val })}
            />
            <MinimalSlider
              label="Network Latency"
              value={state.edge.latencyMs}
              min={5}
              max={100}
              unit="MS"
              accent="accent-emerald-400"
              onChange={(val) => updateEdge({ latencyMs: val })}
            />
            <MinimalSlider
              label="Bandwidth"
              value={state.edge.bandwidthGbps}
              min={0.5}
              max={10}
              step={0.5}
              unit="GBPS"
              accent="accent-emerald-400"
              onChange={(val) => updateEdge({ bandwidthGbps: val })}
            />
          </div>
        </div>

        {/* GROUP 4: // CLOUD DATACENTER */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-violet-500/30 pb-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="font-mono text-sm tracking-[0.20em] uppercase text-violet-300 font-bold">
              // CLOUD INFRASTRUCTURE
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04]">
            <MinimalSlider
              label="CPU Load"
              value={state.cloud.cpuLoadPct}
              min={0}
              max={100}
              unit="%"
              accent="accent-violet-400"
              onChange={(val) => updateCloud({ cpuLoadPct: val })}
            />
            <MinimalSlider
              label="Task Queue"
              value={state.cloud.queueLength}
              min={0}
              max={30}
              unit="TASKS"
              accent="accent-violet-400"
              onChange={(val) => updateCloud({ queueLength: val })}
            />
            <MinimalSlider
              label="Network Latency"
              value={state.cloud.latencyMs}
              min={20}
              max={300}
              unit="MS"
              accent="accent-violet-400"
              onChange={(val) => updateCloud({ latencyMs: val })}
            />
            <MinimalSlider
              label="Bandwidth"
              value={state.cloud.bandwidthGbps}
              min={1}
              max={40}
              step={1}
              unit="GBPS"
              accent="accent-violet-400"
              onChange={(val) => updateCloud({ bandwidthGbps: val })}
            />
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3. SCENARIO PRESETS: MINIMAL INLINE SELECTOR       */}
      {/* ================================================== */}
      <div className="flex flex-col gap-3 pt-6 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">
            SCENARIOS
          </h3>
          <span className="font-mono text-xs tracking-[0.18em] text-slate-400 uppercase">
            QUICK BENCHMARKS
          </span>
        </div>

        {/* Inline horizontal selector: NO 6 CARDS */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          {SCENARIO_PRESETS.map((preset) => {
            const isCurrent = state.activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`py-2 px-3.5 rounded text-xs sm:text-[13px] font-mono tracking-[0.16em] uppercase transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? "bg-cyan-500/20 text-cyan-200 border-b-2 border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent font-medium"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================== */}
      {/* 4. LIVE DECISION RESULT                            */}
      {/* ================================================== */}
      <div className="flex flex-col gap-5 pt-8 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs tracking-[0.24em] text-cyan-400 uppercase font-semibold">
            // LIVE DECISION
          </span>
          <span className="font-mono text-xs tracking-[0.16em] text-slate-500 uppercase">
            DETERMINISTIC EVALUATION
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm tracking-[0.22em] text-slate-400 uppercase font-medium">
            SELECTED ENVIRONMENT
          </span>
          <span
            className={`font-sans font-black text-5xl sm:text-6xl lg:text-7xl uppercase tracking-tight ${targetColor}`}
          >
            {decision.selectedCandidate.displayName}
          </span>
        </div>

        {/* Cost Scores Comparison */}
        <div className="grid grid-cols-3 gap-6 py-4 border-y border-white/[0.06]">
          <div className="flex flex-col">
            <span className="font-mono text-xs tracking-[0.18em] text-amber-400/90 uppercase font-medium">
              LOCAL
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-amber-200 mt-1 tabular-nums">
              {decision.candidateScores.local.score}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs tracking-[0.18em] text-emerald-400/90 uppercase font-medium">
              EDGE
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-emerald-200 mt-1 tabular-nums">
              {decision.candidateScores.edge.score}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs tracking-[0.18em] text-violet-400/90 uppercase font-medium">
              CLOUD
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-violet-200 mt-1 tabular-nums">
              {decision.candidateScores.cloud.score}
            </span>
          </div>
        </div>

        {/* Formulated Analytical Reason */}
        <p className="font-sans text-base sm:text-lg leading-relaxed text-slate-200 italic border-l-2 border-emerald-400/80 pl-4 py-1">
          &ldquo;{decision.reason}&rdquo;
        </p>

        {/* Primary and Secondary Actions */}
        <div className="flex items-center gap-6 pt-4">
          <button
            type="button"
            onClick={runSimulation}
            className="px-7 py-3.5 rounded border border-cyan-400/60 bg-gradient-to-r from-cyan-950/60 to-[#031c26] hover:border-cyan-300 hover:from-cyan-950/80 text-cyan-100 font-mono text-sm tracking-[0.20em] uppercase font-bold transition-all shadow-[0_0_24px_-4px_rgba(6,182,212,0.35)] cursor-pointer"
          >
            RUN SIMULATION →
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-xs font-mono tracking-[0.18em] uppercase text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors cursor-pointer"
          >
            RESET TO DEFAULT
          </button>
        </div>
      </div>
    </div>
  );
}
