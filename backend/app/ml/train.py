"""Training loop runner for DQN offloading agent with reproducibility controls."""

import argparse
import csv
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import torch

from app.ml.config import DQNConfig, RewardWeights
from app.ml.environment import OffloadingEnvironment, ACTION_NAMES
from app.ml.agent import DQNAgent


def run_training_loop(
    config: Optional[DQNConfig] = None,
    weights: Optional[RewardWeights] = None,
    steps_per_episode: int = 25,
    save_history_dir: Optional[str] = None,
    cost_model: str = "v1",
) -> Dict[str, Any]:
    """Executes a fully reproducible DQN training loop across simulated task episodes.

    Args:
        config: DQN hyperparameters and seed.
        weights: Multi-objective reward component weights.
        steps_per_episode: Number of sequential task transitions per episode.
        save_history_dir: Optional directory to save training history JSON and CSV.
        cost_model: "v1" (original synthetic model) or "v2" (calibrated to measurements). Saved in
            the checkpoint, so inference uses the same model and input scaling.

    Returns:
        Structured training metrics including episode rewards, losses, action distributions,
        and saved checkpoint path.
    """
    config = config or DQNConfig()
    weights = weights or RewardWeights()

    env = OffloadingEnvironment(weights=weights, seed=config.seed, version=cost_model)
    agent = DQNAgent(config=config)

    start_time = time.time()
    episode_rewards: List[float] = []
    episode_losses: List[float] = []
    training_history: List[Dict[str, Any]] = []
    best_avg_reward = -float("inf")
    saved_checkpoint_path = ""

    # Pre-populate replay buffer with diverse initial transitions
    warmup_steps = max(config.batch_size * 2, 200)
    state = env.reset(seed=config.seed)
    for _ in range(warmup_steps):
        action = agent.select_action(state, evaluate=False)
        next_state, reward, done, _ = env.step(action)
        agent.replay_buffer.push(state, action, reward, next_state, done)
        state = next_state

    # Main Training Loop
    for episode in range(1, config.episodes + 1):
        state = env.reset()
        total_ep_reward = 0.0
        losses: List[float] = []
        action_counts = {0: 0, 1: 0, 2: 0}

        for _ in range(steps_per_episode):
            action = agent.select_action(state, evaluate=False)
            action_counts[action] = action_counts.get(action, 0) + 1
            next_state, reward, done, _ = env.step(action)

            agent.replay_buffer.push(state, action, reward, next_state, done)
            loss = agent.train_step()
            if loss is not None:
                losses.append(loss)

            total_ep_reward += reward
            state = next_state

        agent.decay_epsilon()
        avg_ep_reward = total_ep_reward / steps_per_episode
        episode_rewards.append(round(avg_ep_reward, 4))
        mean_loss = round(float(np.mean(losses)), 4) if losses else None
        if mean_loss is not None:
            episode_losses.append(mean_loss)

        ep_record = {
            "episode": episode,
            "cumulative_reward": round(total_ep_reward, 4),
            "average_reward": round(avg_ep_reward, 4),
            "loss": mean_loss,
            "epsilon": round(agent.epsilon, 4),
            "actions_local": action_counts[0],
            "actions_edge": action_counts[1],
            "actions_cloud": action_counts[2],
        }
        training_history.append(ep_record)

        # Checkpoint evaluation every 20 episodes
        if episode % 20 == 0 or episode == config.episodes:
            window = episode_rewards[-20:]
            rolling_avg = float(np.mean(window))
            if rolling_avg > best_avg_reward or saved_checkpoint_path == "":
                best_avg_reward = rolling_avg
                saved_checkpoint_path = agent.save_checkpoint(metadata={"cost_model_version": cost_model})

    elapsed_sec = round(time.time() - start_time, 2)

    # Save training history if directory specified
    if save_history_dir:
        out_path = Path(save_history_dir).resolve()
        out_path.mkdir(parents=True, exist_ok=True)

        json_file = out_path / "training_history.json"
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(training_history, f, indent=2)

        csv_file = out_path / "training_history.csv"
        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(training_history[0].keys()))
            writer.writeheader()
            writer.writerows(training_history)

    return {
        "status": "success",
        "episodes_trained": config.episodes,
        "seed": config.seed,
        "elapsed_seconds": elapsed_sec,
        "final_epsilon": round(agent.epsilon, 4),
        "replay_buffer_size": len(agent.replay_buffer),
        "initial_avg_reward": float(np.mean(episode_rewards[:20])) if len(episode_rewards) >= 20 else episode_rewards[0],
        "final_avg_reward": float(np.mean(episode_rewards[-20:])),
        "best_rolling_reward": round(best_avg_reward, 4),
        "checkpoint_saved": saved_checkpoint_path,
        "model_path": config.model_path,
        "cost_model_version": cost_model,
        "history": training_history,
    }


def main():
    parser = argparse.ArgumentParser(description="Train DQN Task Offloading Optimization Agent")
    parser.add_argument("--episodes", type=int, default=150, help="Number of training episodes")
    parser.add_argument("--seed", type=int, default=42, help="Random reproducibility seed")
    parser.add_argument("--lr", type=float, default=0.0005, help="Learning rate")
    parser.add_argument("--output", type=str, default="", help="Custom checkpoint output path")
    parser.add_argument("--history-dir", type=str, default="benchmarks/results", help="Directory to save history logs")
    parser.add_argument("--cost-model", choices=("v1", "v2"), default="v1", help="v2 = calibrated to measured detection times")
    parser.add_argument("--gamma", type=float, default=None, help="Discount factor (default: DQN_GAMMA or 0.95; v2 model uses 0.3)")
    args = parser.parse_args()

    cfg = DQNConfig(
        episodes=args.episodes,
        seed=args.seed,
        learning_rate=args.lr,
    )
    if args.gamma is not None:
        cfg.gamma = args.gamma
    if args.output:
        cfg.model_path = args.output

    print(f"=== Starting DQN Training (Episodes: {cfg.episodes}, Seed: {cfg.seed}) ===")
    results = run_training_loop(config=cfg, save_history_dir=args.history_dir, cost_model=args.cost_model)
    print(f"Training Complete in {results['elapsed_seconds']}s")
    print(f"Initial Avg Reward: {results['initial_avg_reward']:.4f} -> Final: {results['final_avg_reward']:.4f}")
    print(f"Model saved to: {results['checkpoint_saved']}")


if __name__ == "__main__":
    main()
