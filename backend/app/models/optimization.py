"""Pydantic schemas for DQN optimization, training, and benchmarking endpoints."""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.simulation import SimulationTaskInput
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState
from app.ml.config import RewardWeights


class OptimizationRequest(BaseModel):
    """Task and multi-tier environment inputs for DQN optimization."""

    task: SimulationTaskInput
    local: LocalNodeState
    edge: EdgeNodeState
    cloud: CloudNodeState
    weights: Optional[RewardWeights] = Field(default=None, description="Optional custom reward weights")
    temperature: Optional[float] = Field(default=1.0, ge=0.01, description="Softmax temperature for confidence")


class OptimizationDecisionMetrics(BaseModel):
    """Execution trade-off metrics computed for the selected target."""

    latency_ms: float
    energy_joules: float
    cost: float
    queue_penalty: float
    deadline_penalty: float
    reward: float
    feasible: bool


class OptimizationDecisionResponse(BaseModel):
    """Decision output returned by the DQN optimization engine."""

    decision: str = Field(..., description="Selected target ('LOCAL' | 'EDGE' | 'CLOUD')")
    action_index: int = Field(..., description="Action index (0=LOCAL, 1=EDGE, 2=CLOUD)")
    confidence: float = Field(..., description="Boltzmann Softmax confidence score [0.3333, 1.0]")
    q_values: Dict[str, float] = Field(..., description="Estimated Q-values for local, edge, and cloud")
    metrics: OptimizationDecisionMetrics
    method: str = Field(..., description="'dqn' if learned model was used, or 'rule_based_fallback'")
    is_fallback: bool
    model_path: Optional[str] = None
    note: Optional[str] = None


class TrainingRequest(BaseModel):
    """Configuration for triggering reproducible DQN training."""

    episodes: int = Field(default=100, ge=1, le=2000, description="Total training episodes")
    seed: int = Field(default=42, description="Reproducible random seed")
    learning_rate: float = Field(default=0.0005, gt=0.0, description="Optimizer learning rate")
    weights: Optional[RewardWeights] = Field(default=None, description="Reward formulation weights")


class TrainingResponse(BaseModel):
    """Summary of completed DQN training run."""

    status: str
    episodes_trained: int
    seed: int
    elapsed_seconds: float
    final_epsilon: float
    replay_buffer_size: int
    initial_avg_reward: float
    final_avg_reward: float
    best_rolling_reward: float
    checkpoint_saved: str
    model_path: str


class BaselineComparisonResponse(BaseModel):
    """Comparative benchmarking output across DQN and 5 classical baselines."""

    dqn: OptimizationDecisionResponse
    baselines: Dict[str, Dict[str, Any]]
