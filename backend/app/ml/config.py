"""Configuration and hyperparameter models for DQN and multi-objective rewards."""

import os
from pydantic import BaseModel, Field


class RewardWeights(BaseModel):
    """Multi-objective reward weights controlling optimization priorities."""

    weight_latency: float = Field(
        default=float(os.getenv("REWARD_WEIGHT_LATENCY", "0.35")),
        ge=0.0,
        le=1.0,
        description="Weight given to minimizing execution and network delay"
    )
    weight_energy: float = Field(
        default=float(os.getenv("REWARD_WEIGHT_ENERGY", "0.25")),
        ge=0.0,
        le=1.0,
        description="Weight given to mobile device battery / energy conservation"
    )
    weight_cost: float = Field(
        default=float(os.getenv("REWARD_WEIGHT_COST", "0.15")),
        ge=0.0,
        le=1.0,
        description="Weight given to edge/cloud infrastructure compute cost"
    )
    weight_queue: float = Field(
        default=float(os.getenv("REWARD_WEIGHT_QUEUE", "0.10")),
        ge=0.0,
        le=1.0,
        description="Weight given to load balancing and queue avoidance"
    )
    weight_deadline: float = Field(
        default=float(os.getenv("REWARD_WEIGHT_DEADLINE", "0.15")),
        ge=0.0,
        le=1.0,
        description="Penalty weight for exceeding task completion deadline"
    )


class DQNConfig(BaseModel):
    """Deep Q-Network hyperparameters with reproducibility controls."""

    state_dim: int = Field(default=17, description="Dimension of normalized environment state vector")
    action_dim: int = Field(default=3, description="Count of discrete offloading actions (0=LOCAL, 1=EDGE, 2=CLOUD)")
    hidden_dims: list[int] = Field(default=[128, 128, 64], description="Hidden layer widths")

    seed: int = Field(
        default=int(os.getenv("DQN_SEED", "42")),
        description="Reproducible random seed"
    )
    episodes: int = Field(
        default=int(os.getenv("DQN_EPISODES", "200")),
        ge=1,
        description="Total training episodes"
    )
    learning_rate: float = Field(
        default=float(os.getenv("DQN_LEARNING_RATE", "0.0005")),
        gt=0.0,
        description="Adam optimizer learning rate"
    )
    gamma: float = Field(
        default=float(os.getenv("DQN_GAMMA", "0.95")),
        ge=0.0,
        le=1.0,
        description="Discount factor for Bellman target estimation"
    )
    epsilon_start: float = Field(
        default=float(os.getenv("DQN_EPSILON_START", "1.0")),
        ge=0.0,
        le=1.0,
        description="Initial exploration rate"
    )
    epsilon_end: float = Field(
        default=float(os.getenv("DQN_EPSILON_END", "0.05")),
        ge=0.0,
        le=1.0,
        description="Minimum exploration rate floor"
    )
    epsilon_decay: float = Field(
        default=float(os.getenv("DQN_EPSILON_DECAY", "0.99")),
        gt=0.0,
        le=1.0,
        description="Multiplicative decay factor per episode"
    )
    batch_size: int = Field(
        default=int(os.getenv("DQN_BATCH_SIZE", "64")),
        ge=1,
        description="Batch size sampled from replay buffer"
    )
    target_update_frequency: int = Field(
        default=int(os.getenv("DQN_TARGET_UPDATE_FREQUENCY", "20")),
        ge=1,
        description="Steps between synchronizing target network with online network"
    )
    replay_capacity: int = Field(
        default=int(os.getenv("DQN_REPLAY_CAPACITY", "10000")),
        ge=100,
        description="Maximum capacity of circular experience replay buffer"
    )
    model_path: str = Field(
        default=os.getenv("DQN_MODEL_PATH", "app/ml/checkpoints/dqn_offloading_best.pt"),
        description="Filesystem path for persisting best model checkpoint"
    )
