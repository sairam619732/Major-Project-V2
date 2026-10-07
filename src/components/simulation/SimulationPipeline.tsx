"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";

export function SimulationPipeline() {
  const { executionStage, workloadType, decision } = useSimulationState();

  const stages = [
    {
      id: "upload",
      icon: "↑",
      label: "UPLOAD",
      desc: workloadType === "IMAGE" ? "IMAGE" : workloadType === "IMAGE_BATCH" ? "BATCH" : "VIDEO",
      active: executionStage !== "idle",
    },
    {
      id: "analyze",
      icon: "◧",
      label: "ANALYZE WORKLOAD",
      desc: "EXTRACT FEATURES",
      active: ["created", "optimizing", "offloading", "executing", "ready", "error"].includes(executionStage),
    },
    {
      id: "dqn",
      icon: "⚡",
      label: "DQN DECISION",
      desc: "AI OFFLOAD OPTIMIZATION",
      active: ["optimizing", "offloading", "executing", "ready"].includes(executionStage),
    },
    {
      id: "execute",
      icon: "▶",
      label: "EXECUTE TASK",
      desc: executionStage === "optimizing" || executionStage === "created" || executionStage === "idle" ? "WAITING..." : `ROUTING TO ${decision.selectedTarget.toUpperCase()}`,
      active: ["offloading", "executing", "ready"].includes(executionStage),
    },
    {
      id: "result",
      icon: "✓",
      label: "RESULT",
      desc: "METRICS & DETECTION",
      active: executionStage === "ready",
    },
  ];

  return (
    <div className="flex items-center justify-between gap-4 overflow-x-auto select-none py-4 pb-6 scrollbar-none w-full">
      {stages.map((stage, index) => (
        <div key={stage.id} className="flex items-center gap-6 min-w-max flex-1">
          <div
            className={`flex flex-col gap-3 p-5 rounded-xl border w-full transition-all duration-300 ${
              stage.active
                ? "bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                : "bg-black/40 border-white/[0.05] opacity-60 grayscale"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl ${
                  stage.active
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    : "bg-white/[0.05] text-slate-500 border border-white/[0.05]"
                }`}
              >
                {stage.icon}
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-mono text-[14px] font-bold tracking-widest uppercase ${
                    stage.active ? "text-cyan-100" : "text-slate-400"
                  }`}
                >
                  {stage.label}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 mt-1">
                  {stage.desc}
                </span>
              </div>
            </div>
          </div>
          {index < stages.length - 1 && (
            <div
              className={`font-mono text-2xl ${
                stage.active && stages[index + 1].active ? "text-cyan-400 animate-pulse" : "text-slate-700"
              }`}
            >
              →
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
