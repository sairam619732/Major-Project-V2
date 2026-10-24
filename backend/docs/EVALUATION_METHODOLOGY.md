# Scientific Evaluation Methodology: AI-Based Dynamic Task Offloading

**Phase 18 Comprehensive Testing & Scientific Evaluation Report**  
**Project**: AI-Based Dynamic Task Offloading Optimization in Cloud-Edge Computing Environments  
**Status**: COMPLETE and VERIFIED  
**Date**: September 2026  

---

## 1. Experimental Setup

The evaluation environment simulates an edge-cloud offloading architecture consisting of:
- **Mobile Client Device (LOCAL)**: Battery-constrained, single-tenant compute with baseline latency of 0.5–3.0 ms and CPU clock throttling under high thermal or compute deficit conditions ($1.0 + \frac{\text{CPU Deficit}}{38} \times 0.85$).
- **Edge Micro-Datacenter (EDGE)**: Proximity fog node offering 2.4× compute acceleration, 5–35 ms round-trip network latency, Wi-Fi/5G uplink bandwidth of 1–20 Mbps, and realistic FIFO queue queuing delays ($3.2 \text{ ms} \times Q_{\text{edge}}$).
- **Central Hyperscale Cloud (CLOUD)**: High-capacity remote server offering 4.0× compute acceleration, WAN latency of 40–120 ms, fiber uplink bandwidth of 5–40 Mbps, and queue delays of $1.6 \text{ ms} \times Q_{\text{cloud}}$.

All evaluations were executed on a deterministic CPU hardware baseline (`torch.device("cpu")`), ensuring zero stochastic divergence attributable to GPU non-determinism.

---

## 2. Algorithms Compared

Six offloading policies were evaluated under identical conditions:
1. **LOCAL-ONLY**: All incoming workloads are executed on the local mobile device regardless of resource availability.
2. **EDGE-ONLY**: All incoming workloads are transmitted to the proximity edge server regardless of bandwidth or queue backlog.
3. **CLOUD-ONLY**: All incoming workloads are transmitted across the wide-area network to the central cloud.
4. **RANDOM POLICY**: Uniform random discrete selection over $\{0, 1, 2\}$ with fixed pseudorandom seed.
5. **RULE-BASED GREEDY (MIN-COST HEURISTIC)**: An instantaneous analytic optimizer that evaluates the exact cost function across all three tiers with omniscient knowledge of current queue state and network conditions, choosing the tier that maximizes immediate scalar reward.
6. **TRAINED DQN**: Deep Q-Network parameterized with an MLP of three hidden layers (`17 -> 128 -> 128 -> 64 -> 3`) using LayerNorm after the first layer and ReLU activations, trained over 200 episodes using Experience Replay and Target Network synchronization, operating in pure deterministic evaluation mode (`evaluate=True`, temperature $\tau = 1.0$).

---

## 3. State Representation

The environment observation is encoded as a normalized continuous vector $\mathbf{s}_t \in [0.0, 1.0]^{17}$:

| Index | Feature | Physical Range | Normalization |
|:---:|:---|:---:|:---:|
| 0 | Task Data Size | 5.0 – 60.0 MB | $\text{clip}(x / 100.0, 0, 1)$ |
| 1 | Task CPU Demand | 20.0 – 90.0 % | $\text{clip}(x / 100.0, 0, 1)$ |
| 2 | Task Memory Demand | 15.0 – 75.0 % | $\text{clip}(x / 100.0, 0, 1)$ |
| 3 | Task Deadline | 30.0 – 250.0 ms | $\text{clip}(x / 500.0, 0, 1)$ |
| 4 | Task Priority | 1 – 5 | $(p - 1.0) / 4.0$ |
| 5 | Local CPU Available | 30.0 – 90.0 % | $\text{clip}(x / 100.0, 0, 1)$ |
| 6 | Local Memory Available | 40.0 – 85.0 % | $\text{clip}(x / 100.0, 0, 1)$ |
| 7 | Local Battery Level | 40.0 – 100.0 % | $\text{clip}(x / 100.0, 0, 1)$ |
| 8 | Local Base Latency | 0.5 – 3.0 ms | $\text{clip}(x / 50.0, 0, 1)$ |
| 9 | Edge CPU Load | 20.0 – 75.0 % | $\text{clip}(x / 100.0, 0, 1)$ |
| 10 | Edge Task Queue | 0 – 15 tasks | $\text{clip}(x / 40.0, 0, 1)$ |
| 11 | Edge Network Latency | 5.0 – 35.0 ms | $\text{clip}(x / 100.0, 0, 1)$ |
| 12 | Edge Bandwidth | 1.0 – 20.0 Mbps | $\text{clip}(x / 40.0, 0, 1)$ |
| 13 | Cloud CPU Load | 20.0 – 80.0 % | $\text{clip}(x / 100.0, 0, 1)$ |
| 14 | Cloud Task Queue | 2 – 25 tasks | $\text{clip}(x / 30.0, 0, 1)$ |
| 15 | Cloud Network Latency | 40.0 – 120.0 ms | $\text{clip}(x / 300.0, 0, 1)$ |
| 16 | Cloud Bandwidth | 5.0 – 40.0 Mbps | $\text{clip}(x / 80.0, 0, 1)$ |

---

## 4. Action Space

Discrete action space $\mathcal{A} = \{0, 1, 2\}$:
- **0 = LOCAL**: Process task on local mobile processor.
- **1 = EDGE**: Offload task to edge server.
- **2 = CLOUD**: Offload task to remote cloud datacenter.

---

## 5. Reward Definition

The environment formulates offloading optimization as a multi-objective cost minimization problem mapped into a negative scalar reward $R_t \in [-2.0, 0.0]$:

$$R_t = -\left(w_L \cdot \hat{T} + w_E \cdot \hat{E} + w_C \cdot \hat{C} + w_Q \cdot \hat{Q} + w_D \cdot P_D\right)$$

Where:
- $\hat{T} = \min(1.0, T_{\text{total}} / 500.0)$ is normalized latency ($w_L = 0.35$).
- $\hat{E} = \min(1.0, E_{\text{total}} / 5.0)$ is normalized energy consumption ($w_E = 0.25$).
- $\hat{C} = \min(1.0, C_{\text{monetary}} / 2.0)$ is normalized infrastructure cost ($w_C = 0.15$).
- $\hat{Q} \in [0.0, 1.0]$ is queue congestion factor ($w_Q = 0.10$).
- $P_D$ is deadline violation penalty ($w_D = 0.15$): $P_D = 0$ if $T_{\text{total}} \le T_{\text{deadline}}$, else $1.0 + \min(1.0, |T_{\text{deadline}} - T_{\text{total}}| / T_{\text{deadline}})$.

**Reward Interpretation**: Because reward is negative composite cost, **higher (less negative, closer to 0) is strictly better**.

---

## 6. Evaluation Seeds & Reproducibility

- **Seeds Used**: `[42, 101, 2024, 777, 8888]` (5 independent seeds).
- **Episodes per Seed**: 100.
- **Total Workload Scenarios**: 500 unique workloads.
- **Total Policy Runs**: 3,000 evaluations (6 policies × 500 workloads).
- **Controlled Workload Guarantee**: For every single workload $i \in [0, 499]$, the exact identical task and node telemetry states are presented to all six algorithms in sequence before state mutation occurs.

---

## 7. Metrics Collected

1. **Mean Reward & 95% CI**: Statistical expected return and studentized error bound ($1.96 \cdot \frac{\sigma}{\sqrt{n}}$).
2. **Mean & Std Latency (ms)**: End-to-end task turnaround time ($T_{\text{net}} + T_{\text{queue}} + T_{\text{exec}}$).
3. **Latency Bounds**: Minimum, Maximum, and Median observed latencies.
4. **Energy Consumption (Joules)**: Mobile device compute and radio transmission energy.
5. **Infrastructure Cost Index**: Tier monetary fee.
6. **Task Feasibility Rate (%)**: Percentage of tasks completed strictly before their hard deadline.
7. **Action Distribution (%)**: Percentage of offloading allocations to LOCAL, EDGE, and CLOUD.
8. **Seed-to-Seed Stability**: Mean and standard deviation across the 5 independent evaluation seeds.

---

## 8. Empirical Results

### Summary Across 5 Seeds (500 Workloads, 3,000 Evaluations)

| Policy | Mean Reward (± 95% CI) | Latency (ms) | Energy (J) | Cost Index | Feasibility Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **DQN** | **-0.1531 ± 0.0136** | **89.40 ± 5.19** | 0.177 ± 0.012 | 0.066 ± 0.009 | **72.0%** |
| **Local-Only** | -0.1690 ± 0.0158 | 101.52 ± 7.32 | 0.248 ± 0.019 | 0.027 ± 0.001 | 69.0% |
| **Edge-Only** | -0.2147 ± 0.0113 | 104.92 ± 3.06 | 0.048 ± 0.002 | 0.214 ± 0.001 | 66.2% |
| **Cloud-Only** | -0.4313 ± 0.0119 | 206.43 ± 4.30 | 0.194 ± 0.005 | 0.465 ± 0.001 | 21.2% |
| **Random** | -0.2783 ± 0.0169 | 141.34 ± 6.92 | 0.184 ± 0.015 | 0.230 ± 0.016 | 50.8% |
| **Rule-Based Greedy** | **-0.1364 ± 0.0120** | **82.05 ± 4.18** | 0.137 ± 0.009 | 0.069 ± 0.007 | **76.4%** |

### Latency Detailed Breakdown

| Policy | Mean Latency (ms) | Std (ms) | Min (ms) | Max (ms) | Median (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **DQN** | 89.40 | 59.17 | 7.51 | 372.48 | 78.36 |
| **Local-Only** | 101.52 | 83.47 | 7.51 | 456.27 | 78.12 |
| **Edge-Only** | 104.92 | 34.94 | 25.73 | 218.19 | 102.60 |
| **Cloud-Only** | 206.43 | 49.07 | 88.81 | 316.49 | 205.03 |
| **Random** | 141.34 | 78.95 | 8.06 | 430.32 | 131.18 |
| **Rule-Based Greedy** | 82.05 | 47.72 | 7.51 | 218.19 | 77.70 |

### Action Placement Distribution

| Policy | % LOCAL | % EDGE | % CLOUD | Primary Target |
| :--- | :---: | :---: | :---: | :---: |
| **DQN** | **85.0%** | **10.8%** | **4.2%** | LOCAL |
| **Local-Only** | 100.0% | 0.0% | 0.0% | LOCAL |
| **Edge-Only** | 0.0% | 100.0% | 0.0% | EDGE |
| **Cloud-Only** | 0.0% | 0.0% | 100.0% | CLOUD |
| **Random** | 37.2% | 28.6% | 34.2% | LOCAL |
| **Rule-Based Greedy** | **77.8%** | **22.0%** | **0.2%** | LOCAL |

### Seed-to-Seed Stability (5 Seeds)

| Policy | Reward (Across Seeds) | Latency (Across Seeds) | Success Rate | Local % (Across Seeds) |
| :--- | :---: | :---: | :---: | :---: |
| **DQN** | -0.1531 ± 0.0096 | 89.40 ± 5.55 ms | 72.0% ± 2.8% | 85.0% ± 1.2% |
| **Rule-Based Greedy** | -0.1364 ± 0.0054 | 82.05 ± 3.63 ms | 76.4% ± 1.1% | 77.8% ± 3.8% |
| **Local-Only** | -0.1690 ± 0.0137 | 101.52 ± 4.97 ms | 69.0% ± 4.5% | 100.0% ± 0.0% |

---

## 9. Baseline Trade-Offs

- **LOCAL-ONLY**: Extremely low network overhead (0–3 ms) enables swift completion of small tasks, but heavy tasks induce severe CPU deficit throttling, causing tail latency up to 456.27 ms.
- **EDGE-ONLY**: Fast 2.4× acceleration and reasonable RTT (10–35 ms), but bandwidth transfer delays penalize large payloads (>40 MB) and edge queue build-up introduces latency variance.
- **CLOUD-ONLY**: Superior raw compute capacity (4.0×), but WAN delay (40–120 ms RTT) dominates total turnaround time, resulting in a low 21.2% deadline compliance for latency-sensitive tasks.
- **RULE-BASED GREEDY**: Achieves optimal performance through perfect instantaneous state estimation, but requires manual weight tuning and programmatic heuristics for every deployment domain.
- **DQN**: Autonomous neural policy that achieves close parity with the heuristic without explicit rule engineering. DQN favors local execution slightly more (85.0% vs 77.8%), yielding lower monetary cost (0.066 vs 0.069) while keeping latency well within acceptable bounds.

---

## 10. Limitations

1. **Training Budget**: The evaluated DQN model was trained for 200 episodes. Extended training schedules (>1,000 episodes) with curriculum learning or prioritized experience replay (PER) may close the remaining 7.35 ms latency gap with the heuristic.
2. **Network Dynamics**: While the simulator implements stochastic queue delays, bandwidth jitter, and latency distributions, it does not simulate low-level TCP packet loss or handover between wireless access points.
3. **Action Space Granularity**: The current formulation uses discrete offloading actions ($0, 1, 2$). Partial/parallel task partition offloading (e.g., fractional DAG offloading) is outside the present discrete action scope.

---

## 11. Reproducibility Instructions

To reproduce the exact empirical evaluation results:

```bash
# From backend directory
cd backend
.\.venv\Scripts\python.exe scripts/run_benchmark.py --seeds 42,101,2024,777,8888 --eval-episodes 100
```

All raw sample logs and summary metrics will be deterministically written to:
- `backend/benchmarks/results/evaluation_results.json`
- `backend/benchmarks/results/evaluation_results.csv`
- `backend/benchmarks/results/evaluation_samples.csv`
- `backend/benchmarks/results/EVALUATION_REPORT.md`
