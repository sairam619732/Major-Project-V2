"use client";

import type { SimulationExecutionResult } from "@/services/apiClient";

/**
 * Where a task was meant to run and where it really ran: the DQN's own choice, the tier that
 * executed it, the hardware used (GPU only when the GPU really ran it) and any fallback notes.
 */
export function ExecutionRouting({ details }: { details: SimulationExecutionResult }) {
  if (!details.executed_on) return null;
  const fellBack = details.dqn_decision && details.dqn_decision !== details.executed_on;
  return (
    <div className="basis-full flex flex-col gap-1 font-mono text-[10.5px] leading-relaxed">
      <p className="text-slate-300">
        DQN chose <b className="text-cyan-300">{details.dqn_decision ?? "—"}</b> · ran on{" "}
        <b className={fellBack ? "text-amber-300" : "text-emerald-300"}>{details.executed_on}</b>
        {details.accelerator && (
          <>
            {" "}
            · <b className={details.accelerator.startsWith("GPU") ? "text-violet-300" : "text-slate-200"}>{details.accelerator}</b>
          </>
        )}
      </p>
      {details.routing_notes && details.routing_notes.length > 0 && (
        <p className="text-amber-200/80">{details.routing_notes.join(" ")}</p>
      )}
    </div>
  );
}
