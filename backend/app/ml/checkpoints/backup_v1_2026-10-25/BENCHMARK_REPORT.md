# Empirical Benchmark Report: DQN vs Classical Offloading Policies (Phase 18 Scientific Evaluation)

## 1. Experimental Setup & Configuration
- **Experiment**: Phase 18 - Comprehensive Scientific Evaluation
- **Timestamp**: 2026-09-28T19:13:55Z
- **Evaluation Seeds**: `[42, 101, 2024, 777, 8888]` (5 independent seeds)
- **Evaluation Episodes per Seed**: 100
- **Total Workload Samples Evaluated**: 500 workloads
- **Total Policy Executions**: 3000 runs (6 policies × 500 workloads)
- **DQN Checkpoint**: `app/ml/checkpoints/dqn_offloading_best.pt` (loaded: True)
- **Execution Time**: 0.22 seconds
- **Reward Formulation**: $R_t = -(w_L \cdot \hat{T} + w_E \cdot \hat{E} + w_C \cdot \hat{C} + w_Q \cdot \hat{Q} + w_D \cdot P_D)$
  - Latency Weight ($w_L$): 0.35
  - Energy Weight ($w_E$): 0.25
  - Cost Weight ($w_C$): 0.15
  - Queue Weight ($w_Q$): 0.1
  - Deadline Penalty Weight ($w_D$): 0.15

## 2. Policy Performance Summary Across All Seeds (Mean ± 95% CI)

| Policy | Mean Reward | Latency (ms) | Energy (J) | Cost Index | Feasibility Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **DQN** | -0.1531 ± 0.0136 | 89.40 ± 5.19 | 0.177 ± 0.012 | 0.066 ± 0.009 | 72.0% |
| **Local-Only** | -0.1690 ± 0.0158 | 101.52 ± 7.32 | 0.248 ± 0.019 | 0.027 ± 0.001 | 69.0% |
| **Edge-Only** | -0.2147 ± 0.0113 | 104.92 ± 3.06 | 0.048 ± 0.002 | 0.214 ± 0.001 | 66.2% |
| **Cloud-Only** | -0.4313 ± 0.0119 | 206.43 ± 4.30 | 0.194 ± 0.005 | 0.465 ± 0.001 | 21.2% |
| **Random** | -0.2783 ± 0.0169 | 141.34 ± 6.92 | 0.184 ± 0.015 | 0.230 ± 0.016 | 50.8% |
| **Rule-Based Greedy** | -0.1364 ± 0.0120 | 82.05 ± 4.18 | 0.137 ± 0.009 | 0.069 ± 0.007 | 76.4% |

## 3. Latency Detailed Analysis

| Policy | Mean (ms) | Std (ms) | Min (ms) | Max (ms) | Median (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **DQN** | 89.40 | 59.17 | 7.51 | 372.48 | 78.36 |
| **Local-Only** | 101.52 | 83.47 | 7.51 | 456.27 | 78.12 |
| **Edge-Only** | 104.92 | 34.94 | 25.73 | 218.19 | 102.60 |
| **Cloud-Only** | 206.43 | 49.07 | 88.81 | 316.49 | 205.03 |
| **Random** | 141.34 | 78.95 | 8.06 | 430.32 | 131.18 |
| **Rule-Based Greedy** | 82.05 | 47.72 | 7.51 | 218.19 | 77.70 |

## 4. Reward Detailed Analysis

| Policy | Mean Reward | Std | Worst (Min) | Best (Max) | Median |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **DQN** | -0.1531 | 0.1547 | -0.6074 | -0.0068 | -0.0772 |
| **Local-Only** | -0.1690 | 0.1801 | -0.7227 | -0.0068 | -0.0748 |
| **Edge-Only** | -0.2147 | 0.1294 | -0.5088 | -0.0616 | -0.1472 |
| **Cloud-Only** | -0.4313 | 0.1358 | -0.6438 | -0.1410 | -0.4622 |
| **Random** | -0.2783 | 0.1926 | -0.7138 | -0.0073 | -0.2310 |
| **Rule-Based Greedy** | -0.1364 | 0.1367 | -0.5088 | -0.0068 | -0.0748 |

## 5. Action Placement Distribution (%)

| Policy | % LOCAL | % EDGE | % CLOUD | Primary Placement |
| :--- | :---: | :---: | :---: | :---: |
| **DQN** | 85.0% | 10.8% | 4.2% | LOCAL |
| **Local-Only** | 100.0% | 0.0% | 0.0% | LOCAL |
| **Edge-Only** | 0.0% | 100.0% | 0.0% | EDGE |
| **Cloud-Only** | 0.0% | 0.0% | 100.0% | CLOUD |
| **Random** | 37.2% | 28.6% | 34.2% | LOCAL |
| **Rule-Based Greedy** | 77.8% | 22.0% | 0.2% | LOCAL |

## 6. Seed-to-Seed Stability & Variance (5 Independent Seeds)

| Policy | Reward (Across Seeds) | Latency (Across Seeds) | Feasibility Rate | Local % (Across Seeds) |
| :--- | :---: | :---: | :---: | :---: |
| **DQN** | -0.1531 ± 0.0096 | 89.40 ± 5.55 ms | 72.0% ± 2.8% | 85.0% ± 1.2% |
| **Local-Only** | -0.1690 ± 0.0137 | 101.52 ± 4.97 ms | 69.0% ± 4.5% | 100.0% ± 0.0% |
| **Edge-Only** | -0.2146 ± 0.0047 | 104.92 ± 2.75 ms | 66.2% ± 2.4% | 0.0% ± 0.0% |
| **Cloud-Only** | -0.4313 ± 0.0101 | 206.43 ± 5.47 ms | 21.2% ± 2.6% | 0.0% ± 0.0% |
| **Random** | -0.2783 ± 0.0080 | 141.34 ± 4.15 ms | 50.8% ± 1.9% | 37.2% ± 3.3% |
| **Rule-Based Greedy** | -0.1364 ± 0.0054 | 82.05 ± 3.63 ms | 76.4% ± 1.1% | 77.8% ± 3.8% |

## 7. Pairwise Comparisons: DQN vs Baselines

| Comparison | Latency Reduction | Energy Reduction | Cost Reduction | Reward Improvement |
| :--- | :---: | :---: | :---: | :---: |
| **DQN vs Local-Only** | +11.94% | +28.93% | -142.49% | +0.0159 |
| **DQN vs Edge-Only** | +14.79% | -270.23% | +69.07% | +0.0616 |
| **DQN vs Cloud-Only** | +56.69% | +8.83% | +85.77% | +0.2782 |
| **DQN vs Random** | +36.75% | +3.97% | +71.27% | +0.1252 |
| **DQN vs Rule-Based Greedy** | -8.96% | -29.0% | +4.61% | -0.0167 |

## 8. Methodological Discussion & Scientific Findings

### Key Trade-offs Identified:
1. **LOCAL-ONLY**: Minimal networking delay (1-2 ms), but rapidly saturates device CPU on demanding workloads, leading to queue throttling and deadline misses (69.0% feasibility). Lowest monetary cost (0.027).
2. **EDGE-ONLY**: Reduces execution time by 2.4x over local baseline with moderate network RTT (10-30 ms), achieving 66.2% feasibility with a moderate cost index (0.214).
3. **CLOUD-ONLY**: Extreme compute capacity (4.0x acceleration), but penalised heavily by WAN latency (80-140 ms RTT) and egress costs. Feasibility drops to 21.2% for tight deadline tasks; highest cost index (0.465).
4. **RULE-BASED GREEDY**: Evaluates all tiers with instantaneous global knowledge of queue state and deadlines. Achieves the highest reward (-0.1364) and lowest latency (82.05 ms) with 76.4% feasibility.
5. **TRAINED DQN**: Second-best policy overall (-0.1531 reward, 89.40 ms latency, 72.0% feasibility). Closely approximates the rule-based heuristic without requiring explicit rule programming. Notably, DQN achieves slightly lower infrastructure cost (0.066 vs 0.069) by biasing borderline tasks toward local compute.

### Scientific Honesty Statement:
- DQN does **not** outperform the rule-based heuristic on latency (-8.95% relative difference) or composite reward (-0.0167 difference) under the 200-episode training budget.
- DQN decisively outperforms Local-Only (+11.94% latency reduction), Edge-Only (+14.79% latency reduction), Cloud-Only (+56.69% latency reduction), and Random (+36.75% latency reduction).
- All evaluations were conducted using identical, deterministically seeded streaming task sequences.
