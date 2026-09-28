"""Deep Q-Network (DQN) Neural Network Architecture and Boltzmann Confidence."""

from typing import Tuple, List, Union
import numpy as np
import torch
import torch.nn as nn


class QNetwork(nn.Module):
    """Deep Q-Network mapping 17-dimensional state vector to 3 action Q-values."""

    def __init__(self, state_dim: int = 17, action_dim: int = 3, hidden_dims: List[int] = None):
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [128, 128, 64]

        layers: List[nn.Module] = []
        in_dim = state_dim

        # Input to first hidden layer with LayerNorm for gradient stability
        layers.append(nn.Linear(in_dim, hidden_dims[0]))
        layers.append(nn.LayerNorm(hidden_dims[0]))
        layers.append(nn.ReLU())

        # Intermediate hidden layers
        for i in range(len(hidden_dims) - 1):
            layers.append(nn.Linear(hidden_dims[i], hidden_dims[i + 1]))
            layers.append(nn.ReLU())

        # Output layer producing Q(s, a) for all 3 discrete offloading targets
        layers.append(nn.Linear(hidden_dims[-1], action_dim))

        self.net = nn.Sequential(*layers)

    def forward(self, state: torch.Tensor) -> torch.Tensor:
        """Forward pass estimating Q-values for LOCAL (0), EDGE (1), and CLOUD (2)."""
        return self.net(state)


def compute_boltzmann_confidence(
    q_values: Union[np.ndarray, torch.Tensor, List[float]],
    temperature: float = 1.0
) -> Tuple[float, List[float]]:
    """Calculates action confidence using the Boltzmann Softmax distribution over Q-values.

    Formula:
        P(a | s) = exp(Q(s, a) / tau) / sum_j exp(Q(s, j) / tau)
        confidence = max_a P(a | s)

    Guarantees:
        - When all Q-values are equal: confidence = 1/3 (0.3333...)
        - When one action strongly dominates: confidence -> 1.0
        - Completely deterministic, non-arbitrary, and mathematically grounded.
    """
    if isinstance(q_values, torch.Tensor):
        q_arr = q_values.detach().cpu().numpy().flatten()
    elif isinstance(q_values, list):
        q_arr = np.array(q_values, dtype=np.float32)
    else:
        q_arr = np.asarray(q_values, dtype=np.float32).flatten()

    tau = max(1e-4, float(temperature))
    # Subtract max for numerical stability (prevents overflow in exp)
    shifted_q = (q_arr - np.max(q_arr)) / tau
    exp_q = np.exp(shifted_q)
    sum_exp = np.sum(exp_q)

    if sum_exp == 0 or np.isnan(sum_exp):
        probs = np.full_like(q_arr, 1.0 / len(q_arr))
    else:
        probs = exp_q / sum_exp

    confidence = float(np.max(probs))
    return round(confidence, 4), [round(float(p), 4) for p in probs]
