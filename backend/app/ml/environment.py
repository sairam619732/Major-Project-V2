"""Markov Decision Process (MDP) Simulation Environment for Offloading.

Two cost models live here:
  v1  the original synthetic model the first DQN was trained on (kept unchanged; the teammates'
      dataset generator pins it so their data stays reproducible).
  v2  calibrated to real measurements: detection time per tier fitted to timings of the real
      detector (app/ml/calibration.py), network transfer in correct units (v1 computed it in
      seconds but added it as milliseconds), the measured latency used as a round trip, and
      training ranges that match the deployed system (0.1-100 MB tasks, 2-1000 Mbps links).
The active version follows the loaded DQN checkpoint (set_cost_model); callers can pin one.
"""

import random
from typing import Dict, Any, Tuple
import numpy as np
from app.models.simulation import SimulationTaskInput
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState
from app.models.task import TaskPriority
from app.ml.config import RewardWeights
from app.ml import calibration


ACTION_NAMES = {
    0: "LOCAL",
    1: "EDGE",
    2: "CLOUD",
}


COST_MODEL_VERSIONS = ("v1", "v2")
_active = {"version": "v1"}


def set_cost_model(version: str) -> None:
    """Selects the cost model / input scaling used by default (follows the loaded checkpoint)."""
    if version not in COST_MODEL_VERSIONS:
        raise ValueError(f"Unknown cost model {version!r}")
    _active["version"] = version


def active_cost_model() -> str:
    return _active["version"]


def _version(version: str = None) -> str:
    return version or _active["version"]


def normalize_priority(priority: Any) -> float:
    """Converts priority (int 1-5 or enum) to normalized [0.0, 1.0]."""
    if isinstance(priority, int) or (isinstance(priority, float) and priority.is_integer()):
        p_val = float(priority)
        return float(np.clip((p_val - 1.0) / 4.0, 0.0, 1.0))
    if isinstance(priority, (TaskPriority, str)):
        str_val = str(priority).lower().replace("taskpriority.", "")
        mapping = {"low": 0.0, "medium": 0.5, "high": 0.75, "critical": 1.0}
        return mapping.get(str_val, 0.5)
    return 0.5


def state_to_vector(
    task: SimulationTaskInput,
    local: LocalNodeState,
    edge: EdgeNodeState,
    cloud: CloudNodeState,
    version: str = None,
) -> np.ndarray:
    """Transforms domain models into a normalized 17-dimensional feature vector (scaling per cost model)."""
    if _version(version) == "v2":
        return _state_v2(task, local, edge, cloud)
    return _state_v1(task, local, edge, cloud)


def _state_v1(task, local, edge, cloud) -> np.ndarray:
    """Original scaling: each metric maps to [0.0, 1.0] per the Phase 14A specification."""
    v = np.zeros(17, dtype=np.float32)

    # Task metrics (indices 0 to 4)
    v[0] = np.clip(task.data_size_mb / 100.0, 0.0, 1.0)
    v[1] = np.clip(task.cpu_demand_percent / 100.0, 0.0, 1.0)
    v[2] = np.clip(task.memory_demand_percent / 100.0, 0.0, 1.0)
    v[3] = np.clip(task.deadline_ms / 500.0, 0.0, 1.0)
    v[4] = normalize_priority(task.priority)

    # Local Device metrics (indices 5 to 8)
    v[5] = np.clip(local.cpu_available / 100.0, 0.0, 1.0)
    v[6] = np.clip(local.memory_available / 100.0, 0.0, 1.0)
    v[7] = np.clip(local.battery_level / 100.0, 0.0, 1.0)
    v[8] = np.clip(local.base_latency / 50.0, 0.0, 1.0)

    # Edge Server metrics (indices 9 to 12)
    v[9] = np.clip(edge.cpu_load / 100.0, 0.0, 1.0)
    v[10] = np.clip(edge.task_queue / 40.0, 0.0, 1.0)
    v[11] = np.clip(edge.network_latency / 100.0, 0.0, 1.0)
    v[12] = np.clip(edge.bandwidth / 40.0, 0.0, 1.0)

    # Cloud Datacenter metrics (indices 13 to 16)
    v[13] = np.clip(cloud.cpu_load / 100.0, 0.0, 1.0)
    v[14] = np.clip(cloud.task_queue / 30.0, 0.0, 1.0)
    v[15] = np.clip(cloud.network_latency / 300.0, 0.0, 1.0)
    v[16] = np.clip(cloud.bandwidth / 80.0, 0.0, 1.0)

    return v


def _log_scale(value: float, low: float, high: float) -> float:
    """log10(value) mapped from [low, high] to [0, 1], clipped."""
    value = max(float(value), 1e-9)
    return float(np.clip((np.log10(value) - np.log10(low)) / (np.log10(high) - np.log10(low)), 0.0, 1.0))


def _state_v2(task, local, edge, cloud) -> np.ndarray:
    """Scaling for the real system: log scales for sizes, deadlines and bandwidths that span decades."""
    v = np.zeros(17, dtype=np.float32)
    v[0] = _log_scale(task.data_size_mb, 0.1, 100.0)
    v[1] = np.clip(task.cpu_demand_percent / 100.0, 0.0, 1.0)
    v[2] = np.clip(task.memory_demand_percent / 100.0, 0.0, 1.0)
    v[3] = _log_scale(task.deadline_ms, 10.0, 5000.0)
    v[4] = normalize_priority(task.priority)
    v[5] = np.clip(local.cpu_available / 100.0, 0.0, 1.0)
    v[6] = np.clip(local.memory_available / 100.0, 0.0, 1.0)
    v[7] = np.clip(local.battery_level / 100.0, 0.0, 1.0)
    v[8] = np.clip(local.base_latency / 50.0, 0.0, 1.0)
    v[9] = np.clip(edge.cpu_load / 100.0, 0.0, 1.0)
    v[10] = np.clip(edge.task_queue / 16.0, 0.0, 1.0)
    v[11] = np.clip(edge.network_latency / 300.0, 0.0, 1.0)
    v[12] = _log_scale(edge.bandwidth, 0.001, 1.0)
    v[13] = np.clip(cloud.cpu_load / 100.0, 0.0, 1.0)
    v[14] = np.clip(cloud.task_queue / 16.0, 0.0, 1.0)
    v[15] = np.clip(cloud.network_latency / 300.0, 0.0, 1.0)
    v[16] = _log_scale(cloud.bandwidth, 0.001, 1.0)
    return v


def compute_action_metrics(
    task: SimulationTaskInput,
    local: LocalNodeState,
    edge: EdgeNodeState,
    cloud: CloudNodeState,
    action: int,
    weights: RewardWeights = None,
    version: str = None,
) -> Dict[str, Any]:
    """Computes execution metrics and multi-objective scalar reward for an action.

    Action Mapping:
        0 = LOCAL
        1 = EDGE
        2 = CLOUD
    """
    if weights is None:
        weights = RewardWeights()
    if _version(version) == "v2":
        return _metrics_v2(task, local, edge, cloud, action, weights)
    return _metrics_v1(task, local, edge, cloud, action, weights)


def _metrics_v1(task, local, edge, cloud, action, weights) -> Dict[str, Any]:
    """Original synthetic cost model (unchanged)."""

    action = int(action)
    action_name = ACTION_NAMES.get(action, "UNKNOWN")

    # 1. LATENCY (ms)
    if action == 0:  # LOCAL
        net_latency_ms = local.base_latency
        base_exec_ms = (task.data_size_mb / 12.0) * (task.cpu_demand_percent / 68.0) * 36.0
        cpu_deficit_pct = max(0.0, task.cpu_demand_percent - local.cpu_available)
        throttle_factor = 1.0 + (cpu_deficit_pct / 38.0) * 0.85
        exec_latency_ms = base_exec_ms * throttle_factor
        queue_latency_ms = 0.0
    elif action == 1:  # EDGE
        transfer_ms = (task.data_size_mb * 8.0) / (edge.bandwidth * 1000.0) if edge.bandwidth > 0 else 50.0
        rtt_ms = 2.0 * edge.network_latency
        net_latency_ms = rtt_ms + transfer_ms
        base_exec_ms = ((task.data_size_mb / 12.0) * (task.cpu_demand_percent / 68.0) * 36.0) / 2.4
        edge_load_factor = 1.0 + (edge.cpu_load / 100.0) * 0.45
        exec_latency_ms = base_exec_ms * edge_load_factor
        queue_latency_ms = edge.task_queue * 3.2
    else:  # CLOUD
        transfer_ms = (task.data_size_mb * 8.0) / (cloud.bandwidth * 1000.0) if cloud.bandwidth > 0 else 100.0
        rtt_ms = 2.0 * cloud.network_latency
        net_latency_ms = rtt_ms + transfer_ms
        base_exec_ms = ((task.data_size_mb / 12.0) * (task.cpu_demand_percent / 68.0) * 36.0) / 4.0
        cloud_load_factor = 1.0 + (cloud.cpu_load / 100.0) * 0.35
        exec_latency_ms = base_exec_ms * cloud_load_factor
        queue_latency_ms = cloud.task_queue * 1.6

    total_latency_ms = round(net_latency_ms + queue_latency_ms + exec_latency_ms, 2)
    norm_latency = min(1.0, total_latency_ms / 500.0)

    # 2. ENERGY (Joules)
    if action == 0:
        # Local compute energy: P_comp * time * battery_stress
        battery_stress = 2.5 if local.battery_level < 30 else (1.4 if local.battery_level < 60 else 1.0)
        energy_joules = (exec_latency_ms / 1000.0) * 2.2 * battery_stress
    else:
        # Transmission energy consumed by mobile antenna
        energy_joules = (net_latency_ms / 1000.0) * 1.2

    energy_joules = round(float(energy_joules), 3)
    norm_energy = min(1.0, energy_joules / 5.0)

    # 3. MONETARY / INFRASTRUCTURE COST
    if action == 0:
        cost_val = 0.05 * (task.cpu_demand_percent / 100.0)
    elif action == 1:
        cost_val = 0.20 + (exec_latency_ms / 1000.0) * 0.35
    else:
        cost_val = 0.45 + (exec_latency_ms / 1000.0) * 0.65

    cost_val = round(float(cost_val), 3)
    norm_cost = min(1.0, cost_val / 2.0)

    # 4. QUEUE / LOAD CONGESTION PENALTY
    if action == 0:
        norm_queue = max(0.0, (task.cpu_demand_percent - local.cpu_available) / 100.0)
    elif action == 1:
        norm_queue = (edge.cpu_load / 100.0) * 0.6 + min(1.0, edge.task_queue / 20.0) * 0.4
    else:
        norm_queue = (cloud.cpu_load / 100.0) * 0.4 + min(1.0, cloud.task_queue / 30.0) * 0.6

    norm_queue = round(min(1.0, float(norm_queue)), 3)

    # 5. DEADLINE VIOLATION PENALTY
    deadline_slack = task.deadline_ms - total_latency_ms
    if deadline_slack < 0:
        deadline_penalty = 1.0 + min(1.0, abs(deadline_slack) / task.deadline_ms)
    else:
        deadline_penalty = 0.0
    deadline_penalty = round(float(deadline_penalty), 3)

    # COMPOSITE WEIGHTED COST & REWARD
    composite_cost = (
        weights.weight_latency * norm_latency
        + weights.weight_energy * norm_energy
        + weights.weight_cost * norm_cost
        + weights.weight_queue * norm_queue
        + weights.weight_deadline * deadline_penalty
    )

    reward = round(-float(composite_cost), 4)

    return {
        "action": action,
        "action_name": action_name,
        "latency_ms": total_latency_ms,
        "energy_joules": energy_joules,
        "cost": cost_val,
        "queue_penalty": norm_queue,
        "deadline_penalty": deadline_penalty,
        "reward": reward,
        "feasible": deadline_slack >= 0,
    }


def _metrics_v2(task, local, edge, cloud, action, weights) -> Dict[str, Any]:
    """Cost model calibrated to measured detection times (see app/ml/calibration.py).

    Measured: per-tier detection time (overhead + per-MB). Measured at run time and fed in: link
    round-trip time and bandwidth, CPU load and queues. Assumed (calibration.ASSUMPTIONS): how load
    and queues slow a tier down, and the energy/price constants (same as v1).
    """
    action = int(action)
    action_name = ACTION_NAMES.get(action, "UNKNOWN")
    size = max(0.0, float(task.data_size_mb))
    if action == 0:  # LOCAL: no network; slower when the CPU is busy
        busy = 1.0 - max(0.0, min(100.0, local.cpu_available)) / 100.0
        exec_latency_ms = calibration.detection_ms("local", size) * (1.0 + 2.0 * busy)
        net_latency_ms = local.base_latency
        queue_latency_ms = 0.0
    else:
        node, tier = (edge, "edge") if action == 1 else (cloud, "cloud")
        bandwidth_gbps = max(float(node.bandwidth), 1e-4)
        transfer_ms = size * 8.0 / bandwidth_gbps  # MB*8 = Mbit; / (Gbps*1000 Mbit/s) = s; x1000 = ms
        net_latency_ms = float(node.network_latency) + transfer_ms  # network_latency = measured round trip
        load = max(0.0, min(100.0, node.cpu_load)) / 100.0
        single_photo_ms = calibration.detection_ms(tier, 0.5)
        if action == 1:
            exec_latency_ms = calibration.detection_ms("edge", size) * (1.0 + load)
            queue_latency_ms = node.task_queue * single_photo_ms
        else:
            exec_latency_ms = calibration.detection_ms("cloud", size) * (1.0 + 0.5 * load)
            queue_latency_ms = node.task_queue * single_photo_ms / 2.0

    total_latency_ms = round(net_latency_ms + queue_latency_ms + exec_latency_ms, 2)
    # Log scales over the full range of real tasks (0.1-100 MB): a fixed cap (as in v1) makes every
    # slow task score the same, so 11 s and 24 s would look equally bad.
    norm_latency = _log_scale(total_latency_ms, 10.0, 120000.0)

    if action == 0:
        battery_stress = 2.5 if local.battery_level < 30 else (1.4 if local.battery_level < 60 else 1.0)
        energy_joules = (exec_latency_ms / 1000.0) * 2.2 * battery_stress
    else:
        energy_joules = (net_latency_ms / 1000.0) * 1.2
    energy_joules = round(float(energy_joules), 3)
    norm_energy = _log_scale(energy_joules, 0.001, 500.0)

    if action == 0:
        cost_val = 0.05 * (task.cpu_demand_percent / 100.0)
    elif action == 1:
        cost_val = 0.20 + (exec_latency_ms / 1000.0) * 0.35
    else:
        cost_val = 0.45 + (exec_latency_ms / 1000.0) * 0.65
    cost_val = round(float(cost_val), 3)
    norm_cost = _log_scale(cost_val, 0.001, 100.0)

    if action == 0:
        norm_queue = max(0.0, (task.cpu_demand_percent - local.cpu_available) / 100.0)
    elif action == 1:
        norm_queue = (edge.cpu_load / 100.0) * 0.6 + min(1.0, edge.task_queue / 3.0) * 0.4
    else:
        norm_queue = (cloud.cpu_load / 100.0) * 0.4 + min(1.0, cloud.task_queue / 16.0) * 0.6
    norm_queue = round(min(1.0, float(norm_queue)), 3)

    deadline_slack = task.deadline_ms - total_latency_ms
    deadline_penalty = 1.0 + min(1.0, abs(deadline_slack) / task.deadline_ms) if deadline_slack < 0 else 0.0
    deadline_penalty = round(float(deadline_penalty), 3)

    composite_cost = (
        weights.weight_latency * norm_latency
        + weights.weight_energy * norm_energy
        + weights.weight_cost * norm_cost
        + weights.weight_queue * norm_queue
        + weights.weight_deadline * deadline_penalty
    )
    return {
        "action": action,
        "action_name": action_name,
        "latency_ms": total_latency_ms,
        "energy_joules": energy_joules,
        "cost": cost_val,
        "queue_penalty": norm_queue,
        "deadline_penalty": deadline_penalty,
        "reward": round(-float(composite_cost), 4),
        "feasible": deadline_slack >= 0,
    }


class OffloadingEnvironment:
    """Discrete-event simulation environment for multi-tier task offloading."""

    def __init__(self, weights: RewardWeights = None, seed: int = 42, version: str = None):
        self.version = _version(version)
        self.weights = weights or RewardWeights()
        self.seed = seed
        self.rng = random.Random(seed)
        self.np_rng = np.random.default_rng(seed)
        self.current_task = self._sample_task()
        self.local = LocalNodeState(cpu_available=70.0, memory_available=60.0, battery_level=85.0, base_latency=1.2)
        self.edge = EdgeNodeState(cpu_load=40.0, task_queue=2, network_latency=14.5, bandwidth=2.0)
        self.cloud = CloudNodeState(cpu_load=30.0, task_queue=5, network_latency=65.0, bandwidth=10.0)

    def _log_uniform(self, low: float, high: float) -> float:
        return float(10 ** self.rng.uniform(np.log10(low), np.log10(high)))

    def _sample_task(self) -> SimulationTaskInput:
        """Samples a task workload profile (v2: the ranges of the deployed system)."""
        if self.version == "v2":
            return SimulationTaskInput(
                task_id=f"TASK_{self.rng.randint(100, 999)}",
                task_type="DYNAMIC_WORKLOAD",
                data_size_mb=round(self._log_uniform(0.1, 100.0), 3),
                cpu_demand_percent=round(float(self.rng.uniform(30.0, 95.0)), 1),
                memory_demand_percent=round(float(self.rng.uniform(25.0, 90.0)), 1),
                deadline_ms=round(self._log_uniform(20.0, 5000.0), 1),
                priority=int(self.rng.choice([1, 2, 3, 4, 5])),
            )
        data_size = round(float(self.rng.uniform(5.0, 60.0)), 1)
        cpu_demand = round(float(self.rng.uniform(20.0, 90.0)), 1)
        mem_demand = round(float(self.rng.uniform(15.0, 75.0)), 1)
        deadline = round(float(self.rng.uniform(30.0, 250.0)), 1)
        priority = int(self.rng.choice([1, 2, 3, 4, 5]))
        return SimulationTaskInput(
            task_id=f"TASK_{self.rng.randint(100, 999)}",
            task_type="DYNAMIC_WORKLOAD",
            data_size_mb=data_size,
            cpu_demand_percent=cpu_demand,
            memory_demand_percent=mem_demand,
            deadline_ms=deadline,
            priority=priority,
        )

    def reset(self, seed: int = None) -> np.ndarray:
        """Resets the environment state and returns the initial state vector."""
        if seed is not None:
            self.seed = seed
            self.rng = random.Random(seed)
            self.np_rng = np.random.default_rng(seed)

        self.current_task = self._sample_task()
        if self.version == "v2":
            # Ranges of the deployed system: real laptops, Radmin/home links, edge-like queue limit 3.
            self.local = LocalNodeState(
                cpu_available=round(float(self.rng.uniform(5.0, 95.0)), 1),
                memory_available=round(float(self.rng.uniform(20.0, 90.0)), 1),
                battery_level=round(float(self.rng.uniform(20.0, 100.0)), 1),
                base_latency=round(float(self.rng.uniform(0.5, 3.0)), 1),
            )
            self.edge = EdgeNodeState(
                cpu_load=round(float(self.rng.uniform(0.0, 90.0)), 1),
                task_queue=int(self.rng.randint(0, 3)),
                network_latency=round(self._log_uniform(2.0, 150.0), 1),
                bandwidth=round(self._log_uniform(0.002, 0.5), 4),
            )
            self.cloud = CloudNodeState(
                cpu_load=round(float(self.rng.uniform(0.0, 90.0)), 1),
                task_queue=int(self.rng.randint(0, 16)),
                network_latency=round(self._log_uniform(5.0, 300.0), 1),
                bandwidth=round(self._log_uniform(0.002, 1.0), 4),
            )
            return state_to_vector(self.current_task, self.local, self.edge, self.cloud, version="v2")
        self.local = LocalNodeState(
            cpu_available=round(float(self.rng.uniform(30.0, 90.0)), 1),
            memory_available=round(float(self.rng.uniform(40.0, 85.0)), 1),
            battery_level=round(float(self.rng.uniform(40.0, 100.0)), 1),
            base_latency=round(float(self.rng.uniform(0.5, 3.0)), 1),
        )
        self.edge = EdgeNodeState(
            cpu_load=round(float(self.rng.uniform(20.0, 75.0)), 1),
            task_queue=int(self.rng.randint(0, 15)),
            network_latency=round(float(self.rng.uniform(5.0, 35.0)), 1),
            bandwidth=round(float(self.rng.uniform(1.0, 20.0)), 1),
        )
        self.cloud = CloudNodeState(
            cpu_load=round(float(self.rng.uniform(20.0, 80.0)), 1),
            task_queue=int(self.rng.randint(2, 25)),
            network_latency=round(float(self.rng.uniform(40.0, 120.0)), 1),
            bandwidth=round(float(self.rng.uniform(5.0, 40.0)), 1),
        )
        return state_to_vector(self.current_task, self.local, self.edge, self.cloud, version="v1")

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        """Executes an offloading action and transitions the system state."""
        metrics = compute_action_metrics(
            self.current_task,
            self.local,
            self.edge,
            self.cloud,
            action,
            self.weights,
            version=self.version,
        )

        reward = metrics["reward"]

        # Environment dynamic transitions
        edge_queue_cap, cloud_queue_cap = (3, 16) if self.version == "v2" else (40, 30)
        if action == 0:
            # Drain battery slightly, simulate local load
            self.local.battery_level = max(5.0, self.local.battery_level - (metrics["energy_joules"] * 0.5))
            self.edge.task_queue = max(0, self.edge.task_queue - 1)
            self.cloud.task_queue = max(0, self.cloud.task_queue - 1)
        elif action == 1:
            # Edge absorbs queue task
            self.edge.task_queue = min(edge_queue_cap, self.edge.task_queue + 1)
            self.edge.cpu_load = min(100.0, max(10.0, self.edge.cpu_load + self.rng.uniform(-5.0, 8.0)))
            self.cloud.task_queue = max(0, self.cloud.task_queue - 1)
        else:
            # Cloud absorbs task
            self.cloud.task_queue = min(cloud_queue_cap, self.cloud.task_queue + 1)
            self.cloud.cpu_load = min(100.0, max(15.0, self.cloud.cpu_load + self.rng.uniform(-3.0, 6.0)))
            self.edge.task_queue = max(0, self.edge.task_queue - 1)

        # Generate next task
        self.current_task = self._sample_task()
        next_state = state_to_vector(self.current_task, self.local, self.edge, self.cloud, version=self.version)
        done = False  # Continuous streaming simulation

        return next_state, reward, done, metrics
