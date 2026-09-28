"""Benchmark baseline policies for cloud-edge offloading comparison."""

import random
from typing import Dict, Any, List, Optional
import numpy as np
from app.models.simulation import SimulationTaskInput
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState
from app.ml.environment import compute_action_metrics, ACTION_NAMES
from app.ml.config import RewardWeights


class BasePolicy:
    """Abstract base class for offloading decision policies."""

    name: str = "BASE"

    def select_action(
        self,
        state: np.ndarray,
        task: SimulationTaskInput,
        local: LocalNodeState,
        edge: EdgeNodeState,
        cloud: CloudNodeState
    ) -> int:
        raise NotImplementedError


class LocalOnlyPolicy(BasePolicy):
    """Always assigns computation to the local client device (action 0)."""
    name: str = "LOCAL_ONLY"

    def select_action(self, *args, **kwargs) -> int:
        return 0


class EdgeOnlyPolicy(BasePolicy):
    """Always offloads computation to intermediate edge server (action 1)."""
    name: str = "EDGE_ONLY"

    def select_action(self, *args, **kwargs) -> int:
        return 1


class CloudOnlyPolicy(BasePolicy):
    """Always offloads computation to remote cloud datacenter cluster (action 2)."""
    name: str = "CLOUD_ONLY"

    def select_action(self, *args, **kwargs) -> int:
        return 2


class RandomPolicy(BasePolicy):
    """Selects an execution target uniformly at random."""
    name: str = "RANDOM"

    def __init__(self, seed: Optional[int] = None):
        self.rng = random.Random(seed) if seed is not None else random.Random()

    def select_action(self, *args, **kwargs) -> int:
        return self.rng.choice([0, 1, 2])


class RuleBasedGreedyPolicy(BasePolicy):
    """Evaluates static multi-criteria cost and picks the minimum-cost action."""
    name: str = "RULE_BASED_GREEDY"

    def select_action(
        self,
        state: np.ndarray,
        task: SimulationTaskInput,
        local: LocalNodeState,
        edge: EdgeNodeState,
        cloud: CloudNodeState,
        weights: Optional[RewardWeights] = None
    ) -> int:
        best_action = 0
        best_reward = -float("inf")

        for a in [0, 1, 2]:
            metrics = compute_action_metrics(task, local, edge, cloud, a, weights)
            if metrics["reward"] > best_reward:
                best_reward = metrics["reward"]
                best_action = a

        return best_action


def evaluate_baselines(
    task: SimulationTaskInput,
    local: LocalNodeState,
    edge: EdgeNodeState,
    cloud: CloudNodeState,
    state_vec: np.ndarray,
    weights: Optional[RewardWeights] = None
) -> Dict[str, Dict[str, Any]]:
    """Evaluates all 5 classical baselines on identical task and environment inputs."""
    baselines: List[BasePolicy] = [
        LocalOnlyPolicy(),
        EdgeOnlyPolicy(),
        CloudOnlyPolicy(),
        RandomPolicy(seed=42),
        RuleBasedGreedyPolicy(),
    ]

    results: Dict[str, Dict[str, Any]] = {}
    for policy in baselines:
        act = policy.select_action(state_vec, task, local, edge, cloud)
        metrics = compute_action_metrics(task, local, edge, cloud, act, weights)
        results[policy.name.lower()] = {
            "policy_name": policy.name,
            "action": act,
            "action_name": ACTION_NAMES.get(act, "UNKNOWN"),
            "latency_ms": metrics["latency_ms"],
            "energy_joules": metrics["energy_joules"],
            "cost": metrics["cost"],
            "reward": metrics["reward"],
            "feasible": metrics["feasible"],
        }

    return results
