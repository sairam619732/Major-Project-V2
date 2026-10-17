"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";
import { SCENARIO_PRESETS } from "@/lib/simulation/simulationPresets";
import { WorkloadLevel, NetworkConditionLevel } from "@/lib/simulation/simulationTypes";

interface ConditionSelectorProps<T extends string> {
  label: string;
  currentValue: T;
  options: { value: T; label: string }[];
  accentColor: string;
  onChange: (val: T) => void;
}

function ConditionSelector<T extends string>({
  label,
  currentValue,
  options,
  accentColor,
  onChange,
}: ConditionSelectorProps<T>) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 py-2 border-b border-white/[0.04]">
      <span className="font-mono text-[12px] uppercase tracking-wider text-slate-300 font-semibold min-w-[150px]">
        {label}
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {options.map((opt) => {
          const isActive = currentValue === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-4 py-2 rounded-md font-mono text-[11px] tracking-wider uppercase transition-all cursor-pointer ${
                isActive
                  ? "font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.07] border border-white/[0.06]"
              }`}
              style={
                isActive
                  ? {
                      borderColor: accentColor,
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: `${accentColor}25`,
                      color: "#f8fafc",
                    }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SimulationConfig() {
  const { state, experimentConditions, setExperimentCondition, applyPreset, updateTask } = useSimulationState();

  return (
    <div className="flex flex-col p-6 rounded-xl holo-panel border border-cyan-500/30 text-slate-200">
      <div className="flex items-center justify-between border-b border-cyan-500/40 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8]" />
          <span className="font-mono text-base tracking-[0.10em] uppercase text-cyan-300 font-bold">
            {"// EXPERIMENT CONFIGURATION"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 font-mono">
        <div className="flex flex-col p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[11px] uppercase text-slate-400 mb-1.5">PAYLOAD</span>
          <span className="text-[16px] font-bold text-slate-200">{state.task.taskSizeMb} MB</span>
        </div>
        <div className="flex flex-col p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[11px] uppercase text-slate-400 mb-1.5">CPU DEMAND</span>
          <span className="text-[16px] font-bold text-cyan-300">{state.task.cpuDemandPct}%</span>
        </div>
        <div className="flex flex-col p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[11px] uppercase text-slate-400 mb-1.5">DEADLINE</span>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-slate-200">{state.task.deadlineMs} MS</span>
            <button
              type="button"
              onClick={() => updateTask({ deadlineMs: state.task.deadlineMs === 45 ? 90 : 45 })}
              className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
            >
              [TOGGLE]
            </button>
          </div>
        </div>
        <div className="flex flex-col p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[11px] uppercase text-slate-400 mb-1.5">PRIORITY</span>
          <span className="text-[16px] font-bold text-amber-300">LVL {state.task.priority} / 5</span>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.04] mb-5">
        <ConditionSelector<WorkloadLevel>
          label="EDGE CONGESTION"
          currentValue={experimentConditions.edgeCongestion}
          options={[
            { value: "LOW", label: "LOW (IDLE)" },
            { value: "MEDIUM", label: "MEDIUM (ACTIVE)" },
            { value: "HIGH", label: "HIGH (CONGESTED)" },
          ]}
          accentColor="#34d399"
          onChange={(val) => setExperimentCondition("edgeCongestion", val)}
        />
        <ConditionSelector<WorkloadLevel>
          label="CLOUD LOAD"
          currentValue={experimentConditions.cloudLoad}
          options={[
            { value: "LOW", label: "LOW (AVAIL)" },
            { value: "MEDIUM", label: "MEDIUM (LOADED)" },
            { value: "HIGH", label: "HIGH (PEAK DC)" },
          ]}
          accentColor="#a78bfa"
          onChange={(val) => setExperimentCondition("cloudLoad", val)}
        />
        <ConditionSelector<NetworkConditionLevel>
          label="NETWORK CONDITION"
          currentValue={experimentConditions.networkCondition}
          options={[
            { value: "GOOD", label: "GOOD" },
            { value: "LIMITED", label: "LIMITED" },
            { value: "POOR", label: "POOR" },
          ]}
          accentColor="#22d3ee"
          onChange={(val) => setExperimentCondition("networkCondition", val)}
        />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-4 pt-4 border-t border-white/[0.06]">
        <span className="font-mono text-[12px] uppercase tracking-wider text-slate-400 font-semibold min-w-max">
          SCENARIO PRESETS:
        </span>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_PRESETS.map((preset) => {
            const isCurrent = state.activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`py-2 px-4 rounded-md text-[11px] font-mono tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] border border-white/[0.06]"
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
