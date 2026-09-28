"""Deep Q-Network Agent orchestrating online and target networks."""

import os
import random
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from app.ml.config import DQNConfig
from app.ml.network import QNetwork, compute_boltzmann_confidence
from app.ml.replay_buffer import ReplayBuffer
from app.ml.environment import ACTION_NAMES


class DQNAgent:
    """Reinforcement learning agent using Deep Q-Networks for offloading optimization."""

    def __init__(self, config: Optional[DQNConfig] = None, device: Optional[torch.device] = None):
        self.config = config or DQNConfig()
        self.device = device or torch.device("cpu")

        # Set reproducible seeds
        self._set_seed(self.config.seed)

        # Networks
        self.online_net = QNetwork(
            state_dim=self.config.state_dim,
            action_dim=self.config.action_dim,
            hidden_dims=self.config.hidden_dims
        ).to(self.device)

        self.target_net = QNetwork(
            state_dim=self.config.state_dim,
            action_dim=self.config.action_dim,
            hidden_dims=self.config.hidden_dims
        ).to(self.device)

        # Synchronize target network weights with online network
        self.update_target_network()
        self.target_net.eval()

        # Training infrastructure
        self.optimizer = optim.Adam(self.online_net.parameters(), lr=self.config.learning_rate)
        self.loss_fn = nn.SmoothL1Loss()  # Huber loss
        self.replay_buffer = ReplayBuffer(capacity=self.config.replay_capacity)

        # Epsilon-greedy schedule
        self.epsilon = self.config.epsilon_start
        self.total_steps = 0

    def _set_seed(self, seed: int) -> None:
        """Sets deterministic random seed across random, numpy, and torch."""
        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)

    def select_action(self, state: np.ndarray, evaluate: bool = False) -> int:
        """Selects an action using epsilon-greedy exploration or deterministic greedy exploitation."""
        if not evaluate and random.random() < self.epsilon:
            return random.randint(0, self.config.action_dim - 1)

        state_t = torch.tensor(state, dtype=torch.float32, device=self.device).unsqueeze(0)
        with torch.no_grad():
            q_values = self.online_net(state_t)
            action = int(torch.argmax(q_values, dim=1).item())
        return action

    def select_action_with_confidence(
        self,
        state: np.ndarray,
        temperature: float = 1.0
    ) -> Tuple[int, str, Dict[str, float], float]:
        """Deterministic inference returning chosen action, Q-values, and Boltzmann confidence."""
        self.online_net.eval()
        state_t = torch.tensor(state, dtype=torch.float32, device=self.device).unsqueeze(0)

        with torch.no_grad():
            q_values_t = self.online_net(state_t)[0]
            action = int(torch.argmax(q_values_t).item())
            q_list = [round(float(q), 4) for q in q_values_t.cpu().numpy()]

        confidence, _ = compute_boltzmann_confidence(q_list, temperature=temperature)
        q_dict = {
            "local": q_list[0],
            "edge": q_list[1],
            "cloud": q_list[2],
        }
        action_name = ACTION_NAMES.get(action, "UNKNOWN")

        return action, action_name, q_dict, confidence

    def decay_epsilon(self) -> None:
        """Decays exploration parameter epsilon after each training episode."""
        self.epsilon = max(self.config.epsilon_end, self.epsilon * self.config.epsilon_decay)

    def update_target_network(self) -> None:
        """Copies weights from online network to target network."""
        self.target_net.load_state_dict(self.online_net.state_dict())

    def train_step(self) -> Optional[float]:
        """Samples a mini-batch from experience replay and performs one gradient step."""
        if len(self.replay_buffer) < self.config.batch_size:
            return None

        self.online_net.train()
        states, actions, rewards, next_states, dones = self.replay_buffer.sample(
            self.config.batch_size,
            device=self.device
        )

        # Current estimated Q-values: Q(s, a; theta)
        current_q = self.online_net(states).gather(1, actions)

        # Bellman target: y = r + gamma * max_a' Q(s', a'; theta^-) * (1 - done)
        with torch.no_grad():
            next_q = self.target_net(next_states).max(1)[0].unsqueeze(1)
            target_q = rewards + (1.0 - dones) * self.config.gamma * next_q

        loss = self.loss_fn(current_q, target_q)

        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.online_net.parameters(), max_norm=1.0)
        self.optimizer.step()

        self.total_steps += 1
        if self.total_steps % self.config.target_update_frequency == 0:
            self.update_target_network()

        return float(loss.item())

    def save_checkpoint(self, path: Optional[str] = None) -> str:
        """Saves model checkpoint weights and configuration state."""
        save_path = path or self.config.model_path
        p = Path(save_path).resolve()
        p.parent.mkdir(parents=True, exist_ok=True)

        checkpoint = {
            "model_state_dict": self.online_net.state_dict(),
            "target_state_dict": self.target_net.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "config": self.config.model_dump(),
            "epsilon": self.epsilon,
            "total_steps": self.total_steps,
        }
        torch.save(checkpoint, str(p))
        return str(p)

    def load_checkpoint(self, path: Optional[str] = None) -> bool:
        """Loads model checkpoint weights. Returns True if loaded, False if not found."""
        load_path = path or self.config.model_path
        p = Path(load_path).resolve()
        if not p.exists() or not p.is_file():
            return False

        try:
            checkpoint = torch.load(str(p), map_location=self.device, weights_only=False)
            self.online_net.load_state_dict(checkpoint["model_state_dict"])
            self.target_net.load_state_dict(checkpoint["target_state_dict"])
            if "optimizer_state_dict" in checkpoint:
                self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
            if "epsilon" in checkpoint:
                self.epsilon = checkpoint["epsilon"]
            if "total_steps" in checkpoint:
                self.total_steps = checkpoint["total_steps"]
            self.target_net.eval()
            return True
        except Exception:
            return False
