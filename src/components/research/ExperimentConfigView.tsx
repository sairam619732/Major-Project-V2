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
    { label: "Discount Factor (γ)", value: config?.gamma ?? 0.95 },
    { label: "Exploration (ε Schedule)", value: `Start ${config?.epsilon_start ?? 1.0} → Min ${config?.epsilon_end ?? 0.05} (decay ${config?.epsilon_decay ?? 0.985})` },
    { label: "Experience Replay Capacity", value: `${config?.replay_capacity?.toLocaleString() ?? "10,000"} transitions` },
    { label: "Batch Size / Target Sync", value: `${config?.batch_size ?? 64} / Every ${config?.target_update_frequency ?? 20} steps` },
  ];

  const evalParams = [
    { label: "Evaluation Random Seeds", value: `[${metadata.seeds.join(", ")}]` },
    { label: "Episodes per Seed", value: metadata.eval_episodes_per_seed },
    { label: "Total Evaluation Workloads", value: metadata.total_evaluation_samples },
    { label: "Total Policy Executions", value: metadata.total_eval_runs },
    { label: "Model Checkpoint Path", value: metadata.model_path },
    { label: "Benchmarking Wall Time", value: `${metadata.elapsed_seconds.toFixed(2)} seconds` },
  ];

  const weightParams = [
    { label: "Latency Penalty (w_L)", value: rw.weight_latency.toFixed(2) },
    { label: "Energy Penalty (w_E)", value: rw.weight_energy.toFixed(2) },
    { label: "Monetary Cost Penalty (w_C)", value: rw.weight_cost.toFixed(2) },
    { label: "Queue Congestion Penalty (w_Q)", value: rw.weight_queue.toFixed(2) },
    { label: "Deadline Violation Penalty (w_D)", value: rw.weight_deadline.toFixed(2) },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column 1: DQN Hyperparameters */}
      <div className="p-5 rounded-[2px] bg-white/[0.015] border border-white/[0.06] space-y-4">
        <h4 className="font-mono text-xs uppercase tracking-[0.18em] text-sky-400 font-semibold border-b border-white/[0.06] pb-2">
          DQN Hyperparameters
        </h4>
        <dl className="space-y-2.5 font-mono text-xs">
          {trainingParams.map((p) => (
            <div key={p.label} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
              <dt className="text-slate-400">{p.label}</dt>
              <dd className="text-slate-100 font-medium text-right">{p.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Column 2: Evaluation Setup */}
      <div className="p-5 rounded-[2px] bg-white/[0.015] border border-white/[0.06] space-y-4">
        <h4 className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400 font-semibold border-b border-white/[0.06] pb-2">
          Evaluation Protocol
        </h4>
        <dl className="space-y-2.5 font-mono text-xs">
          {evalParams.map((p) => (
            <div key={p.label} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
              <dt className="text-slate-400">{p.label}</dt>
              <dd className="text-slate-100 font-medium text-right">{p.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Column 3: Multi-Objective Weights */}
      <div className="p-5 rounded-[2px] bg-white/[0.015] border border-white/[0.06] space-y-4">
        <h4 className="font-mono text-xs uppercase tracking-[0.18em] text-purple-400 font-semibold border-b border-white/[0.06] pb-2">
          Objective Reward Weights
        </h4>
        <dl className="space-y-2.5 font-mono text-xs">
          {weightParams.map((p) => (
            <div key={p.label} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
              <dt className="text-slate-400">{p.label}</dt>
              <dd className="text-slate-100 font-medium text-right">{p.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] font-mono text-slate-500 pt-2 border-t border-white/[0.04]">
          R_t = -(0.35·T/200 + 0.25·E/0.5 + 0.15·C/0.5 + 0.10·P_queue + 0.15·P_deadline)
        </p>
      </div>
    </div>
  );
}
