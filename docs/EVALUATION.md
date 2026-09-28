# Scientific Evaluation & Benchmark Methodology

**Project**: AI-Based Dynamic Task Offloading Optimization in Cloud-Edge Computing Environments  
**Phase Reference**: Phase 18 Comprehensive Testing & Scientific Evaluation  
**Status**: Verified & Authoritative  

---

## 1. Evaluation Methodology

The evaluation framework evaluates dynamic offloading policies across realistic computing environments under controlled, reproducible conditions.

### 1.1 Identical Workload Guarantee
To eliminate sampling bias between competing algorithms:
- Every evaluation workload generates a fixed tuple: $(\text{Task}, \text{LocalState}, \text{EdgeState}, \text{CloudState})$.
- The exact same state vector $\mathbf{s}_t \in \mathbb{R}^{17}$ is sequentially passed to all competing policies.
- No policy mutates the underlying environment state before the competing policies have registered their decisions.

### 1.2 Evaluation Configuration
- **Model Checkpoint**: `backend/app/ml/checkpoints/dqn_offloading_best.pt`
- **Training Episodes Used**: 200 episodes (monotonically decaying exploration $\epsilon: 1.0 \to 0.05$).
- **Inference Mode**: Pure deterministic greedy inference (`evaluate=True`, $\epsilon = 0.0$, weights frozen).
- **Execution Target**: Single-threaded deterministic CPU (`torch.device("cpu")`).
- **Independent Seeds**: 5 seeds: `[42, 101, 2024, 777, 8888]`.
- **Episodes per Seed**: 100 episodes.
- **Total Workload Samples**: 500 workloads.
- **Total Policy Executions**: 3,000 evaluations ($6 \times 500$).

---

## 2. Competing Policies

1. **TRAINED DQN**: Deep Q-Network ($17 \to 128 \to 128 \to 3$) with Boltzmann Softmax confidence.
2. **RULE-BASED GREEDY (MIN-COST HEURISTIC)**: Evaluates all tiers with instantaneous global knowledge of current queue state and network conditions, picking the action maximizing immediate reward.
3. **LOCAL-ONLY**: Fixed baseline executing exclusively on mobile CPU ($a = 0$).
4. **EDGE-ONLY**: Fixed baseline offloading exclusively to edge server ($a = 1$).
5. **CLOUD-ONLY**: Fixed baseline offloading exclusively to remote cloud datacenter ($a = 2$).
6. **RANDOM POLICY**: Uniform random discrete selection over $\{0, 1, 2\}$.

---

## 3. Metrics Formulation

1. **Mean Reward ($R_t$)**:
   $$R_t = -(0.35 \cdot \hat{T} + 0.25 \cdot \hat{E} + 0.15 \cdot \hat{C} + 0.10 \cdot \hat{Q} + 0.15 \cdot P_D)$$
   *Reward range is $[-2.0, 0.0]$. Higher (less negative, closer to $0.0$) indicates superior trade-off alignment.*
2. **Latency ($T_{\text{total}}$ in ms)**:
   $$T_{\text{total}} = T_{\text{network}} + T_{\text{queue}} + T_{\text{exec}}$$
3. **Device Energy ($E$ in Joules)**:
   - Local: $E = (T_{\text{exec}} / 1000) \times 2.2\text{W} \times \text{battery\_factor}$
   - Remote (Edge/Cloud): $E = (T_{\text{net}} / 1000) \times 1.2\text{W}$ (transmission energy)
4. **Infrastructure Cost Index**:
   - Local: $0.05 \times (\text{CPU} / 100)$
   - Edge: $0.20 + (T_{\text{exec}} / 1000) \times 0.35$
   - Cloud: $0.45 + (T_{\text{exec}} / 1000) \times 0.65$
5. **Feasibility Rate (%)**: Percentage of workloads meeting hard deadlines ($T_{\text{total}} \le T_{\text{deadline}}$).
6. **Action Distribution (%)**: Percentages allocated to LOCAL, EDGE, and CLOUD.

---

## 4. Empirical Evaluation Results

### Cross-Seed Summary (500 Workloads, 3,000 Policy Executions)

| Policy | Mean Reward (± 95% CI) | Latency (ms) | Energy (J) | Cost Index | Feasibility Rate | % LOCAL | % EDGE | % CLOUD |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Rule-Based Greedy** | **-0.1364 ± 0.0120** | **82.05 ± 4.18** | 0.137 ± 0.009 | 0.069 ± 0.007 | **76.4%** | 77.8% | 22.0% | 0.2% |
| **TRAINED DQN** | **-0.1531 ± 0.0136** | **89.40 ± 5.19** | 0.177 ± 0.012 | **0.066 ± 0.009** | **72.0%** | 85.0% | 10.8% | 4.2% |
| **Local-Only** | -0.1690 ± 0.0158 | 101.52 ± 7.32 | 0.248 ± 0.019 | 0.027 ± 0.001 | 69.0% | 100.0% | 0.0% | 0.0% |
| **Edge-Only** | -0.2147 ± 0.0113 | 104.92 ± 3.06 | 0.048 ± 0.002 | 0.214 ± 0.001 | 66.2% | 0.0% | 100.0% | 0.0% |
| **Random** | -0.2783 ± 0.0169 | 141.34 ± 6.92 | 0.184 ± 0.015 | 0.230 ± 0.016 | 50.8% | 37.2% | 28.6% | 34.2% |
| **Cloud-Only** | -0.4313 ± 0.0119 | 206.43 ± 4.30 | 0.194 ± 0.005 | 0.465 ± 0.001 | 21.2% | 0.0% | 0.0% | 100.0% |

### Latency Bounds Breakdown

| Policy | Mean (ms) | Std (ms) | Min (ms) | Max (ms) | Median (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **DQN** | 89.40 | 59.17 | 7.51 | 372.48 | 78.36 |
| **Rule-Based Greedy** | 82.05 | 47.72 | 7.51 | 218.19 | 77.70 |
| **Local-Only** | 101.52 | 83.47 | 7.51 | 456.27 | 78.12 |
| **Edge-Only** | 104.92 | 34.94 | 25.73 | 218.19 | 102.60 |
| **Cloud-Only** | 206.43 | 49.07 | 88.81 | 316.49 | 205.03 |
| **Random** | 141.34 | 78.95 | 8.06 | 430.32 | 131.18 |

### Pairwise Relative Comparison: DQN vs Baselines

| Comparison | Latency Reduction | Energy Reduction | Cost Reduction | Reward Difference |
| :--- | :---: | :---: | :---: | :---: |
| **DQN vs Local-Only** | **+11.94%** | **+28.93%** | -142.49% | **+0.0159** |
| **DQN vs Edge-Only** | **+14.79%** | -270.23% | **+69.07%** | **+0.0616** |
| **DQN vs Cloud-Only** | **+56.69%** | **+8.83%** | **+85.77%** | **+0.2782** |
| **DQN vs Random** | **+36.75%** | **+3.97%** | **+71.27%** | **+0.1252** |
| **DQN vs Rule-Based Greedy** | **-8.96%** | -29.00% | **+4.61%** | **-0.0167** |

---

## 5. Scientific Integrity & Honest Findings

1. **DQN vs Rule-Based Greedy**:
   - The Rule-Based Greedy heuristic achieves the highest composite reward ($-0.1364$) and lowest mean latency ($82.05\text{ ms}$).
   - The trained DQN is the second-best policy overall ($-0.1531$ reward, $89.40\text{ ms}$ latency).
   - **Honest Conclusion**: DQN does **not** outperform the expert heuristic in latency (latency is $8.96\%$ higher). The DQN closely mirrors the expert decision boundary without explicit programming, but under a 200-episode training budget it does not surpass it.
2. **DQN Infrastructure Cost Advantage**:
   - DQN achieves slightly lower monetary cost than the greedy heuristic ($0.066$ vs $0.069$, $+4.61\%$ cost reduction) because it places slightly more tasks locally ($85.0\%$ vs $77.8\%$) when local compute headroom allows.
3. **Decisive Outperformance of Static Baselines**:
   - DQN significantly outperforms all static single-tier policies: Local-Only ($+11.94\%$ latency reduction), Edge-Only ($+14.79\%$ latency reduction), Cloud-Only ($+56.69\%$ latency reduction), and Random ($+36.75\%$ latency reduction).

---

## 6. Experimental Limitations

1. **Training Budget**: The model was trained for 200 episodes. Future work with extended training ($\ge 1,000$ episodes) or Prioritized Experience Replay (PER) could help bridge the remaining $7.35\text{ ms}$ gap.
2. **Action Granularity**: Only full discrete offloading ($0, 1, 2$) is supported. Fractional DAG task splitting is not modeled.
3. **Wireless Modeling**: Wireless links use statistical RTT, bandwidth, and transfer time distributions rather than low-level physical-layer RF fading or TCP congestion windows.
