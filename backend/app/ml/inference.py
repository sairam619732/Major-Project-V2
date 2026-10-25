"""Production inference service with automatic rule-based fallback."""

from typing import Dict, Any, Optional
import numpy as np
import torch

from app.models.simulation import SimulationTaskInput
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState
from app.ml.config import DQNConfig, RewardWeights
from app.ml.agent import DQNAgent
from app.ml.environment import state_to_vector, compute_action_metrics, ACTION_NAMES, set_cost_model
from app.ml.baselines import RuleBasedGreedyPolicy


class DQNInferenceService:
    """Singleton inference manager for Deep Q-Network offloading decisions.

    Guarantees:
        - If model checkpoint exists: Uses trained PyTorch neural network and Boltzmann confidence.
        - If model checkpoint is absent: Automatically defaults to validated rule-based baseline.
        - NEVER throws an unhandled exception or crashes the API due to a missing checkpoint.
    """

    def __init__(self, config: Optional[DQNConfig] = None):
        self.config = config or DQNConfig()
        # Force CPU device for portable, deterministic production execution
        self.device = torch.device("cpu")
        self.agent = DQNAgent(config=self.config, device=self.device)
        self.fallback_policy = RuleBasedGreedyPolicy()
        self.is_model_loaded = self._validate_and_load_checkpoint()

    def _validate_and_load_checkpoint(self) -> bool:
        """Loads and validates model checkpoint dimensions and network weights."""
        success = self.agent.load_checkpoint()
        if not success:
            return False
        # Use the cost model and input scaling this checkpoint was trained with (v1 for older ones).
        self.cost_model_version = getattr(self.agent, "checkpoint_meta", {}).get("cost_model_version", "v1")
        set_cost_model(self.cost_model_version)

        # Put networks explicitly into inference evaluation mode
        self.agent.online_net.eval()
        self.agent.target_net.eval()

        # Sanity check forward pass with dummy 17-D zero tensor
        try:
            with torch.no_grad():
                dummy_input = torch.zeros((1, self.config.state_dim), dtype=torch.float32, device=self.device)
                dummy_output = self.agent.online_net(dummy_input)
                if dummy_output.shape != (1, self.config.action_dim):
                    return False
            return True
        except Exception:
            return False

    def reload(self) -> bool:
        """Attempts to reload model checkpoint from disk with validation."""
        self.is_model_loaded = self._validate_and_load_checkpoint()
        return self.is_model_loaded

    def predict(
        self,
        task: SimulationTaskInput,
        local: LocalNodeState,
        edge: EdgeNodeState,
        cloud: CloudNodeState,
        weights: Optional[RewardWeights] = None,
        temperature: float = 1.0
    ) -> Dict[str, Any]:
        """Performs deterministic offloading decision inference for a task given current system telemetry."""
        state_vec = state_to_vector(task, local, edge, cloud)
        weights = weights or RewardWeights()

        if self.is_model_loaded:
            try:
                # Ensure evaluation mode (no dropout, deterministic layers, no gradient tracking)
                self.agent.online_net.eval()
                action, action_name, q_dict, confidence = self.agent.select_action_with_confidence(
                    state_vec,
                    temperature=temperature
                )
                metrics = compute_action_metrics(task, local, edge, cloud, action, weights)
                return {
                    "decision": action_name,
                    "action_index": action,
                    "confidence": confidence,
                    "q_values": q_dict,
                    "metrics": {
                        "latency_ms": metrics["latency_ms"],
                        "energy_joules": metrics["energy_joules"],
                        "cost": metrics["cost"],
                        "queue_penalty": metrics["queue_penalty"],
                        "deadline_penalty": metrics["deadline_penalty"],
                        "reward": metrics["reward"],
                        "feasible": metrics["feasible"],
                    },
                    "method": "dqn",
                    "is_fallback": False,
                    "model_path": self.config.model_path,
                    "note": None,
                }
            except Exception as e:
                # In case of runtime tensor exception, fall through safely to rule-based fallback
                pass

        # FAIL-SAFE: Graceful fallback to rule-based greedy baseline
        action = self.fallback_policy.select_action(
            state_vec,
            task,
            local,
            edge,
            cloud,
            weights=weights
        )
        action_name = ACTION_NAMES.get(action, "UNKNOWN")
        metrics = compute_action_metrics(task, local, edge, cloud, action, weights)

        # In fallback mode without a trained neural net, Q-values are uninitialized (equal),
        # so confidence strictly evaluates to 1/3 (0.3333) as required by specifications.
        return {
            "decision": action_name,
            "action_index": action,
            "confidence": 0.3333,
            "q_values": {
                "local": 0.0,
                "edge": 0.0,
                "cloud": 0.0,
            },
            "metrics": {
                "latency_ms": metrics["latency_ms"],
                "energy_joules": metrics["energy_joules"],
                "cost": metrics["cost"],
                "queue_penalty": metrics["queue_penalty"],
                "deadline_penalty": metrics["deadline_penalty"],
                "reward": metrics["reward"],
                "feasible": metrics["feasible"],
            },
            "method": "rule_based_fallback",
            "is_fallback": True,
            "model_path": self.config.model_path if self.is_model_loaded else None,
            "note": "DQN checkpoint not found or inference exception; operating in validated deterministic rule-based fallback mode.",
        }


# Global singleton instance for FastAPI application lifecycle
inference_service = DQNInferenceService()

