"""Unit test suite for DQN algorithm, components, and baselines."""

import os
import tempfile
import numpy as np
import torch

from app.models.simulation import SimulationTaskInput
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState
from app.models.task import TaskPriority
from app.ml.config import DQNConfig, RewardWeights
from app.ml.network import QNetwork, compute_boltzmann_confidence
from app.ml.replay_buffer import ReplayBuffer
from app.ml.environment import state_to_vector, compute_action_metrics, normalize_priority
from app.ml.agent import DQNAgent
from app.ml.baselines import evaluate_baselines
from app.ml.inference import DQNInferenceService


def create_sample_state():
    task = SimulationTaskInput(
        task_id="TASK_TEST",
        task_type="OBJECT_DETECTION",
        data_size_mb=25.0,
        cpu_demand_percent=60.0,
        memory_demand_percent=40.0,
        deadline_ms=50.0,
        priority=3
    )
    local = LocalNodeState(cpu_available=70.0, memory_available=65.0, battery_level=80.0, base_latency=1.5)
    edge = EdgeNodeState(cpu_load=45.0, task_queue=3, network_latency=12.0, bandwidth=2.5)
    cloud = CloudNodeState(cpu_load=30.0, task_queue=6, network_latency=60.0, bandwidth=15.0)
    return task, local, edge, cloud


def test_state_to_vector_conversion():
    print("1. Testing State -> DQN Vector Conversion...")
    task, local, edge, cloud = create_sample_state()
    vec = state_to_vector(task, local, edge, cloud)

    assert isinstance(vec, np.ndarray), "State must be a numpy ndarray"
    assert vec.shape == (17,), f"Expected shape (17,), got {vec.shape}"
    assert np.all(vec >= 0.0) and np.all(vec <= 1.0), "All state features must be in [0.0, 1.0]"

    # Test edge values
    task_high = SimulationTaskInput(data_size_mb=200.0, cpu_demand_percent=100.0, memory_demand_percent=100.0, deadline_ms=800.0, priority=5)
    vec_high = state_to_vector(task_high, local, edge, cloud)
    assert vec_high[0] == 1.0, "Clamping failed on max data_size_mb"
    assert vec_high[3] == 1.0, "Clamping failed on max deadline"
    assert vec_high[4] == 1.0, "Priority 5 must normalize to 1.0"

    assert normalize_priority(TaskPriority.LOW) == 0.0
    assert normalize_priority(TaskPriority.CRITICAL) == 1.0
    print("   PASSED: 17-D State vector strictly normalized within [0.0, 1.0]")


def test_q_value_output_shape():
    print("2. Testing QNetwork Output Shape...")
    net = QNetwork(state_dim=17, action_dim=3)
    batch_4 = torch.rand(4, 17)
    out_4 = net(batch_4)
    assert out_4.shape == (4, 3), f"Expected (4, 3), got {out_4.shape}"

    single = torch.rand(1, 17)
    out_1 = net(single)
    assert out_1.shape == (1, 3), f"Expected (1, 3), got {out_1.shape}"
    print("   PASSED: Q-network output dimensions match action space (batch, 3)")


def test_action_selection():
    print("3. Testing Action Selection...")
    cfg = DQNConfig(seed=42, epsilon_start=1.0)
    agent = DQNAgent(config=cfg)
    vec = np.zeros(17, dtype=np.float32)

    # Random exploration
    actions = [agent.select_action(vec, evaluate=False) for _ in range(50)]
    assert all(a in [0, 1, 2] for a in actions), "Actions must be in {0, 1, 2}"
    assert len(set(actions)) > 1, "Random exploration should sample multiple actions"

    # Deterministic evaluation
    det_action_1 = agent.select_action(vec, evaluate=True)
    det_action_2 = agent.select_action(vec, evaluate=True)
    assert det_action_1 == det_action_2, "Deterministic evaluation must return consistent action"
    print("   PASSED: Actions in {0, 1, 2}, exploration and deterministic modes validated")


def test_replay_buffer():
    print("4. Testing Replay Buffer...")
    buffer = ReplayBuffer(capacity=50)
    for i in range(70):
        buffer.push(np.zeros(17), i % 3, float(i), np.ones(17), False)

    assert len(buffer) == 50, f"Expected capacity 50, got {len(buffer)}"
    states, actions, rewards, next_states, dones = buffer.sample(batch_size=16)

    assert states.shape == (16, 17)
    assert actions.shape == (16, 1)
    assert rewards.shape == (16, 1)
    assert next_states.shape == (16, 17)
    assert dones.shape == (16, 1)
    print("   PASSED: Replay buffer cyclic capacity and tensor sampling verified")


def test_bellman_update():
    print("5. Testing Bellman Update and Optimization Step...")
    cfg = DQNConfig(batch_size=10, learning_rate=0.001)
    agent = DQNAgent(config=cfg)

    # Push enough samples
    for i in range(25):
        s = np.random.rand(17).astype(np.float32)
        s_next = np.random.rand(17).astype(np.float32)
        agent.replay_buffer.push(s, i % 3, -0.5, s_next, False)

    loss = agent.train_step()
    assert loss is not None, "train_step should return a float loss"
    assert isinstance(loss, float) and loss >= 0.0, f"Invalid loss: {loss}"
    print(f"   PASSED: Bellman loss computed ({loss:.4f}) and gradient step executed")


def test_target_network_update():
    print("6. Testing Target Network Synchronization...")
    agent = DQNAgent()
    # Mutate online network weights
    with torch.no_grad():
        for param in agent.online_net.parameters():
            param.add_(1.0)

    # Target weights should differ before update
    diff = False
    for p_on, p_tar in zip(agent.online_net.parameters(), agent.target_net.parameters()):
        if not torch.allclose(p_on, p_tar):
            diff = True
            break
    assert diff, "Target network should differ from mutated online network"

    # Synchronize
    agent.update_target_network()
    for p_on, p_tar in zip(agent.online_net.parameters(), agent.target_net.parameters()):
        assert torch.allclose(p_on, p_tar), "Target network must match online network after sync"
    print("   PASSED: Target network synchronization verified")


def test_confidence_calculation():
    print("7. Testing Boltzmann Softmax Confidence...")
    # Equal Q-values -> confidence approaches 1/3 (0.3333)
    conf_equal, probs_equal = compute_boltzmann_confidence([5.0, 5.0, 5.0], temperature=1.0)
    assert abs(conf_equal - 0.3333) < 0.001, f"Expected 0.3333, got {conf_equal}"
    assert all(abs(p - 0.3333) < 0.001 for p in probs_equal)

    # Strongly dominant action -> confidence approaches 1.0
    conf_dom, probs_dom = compute_boltzmann_confidence([20.0, 1.0, 0.0], temperature=1.0)
    assert conf_dom > 0.99, f"Expected > 0.99 for dominant action, got {conf_dom}"
    assert probs_dom[0] == conf_dom
    print(f"   PASSED: Equal Q-values -> {conf_equal}; Dominant action -> {conf_dom}")


def test_model_save_and_load():
    print("8. Testing Model Save and Load Checkpoint...")
    with tempfile.TemporaryDirectory() as tmpdir:
        ckpt_path = os.path.join(tmpdir, "test_dqn.pt")
        cfg = DQNConfig(model_path=ckpt_path)
        agent1 = DQNAgent(config=cfg)

        saved = agent1.save_checkpoint(ckpt_path)
        assert os.path.exists(saved), "Checkpoint file was not created"

        agent2 = DQNAgent(config=cfg)
        loaded = agent2.load_checkpoint(ckpt_path)
        assert loaded is True, "Failed to load saved checkpoint"

        # Verify weights match
        for p1, p2 in zip(agent1.online_net.parameters(), agent2.online_net.parameters()):
            assert torch.allclose(p1, p2), "Loaded weights do not match saved weights"
    print("   PASSED: Checkpoint serialization and weight restoration verified")


def test_fallback_when_checkpoint_missing():
    print("9. Testing Fail-Safe Rule-Based Fallback When Checkpoint Missing...")
    cfg = DQNConfig(model_path="non_existent_model_checkpoint_99999.pt")
    service = DQNInferenceService(config=cfg)

    assert service.is_model_loaded is False, "Service should report model_loaded=False"
    task, local, edge, cloud = create_sample_state()

    result = service.predict(task, local, edge, cloud)
    assert result["is_fallback"] is True, "Must set is_fallback=True"
    assert result["method"] == "rule_based_fallback"
    assert result["decision"] in ["LOCAL", "EDGE", "CLOUD"]
    assert result["confidence"] == 0.3333, "Fallback must set equal confidence 0.3333"
    assert result["q_values"] == {"local": 0.0, "edge": 0.0, "cloud": 0.0}
    assert "metrics" in result
    print("   PASSED: Graceful fallback operates seamlessly without missing-file errors")


def test_baselines_evaluation():
    print("10. Testing Classical Baselines Evaluation...")
    task, local, edge, cloud = create_sample_state()
    vec = state_to_vector(task, local, edge, cloud)
    results = evaluate_baselines(task, local, edge, cloud, vec)

    assert "local_only" in results
    assert "edge_only" in results
    assert "cloud_only" in results
    assert "random" in results
    assert "rule_based_greedy" in results

    assert results["local_only"]["action"] == 0
    assert results["edge_only"]["action"] == 1
    assert results["cloud_only"]["action"] == 2
    assert results["random"]["action"] in [0, 1, 2]
    assert results["rule_based_greedy"]["action"] in [0, 1, 2]
    print("   PASSED: All 5 baselines evaluated cleanly on identical state")


def main():
    print("==================================================")
    print("RUNNING DQN UNIT TEST SUITE (PHASE 14B)")
    print("==================================================")
    test_state_to_vector_conversion()
    test_q_value_output_shape()
    test_action_selection()
    test_replay_buffer()
    test_bellman_update()
    test_target_network_update()
    test_confidence_calculation()
    test_model_save_and_load()
    test_fallback_when_checkpoint_missing()
    test_baselines_evaluation()
    print("==================================================")
    print("ALL 10 DQN UNIT TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    main()
