// Phase 16: Research Results & Benchmark Types
// Strictly mirrors Phase 15 empirical benchmark models and evaluation results

export interface MetricStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  ci_95: number;
  ci95?: number;
  sample_size?: number;
}

export interface PolicyActions {
  local_pct: number;
  edge_pct: number;
  cloud_pct: number;
  counts: {
    "0": number;
    "1": number;
    "2": number;
  };
}

export interface PolicyMetrics {
  latency_ms: MetricStats;
  energy_joules: MetricStats;
  cost: MetricStats;
  reward: MetricStats;
  queue_penalty?: MetricStats;
  deadline_penalty?: MetricStats;
}

export interface PolicySummary {
  samples: number;
  metrics: PolicyMetrics;
  action_distribution: PolicyActions;
  actions?: PolicyActions;
  success_rate_pct: number;
}

export interface ComparisonStats {
  baseline: string;
  latency_reduction_pct: number;
  energy_reduction_pct: number;
  cost_reduction_pct: number;
  reward_improvement: number;
  success_rate_diff_pct: number;
}

export interface TrainingEpisodeRecord {
  episode: number;
  cumulative_reward: number;
  average_reward: number;
  loss: number | null;
  epsilon: number;
  actions_local: number;
  actions_edge: number;
  actions_cloud: number;
}

export interface ExperimentMetadata {
  experiment: string;
  timestamp: string;
  seeds: number[];
  eval_episodes_per_seed: number;
  total_evaluation_samples: number;
  total_eval_runs: number;
  elapsed_seconds: number;
  model_path: string;
  model_loaded: boolean;
  reward_weights: {
    weight_latency: number;
    weight_energy: number;
    weight_cost: number;
    weight_queue: number;
    weight_deadline: number;
  };
}

export interface TrainingConfig {
  state_dim: number;
  action_dim: number;
  hidden_dims: number[];
  seed: number;
  episodes: number;
  learning_rate: number;
  gamma: number;
  epsilon_start: number;
  epsilon_end: number;
  epsilon_decay: number;
  batch_size: number;
  target_update_frequency: number;
  replay_capacity: number;
}

export interface BenchmarkReportData {
  metadata: ExperimentMetadata;
  policies: Record<string, PolicySummary>;
  comparisons: Record<string, ComparisonStats>;
  training_history?: TrainingEpisodeRecord[];
  training_config?: TrainingConfig;
  markdown_report?: string;
  dataSource?: "live_api" | "static_snapshot";
}
