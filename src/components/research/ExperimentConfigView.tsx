"use client";

import React from "react";
import { ExperimentMetadata, TrainingConfig } from "@/types/benchmark";

interface ExperimentConfigViewProps {
  metadata: ExperimentMetadata;
  config?: TrainingConfig;
}

export function ExperimentConfigView({ metadata, config }: ExperimentConfigViewProps) {
  const rw = metadata.reward_weights;

  const trainingParams = [
    { label: "Training Episodes", value: config?.episodes ?? 200 },
    { label: "State Vector Dimension", value: `${config?.state_dim ?? 17} features` },
    { label: "Action Dimension", value: `${config?.action_dim ?? 3} discrete tiers` },
    { label: "Neural Architecture", value: `Dense [${(config?.hidden_dims ?? [128, 128, 64]).join(" → ")}]` },
    { label: "Optimizer / Learning Rate", value: `Adam (α = ${config?.learning_rate ?? 0.0005})` },
    { label: "Discount Factor (γ)", value: `${config?.gamma ?? 0.95}` },
    {
      label: "Exploration (ε Schedule)",
      value: `Start ${config?.epsilon_start ?? 1.0} → Min ${config?.epsilon_end ?? 0.05} (decay ${config?.epsilon_decay ?? 0.985})`,
    },
    {
      label: "Experience Replay Capacity",
      value: `${config?.replay_capacity?.toLocaleString() ?? "10,000"} transitions`,
    },
    {
      label: "Batch Size / Target Sync",
      value: `${config?.batch_size ?? 64} / Every ${config?.target_update_frequency ?? 20} steps`,
    },
  ];

  const evalParams = [
    { label: "Evaluation Random Seeds", value: `[${metadata.seeds.join(", ")}]` },
    { label: "Episodes per Seed", value: `${metadata.eval_episodes_per_seed}` },
    { label: "Total Evaluation Workloads", value: `${metadata.total_evaluation_samples}` },
    { label: "Total Policy Executions", value: `${metadata.total_eval_runs.toLocaleString()}` },
    { label: "Model Checkpoint Path", value: metadata.model_path },
    { label: "Benchmarking Wall Time", value: `${metadata.elapsed_seconds.toFixed(2)} seconds` },
  ];

  const weightParams = [
    { label: "Latency Penalty (w_L)", value: rw.weight_latency.toFixed(2), note: "Normalized by T_max = 200ms" },
    { label: "Energy Penalty (w_E)", value: rw.weight_energy.toFixed(2), note: "Normalized by E_max = 0.5J" },
    { label: "Monetary Cost Penalty (w_C)", value: rw.weight_cost.toFixed(2), note: "Normalized by C_max = $0.50" },
    { label: "Queue Congestion Penalty (w_Q)", value: rw.weight_queue.toFixed(2), note: "Queue length backlog penalty" },
    { label: "Deadline Violation Penalty (w_D)", value: rw.weight_deadline.toFixed(2), note: "SLA timeout breach penalty" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Group 1: DQN Hyperparameters */}
      <div className="p-7 sm:p-8 rounded-[2px] bg-white/[0.015] border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/[0.06]">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              DQN HYPERPARAMETERS
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>

          <dl className="space-y-4 font-mono text-xs">
            {trainingParams.map((p) => (
              <div
                key={p.label}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 py-1 border-b border-white/[0.02]"
              >
                <dt className="text-slate-400 text-[11px] sm:text-xs">{p.label}</dt>
                <dd className="text-slate-100 font-medium text-left sm:text-right text-[11px] sm:text-xs">
                  {p.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 pt-4 border-t border-white/[0.04] font-mono text-[10px] text-slate-500">
          PyTorch neural policy trained with experience replay and Bellman Q-loss.
        </div>
      </div>

      {/* Group 2: Evaluation Protocol */}
      <div className="p-7 sm:p-8 rounded-[2px] bg-white/[0.015] border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/[0.06]">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400 font-semibold">
              EVALUATION PROTOCOL
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>

          <dl className="space-y-4 font-mono text-xs">
            {evalParams.map((p) => (
              <div
                key={p.label}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 py-1 border-b border-white/[0.02]"
              >
                <dt className="text-slate-400 text-[11px] sm:text-xs">{p.label}</dt>
                <dd className="text-slate-100 font-medium text-left sm:text-right text-[11px] sm:text-xs truncate max-w-[200px]" title={p.value}>
                  {p.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 pt-4 border-t border-white/[0.04] font-mono text-[10px] text-slate-500">
          Deterministic random seeds ensure exact cross-policy comparison reproducibility.
        </div>
      </div>

      {/* Group 3: Objective Reward Weights */}
      <div className="p-7 sm:p-8 rounded-[2px] bg-white/[0.015] border border-white/[0.08] hover:border-purple-500/30 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/[0.06]">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold">
              OBJECTIVE REWARD WEIGHTS
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
          </div>

          <dl className="space-y-4 font-mono text-xs">
            {weightParams.map((p) => (
              <div
                key={p.label}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 py-1 border-b border-white/[0.02]"
              >
                <div>
                  <dt className="text-slate-300 text-[11px] sm:text-xs">{p.label}</dt>
                  <span className="text-[10px] text-slate-500 block">{p.note}</span>
                </div>
                <dd className="text-purple-300 font-semibold text-left sm:text-right text-sm">
                  {p.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 pt-4 border-t border-white/[0.04] space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block">
            Scalarized Loss Formulation:
          </span>
          <div className="p-3 rounded bg-black/40 border border-white/[0.04] text-[10px] font-mono text-purple-200/90 leading-relaxed overflow-x-auto">
            <code>R_t = -(0.35·T/200 + 0.25·E/0.5 + 0.15·C/0.5 + 0.10·P_queue + 0.15·P_deadline)</code>
          </div>
        </div>
      </div>
    </div>
  );
}
