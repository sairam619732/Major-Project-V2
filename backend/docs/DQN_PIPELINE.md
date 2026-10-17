# DQN Offloading Optimization Pipeline Documentation (Phase 17)

## 1. System Overview & Concept Pipeline
The task-offloading architecture operates as a closed-loop inference and evaluation system:

```
Task + Environment State
        ↓
Canonical State Construction (17-D Normalized Vector)
        ↓
DQN Policy / Inference (PyTorch Neural Approximation)
        ↓
Offloading Decision (0=LOCAL, 1=EDGE, 2=CLOUD)
        ↓
Simulation & Feasibility Constraints
        ↓
Multi-Objective Reward & Cost Breakdown
        ↓
Metrics & Real-Time Visualization
```

---

## 2. State Representation
The canonical state transformer converts heterogeneous domain telemetry into a normalized $17$-dimensional vector $\mathbf{s} \in [0.0, 1.0]^{17}$:

| Index Range | Category | Feature Breakdown | Normalization Scale |
| :---: | :--- | :--- | :---: |
| `0–4` | **Task Workload** | Data size, CPU demand %, Memory demand %, Deadline ms, Priority | Size / 100MB, CPU / 100%, Mem / 100%, Deadline / 500ms, Priority [0-1] |
| `5–8` | **Local Device** | Available CPU %, Available RAM %, Battery %, Base bus delay | CPU / 100%, Mem / 100%, Battery / 100%, Latency / 50ms |
| `9–12` | **Edge Server** | CPU load %, Task queue length, Network ping ms, Channel bandwidth Gbps | CPU / 100%, Queue / 40, Latency / 100ms, Bandwidth / 40 Gbps |
| `13–16` | **Cloud Datacenter** | CPU load %, Datacenter queue, WAN ping ms, Channel bandwidth Gbps | CPU / 100%, Queue / 30, Latency / 300ms, Bandwidth / 80 Gbps |

---

## 3. Action Space
The action space consists of exactly $3$ discrete placement decisions:
- **`0` = LOCAL**: On-device execution on the mobile terminal; zero network transmission latency; consumes battery power.
- **`1` = EDGE**: Metropolitan edge server execution; low network latency; shared server queue; moderate financial cost.
- **`2` = CLOUD**: Centralized cloud datacenter; high compute power; wide-area network latency; higher egress cost.

---

## 4. Multi-Objective Reward Formulation
The objective balances latency, energy, financial expense, and QoS deadlines:

$$R_t = - \left(w_L \cdot \frac{T}{200} + w_E \cdot \frac{E}{0.5} + w_C \cdot \frac{C}{0.5} + w_Q \cdot P_{\text{queue}} + w_D \cdot P_{\text{deadline}}\right)$$

- Default Weights: $w_L=0.35$ (Latency), $w_E=0.25$ (Device Energy), $w_C=0.15$ (Financial Cost), $w_Q=0.10$ (Queue Avoidance), $w_D=0.15$ (Deadline Adherence).
- Penalty Terms: $P_{\text{queue}}$ penalizes queue congestion; $P_{\text{deadline}}$ adds a stepped penalty if $T_{\text{total}} > T_{\text{deadline}}$.

---

## 5. DQN Inference Process
1. **Network Architecture**: Fully connected MLP with parameters:
   $$\text{Input}(17) \longrightarrow \text{Linear}(128) + \text{ReLU} \longrightarrow \text{Linear}(128) + \text{ReLU} \longrightarrow \text{Linear}(64) + \text{ReLU} \longrightarrow \text{Output}(3)$$
2. **Greedy Deterministic Action Selection**:
   $$a^* = \arg\max_{a \in \{0, 1, 2\}} Q(\mathbf{s}, a; \theta)$$
3. **Boltzmann Softmax Confidence**:
   $$P(a) = \frac{\exp\left(Q(\mathbf{s}, a) / \tau\right)}{\sum_{a'} \exp\left(Q(\mathbf{s}, a') / \tau\right)}, \quad \text{Confidence} = \max_a P(a)$$
4. **Execution Guarantees**:
   - Model is strictly evaluated in `eval()` mode without gradient tracking (`torch.no_grad()`).
   - Pure CPU execution (`device="cpu"`) without requiring CUDA hardware.

---

## 6. Safe Fallback Behavior
- **Trigger Conditions**: Missing checkpoint, corrupted weights file, or unexpected tensor exceptions during forward pass.
- **Fallback Policy**: Deterministic multi-criteria `RuleBasedGreedyPolicy` evaluating instantaneous cost:
  $$a_{\text{fallback}} = \arg\min_{a \in \{\text{local, edge, cloud}\}} \text{Cost}(a)$$
- **Transparency**:
  - The API response explicitly sets `method: "rule_based_fallback"` and `is_fallback: True`.
  - Confidence evaluates to $1/3$ ($0.3333$) reflecting uniform uncertainty in the absence of neural approximation.

---

## 7. API Flow & Endpoints
1. `POST /api/simulation/evaluate`:
   - Primary endpoint consumed by the interactive simulation UI.
   - Evaluates task under DQN (or heuristic if `algorithm="greedy"`).
   - Returns selected target, detailed candidate breakdown scores for the 3D visualization, confidence score, and explainable rationale.
2. `POST /api/optimization/decision`:
   - Dedicated direct optimization endpoint returning `OptimizationDecisionResponse`.
3. `POST /api/optimization/benchmark`:
   - Runs side-by-side single-workload comparison across DQN and all 5 baseline policies.
4. `GET /api/optimization/benchmark-report`:
   - Exposes Phase 15 aggregated statistical metrics, 200-episode training trajectory, and hyperparameter configuration.
