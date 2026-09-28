// Phase 11.8: Final Simulation Alignment + Parameter Bar Refinement
// Technical range slider with active track segment fill, 16px circular handle, and tabular column alignment
// 2x2 Technical Grid:
// Top Row: TASK | LOCAL DEVICE
// Bottom Row: EDGE SERVER | CLOUD INFRASTRUCTURE

"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";
import { SCENARIO_PRESETS } from "@/lib/simulation/simulationPresets";

interface TechnicalSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  accentColor: string;
  glowColor: string;
  onChange: (val: number) => void;
}

function TechnicalSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  accentColor,
  glowColor,
  onChange,
}: TechnicalSliderProps) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const trackGradient = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${pct}%, rgba(255, 255, 255, 0.14) ${pct}%, rgba(255, 255, 255, 0.14) 100%)`;

  return (
    <div className="technical-slider flex flex-col py-1 group">
      {/* Label on left, Tabular Value + Unit on far right */}
      <div className="flex items-baseline justify-between font-mono mb-1">
        <span className="text-[12.5px] sm:text-[13px] tracking-[0.08em] uppercase text-slate-300 font-medium group-hover:text-white transition-colors">
          {label}
        </span>
        <div className="flex items-baseline justify-end gap-1.5 tabular-nums">
          <span className="text-[13px] sm:text-[14px] font-semibold text-slate-100 tabular-nums text-right min-w-[3.6ch]">
            {value}
          </span>
          <span className="text-[11px] text-slate-400 font-normal w-[4ch] text-left uppercase">
            {unit}
          </span>
        </div>
      </div>
      {/* Technical Instrument Track with Active Segment Fill */}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          background: trackGradient,
          "--slider-thumb-color": accentColor,
          "--slider-thumb-glow": glowColor,
        } as React.CSSProperties}
        className="tech-slider w-full cursor-pointer"
      />
    </div>
  );
}

// ==================================================
// COMPACT 2x2 PARAMETERS GRID + SCENARIO PRESETS
// ==================================================
export function SimulationCompactControls() {
  const {
    state,
    updateTask,
    updateDevice,
    updateEdge,
    updateCloud,
    applyPreset,
  } = useSimulationState();

  return (
    <div className="flex flex-col w-full text-slate-200 select-none">
      {/* 2x2 Clean Technical Grid:
          TOP ROW:    TASK             LOCAL DEVICE
          BOTTOM ROW: EDGE SERVER      CLOUD INFRASTRUCTURE
          Clear horizontal gap: 32–56px
          Clear vertical gap: 28–44px
      */}
      <div className="parameter-grid grid grid-cols-2 [grid-template-columns:repeat(2,minmax(0,1fr))] gap-x-8 sm:gap-x-10 lg:gap-x-12 gap-y-7 sm:gap-y-8 lg:gap-y-9">
        {/* ================================================== */}
        {/* TOP LEFT: // TASK                                  */}
        {/* ================================================== */}
        <div className="flex flex-col">
          <div className="parameter-heading flex items-center gap-2 border-b border-cyan-500/40 pb-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-[13px] sm:text-[14px] tracking-[0.10em] uppercase text-cyan-300 font-semibold">
              {"// TASK"}
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04]">
            <TechnicalSlider
              label="Task Size"
              value={state.task.taskSizeMb}
              min={1}
              max={100}
              unit="MB"
              accentColor="#38bdf8"
              glowColor="rgba(56, 189, 248, 0.5)"
              onChange={(val) => updateTask({ taskSizeMb: val })}
            />
            <TechnicalSlider
              label="CPU Demand"
              value={state.task.cpuDemandPct}
              min={5}
              max={100}
              unit="%"
              accentColor="#38bdf8"
              glowColor="rgba(56, 189, 248, 0.5)"
              onChange={(val) => updateTask({ cpuDemandPct: val })}
            />
            <TechnicalSlider
              label="Memory Demand"
              value={state.task.memoryDemandPct}
              min={5}
              max={100}
              unit="%"
              accentColor="#38bdf8"
              glowColor="rgba(56, 189, 248, 0.5)"
              onChange={(val) => updateTask({ memoryDemandPct: val })}
            />
            <TechnicalSlider
              label="Deadline"
              value={state.task.deadlineMs}
              min={10}
              max={500}
              step={5}
              unit="MS"
              accentColor="#38bdf8"
              glowColor="rgba(56, 189, 248, 0.5)"
              onChange={(val) => updateTask({ deadlineMs: val })}
            />
            <TechnicalSlider
              label="Priority"
              value={state.task.priority}
              min={1}
              max={5}
              unit="LVL"
              accentColor="#38bdf8"
              glowColor="rgba(56, 189, 248, 0.5)"
              onChange={(val) => updateTask({ priority: val })}
            />
          </div>
        </div>

        {/* ================================================== */}
        {/* TOP RIGHT: // LOCAL DEVICE                         */}
        {/* ================================================== */}
        <div className="flex flex-col">
          <div className="parameter-heading flex items-center gap-2 border-b border-amber-500/40 pb-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            <span className="font-mono text-[13px] sm:text-[14px] tracking-[0.10em] uppercase text-amber-300 font-semibold">
              {"// LOCAL DEVICE"}
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04]">
            <TechnicalSlider
              label="CPU Available"
              value={state.device.cpuAvailablePct}
              min={0}
              max={100}
              unit="%"
              accentColor="#fbbf24"
              glowColor="rgba(251, 191, 36, 0.5)"
              onChange={(val) => updateDevice({ cpuAvailablePct: val })}
            />
            <TechnicalSlider
              label="Memory Available"
              value={state.device.memoryAvailablePct}
              min={0}
              max={100}
              unit="%"
              accentColor="#fbbf24"
              glowColor="rgba(251, 191, 36, 0.5)"
              onChange={(val) => updateDevice({ memoryAvailablePct: val })}
            />
            <TechnicalSlider
              label="Battery Level"
              value={state.device.batteryPct}
              min={5}
              max={100}
              unit="%"
              accentColor="#fbbf24"
              glowColor="rgba(251, 191, 36, 0.5)"
              onChange={(val) => updateDevice({ batteryPct: val })}
            />
            <TechnicalSlider
              label="Base Latency"
              value={state.device.latencyMs}
              min={0.1}
              step={0.1}
              max={50}
              unit="MS"
              accentColor="#fbbf24"
              glowColor="rgba(251, 191, 36, 0.5)"
              onChange={(val) => updateDevice({ latencyMs: val })}
            />
          </div>
        </div>

        {/* ================================================== */}
        {/* BOTTOM LEFT: // EDGE SERVER                        */}
        {/* ================================================== */}
        <div className="flex flex-col">
          <div className="parameter-heading flex items-center gap-2 border-b border-emerald-500/40 pb-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="font-mono text-[13px] sm:text-[14px] tracking-[0.10em] uppercase text-emerald-300 font-semibold">
              {"// EDGE SERVER"}
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04]">
            <TechnicalSlider
              label="CPU Load"
              value={state.edge.cpuLoadPct}
              min={0}
              max={100}
              unit="%"
              accentColor="#34d399"
              glowColor="rgba(52, 211, 153, 0.5)"
              onChange={(val) => updateEdge({ cpuLoadPct: val })}
            />
            <TechnicalSlider
              label="Task Queue"
              value={state.edge.queueLength}
              min={0}
              max={40}
              unit="TASKS"
              accentColor="#34d399"
              glowColor="rgba(52, 211, 153, 0.5)"
              onChange={(val) => updateEdge({ queueLength: val })}
            />
            <TechnicalSlider
              label="Network Latency"
              value={state.edge.latencyMs}
              min={0.1}
              step={0.1}
              max={100}
              unit="MS"
              accentColor="#34d399"
              glowColor="rgba(52, 211, 153, 0.5)"
              onChange={(val) => updateEdge({ latencyMs: val })}
            />
            <TechnicalSlider
              label="Bandwidth"
              value={state.edge.bandwidthGbps}
              min={0.5}
              max={40}
              step={0.5}
              unit="GBPS"
              accentColor="#34d399"
              glowColor="rgba(52, 211, 153, 0.5)"
              onChange={(val) => updateEdge({ bandwidthGbps: val })}
            />
          </div>
        </div>

        {/* ================================================== */}
        {/* BOTTOM RIGHT: // CLOUD INFRASTRUCTURE              */}
        {/* ================================================== */}
        <div className="flex flex-col">
          <div className="parameter-heading flex items-center gap-2 border-b border-violet-500/40 pb-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
            <span className="font-mono text-[13px] sm:text-[14px] tracking-[0.10em] uppercase text-violet-300 font-semibold">
              {"// CLOUD INFRASTRUCTURE"}
            </span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04]">
            <TechnicalSlider
              label="CPU Load"
              value={state.cloud.cpuLoadPct}
              min={0}
              max={100}
              unit="%"
              accentColor="#a78bfa"
              glowColor="rgba(167, 139, 250, 0.5)"
              onChange={(val) => updateCloud({ cpuLoadPct: val })}
            />
            <TechnicalSlider
              label="Task Queue"
              value={state.cloud.queueLength}
              min={0}
              max={30}
              unit="TASKS"
              accentColor="#a78bfa"
              glowColor="rgba(167, 139, 250, 0.5)"
              onChange={(val) => updateCloud({ queueLength: val })}
            />
            <TechnicalSlider
              label="Network Latency"
              value={state.cloud.latencyMs}
              min={20}
              max={300}
              unit="MS"
              accentColor="#a78bfa"
              glowColor="rgba(167, 139, 250, 0.5)"
              onChange={(val) => updateCloud({ latencyMs: val })}
            />
            <TechnicalSlider
              label="Bandwidth"
              value={state.cloud.bandwidthGbps}
              min={1}
              max={80}
              step={1}
              unit="GBPS"
              accentColor="#a78bfa"
              glowColor="rgba(167, 139, 250, 0.5)"
              onChange={(val) => updateCloud({ bandwidthGbps: val })}
            />
          </div>
        </div>
      </div>

      {/* Scenarios: Compact Single Line Technical Selector with 24-32px breathing room */}
      <div className="scenarios flex flex-col gap-2 mt-6 sm:mt-7 lg:mt-8 pt-3 border-t border-white/[0.08]">
        <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.12em] uppercase text-slate-400">
          <span className="font-semibold text-slate-300">SCENARIO BENCHMARKS:</span>
          <span className="text-cyan-400/80 text-[10px]">PRESET MODES</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_PRESETS.map((preset) => {
            const isCurrent = state.activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                aria-pressed={isCurrent}
                className={`py-1.5 px-3 rounded text-[11px] sm:text-[12px] font-mono tracking-[0.10em] uppercase transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/80 font-bold shadow-[0_0_10px_rgba(6,182,212,0.30)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] border border-white/[0.08] font-medium"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================================================
// BOTTOM RESULT STRIP: LIVE DECISION / SCORES / CTA
// ==================================================
export function SimulationBottomResultStrip() {
  const { decision, reset, runSimulation, apiStatus, apiError } = useSimulationState();
  const selectedTarget = decision.selectedTarget;

  const targetColor = {
    local: "text-amber-400",
    edge: "text-emerald-400",
    cloud: "text-violet-400",
  }[selectedTarget];

  return (
    <div className="decision-strip w-full flex items-center justify-between gap-6 text-slate-200 select-none">
      {/* 1. Live Decision & Selected Environment */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-cyan-400 font-bold">
              {"// LIVE DECISION"}
            </span>
            {apiStatus === "running" && (
              <span className="font-mono text-[9px] tracking-wider text-cyan-300 uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/50 animate-pulse">
                RUNNING...
              </span>
            )}
            {apiStatus === "success" && (
              <span className="font-mono text-[9px] tracking-wider text-emerald-300 uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-400/50">
                {decision.method === "dqn"
                  ? `DQN AGENT ${decision.confidence ? `(${Math.round(decision.confidence * 100)}%)` : ""}`
                  : decision.method === "rule_based_fallback"
                  ? "RULE FALLBACK"
                  : "API // SYNCED"}
              </span>
            )}

            {apiStatus === "error" && (
              <span
                className="font-mono text-[9px] tracking-wider text-amber-300 uppercase px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-400/50 cursor-help"
                title={apiError || "Backend offline - Using local engine fallback"}
              >
                OFFLINE FALLBACK
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-slate-400 font-medium">
            SELECTED ENVIRONMENT
          </span>
        </div>
        <span
          className={`font-display font-black text-3xl sm:text-4xl lg:text-[42px] uppercase tracking-tight ${targetColor}`}
        >
          {decision.selectedCandidate.displayName}
        </span>
      </div>

      {/* 2. Candidate Scores on ONE Alignment Line + Decision Reason Quote */}
      <div className="decision-scores flex-1 flex flex-col justify-center gap-1 min-w-0 max-w-2xl px-6 border-x border-white/[0.08]">
        {/* Scores */}
        <div className="flex items-center gap-8 font-mono">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
              LOCAL
            </span>
            <span
              className={`text-lg font-bold tabular-nums ${
                selectedTarget === "local" ? "text-amber-400 font-black" : "text-slate-300"
              }`}
            >
              {decision.candidateScores.local.score}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
              EDGE
            </span>
            <span
              className={`text-lg font-bold tabular-nums ${
                selectedTarget === "edge" ? "text-emerald-400 font-black" : "text-slate-300"
              }`}
            >
              {decision.candidateScores.edge.score}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
              CLOUD
            </span>
            <span
              className={`text-lg font-bold tabular-nums ${
                selectedTarget === "cloud" ? "text-violet-400 font-black" : "text-slate-300"
              }`}
            >
              {decision.candidateScores.cloud.score}
            </span>
          </div>
        </div>

        {/* Reason Quote */}
        <p className="decision-reason font-sans text-[12px] sm:text-[13px] text-slate-300 italic truncate border-l border-emerald-400/60 pl-2">
          &ldquo;{decision.reason}&rdquo;
        </p>
      </div>

      {/* 3. RUN SIMULATION CTA + RESET */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          type="button"
          onClick={runSimulation}
          disabled={apiStatus === "running"}
          aria-busy={apiStatus === "running"}
          className={`run-simulation px-6 py-3 rounded border font-mono text-[13px] tracking-[0.12em] uppercase font-bold transition-all flex items-center gap-2 ${
            apiStatus === "running"
              ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-300/70 cursor-wait opacity-80"
              : "border-cyan-400/80 bg-gradient-to-r from-cyan-950/80 to-[#031c26] hover:border-cyan-300 text-cyan-100 shadow-[0_0_20px_-4px_rgba(6,182,212,0.40)] hover:scale-[1.02] cursor-pointer"
          }`}
        >
          {apiStatus === "running" ? (
            <>
              <span className="inline-block animate-spin text-cyan-300">◌</span>
              <span>RUNNING...</span>
            </>
          ) : (
            <>
              <span>RUN SIMULATION</span>
              <span className="text-cyan-300">→</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-[11px] font-mono tracking-[0.14em] uppercase text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors cursor-pointer"
        >
          RESET
        </button>
      </div>
    </div>
  );
}

// Backwards compatibility wrappers
export function SimulationParametersSection() {
  return <SimulationCompactControls />;
}

export function SimulationResultSection() {
  return <SimulationBottomResultStrip />;
}

export function SimulationEditorialRail() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <SimulationCompactControls />
      <SimulationBottomResultStrip />
    </div>
  );
}
