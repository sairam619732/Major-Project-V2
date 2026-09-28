# System Architecture: AI-Based Dynamic Task Offloading Optimization

**Project**: AI-Based Dynamic Task Offloading Optimization in Cloud-Edge Computing Environments  
**Document Version**: 1.0.0 (Phase 19 Production Ready)  

---

## 1. High-Level System Architecture Diagram

```text
               +-------------------------------------------------------+
               |               Client / User Interaction               |
               |     (Next.js 16 + React 19 + Three.js / R3F Canvas)   |
               +-------------------------------------------------------+
                                           |
                                           | HTTP / REST (JSON)
                                           v
               +-------------------------------------------------------+
               |                 FastAPI Backend Service               |
               |                (Uvicorn ASGI @ Port 8000)             |
               +-------------------------------------------------------+
                     |                             |
                     | 1. Validate Payload         | 2. Query Inference
                     v                             v
       +----------------------------+     +-------------------------------+
       | Pydantic v2 Domain Models  |     |   DQN Inference Service       |
       |  - SimulationTaskInput     |     |   (DQNInferenceService)       |
       |  - LocalNodeState          |     +-------------------------------+
       |  - EdgeNodeState           |              |
       |  - CloudNodeState          |              | 17-Dimensional State Vector
       +----------------------------+              v
                     |                    +-------------------------------+
                     | Telemetry          |      Deep Q-Network (MLP)     |
                     v                    |    PyTorch CPU Model (42k)    |
       +----------------------------+     +-------------------------------+
       | Simulation Environment     |              |
       | (OffloadingEnvironment)    |              | Q-Values & Action Selection
       +----------------------------+              v
                     |                    +-------------------------------+
                     |                    | Discrete Offloading Decision  |
                     |                    |   0 = LOCAL                   |
                     |                    |   1 = EDGE                    |
                     |                    |   2 = CLOUD                   |
                     |                    +-------------------------------+
                     |                                     |
                     +------------------+------------------+
                                        |
                                        v
               +-------------------------------------------------------+
               |         Multi-Objective Evaluation Engine             |
               |     (compute_action_metrics / evaluate_simulation)    |
               +-------------------------------------------------------+
                     |
                     +---> Latency (Net RTT + Queue Delay + Exec Time)
                     +---> Energy (Mobile CPU draw or antenna TX)
                     +---> Cost (Infrastructure fee index)
                     +---> Queue & Deficit Throttling Penalties
                     +---> Deadline Feasibility & Composite Reward
                     |
                     v
               +-------------------------------------------------------+
               |               JSON Response Payload                   |
               |   (decision, confidence, candidateScores, telemetry)  |
               +-------------------------------------------------------+
                                        |
                                        v
               +-------------------------------------------------------+
               |               Frontend Visualization                  |
               |   - Interactive 3D Node Mesh & Dynamic Lighting Rail  |
               |   - Real-Time Decision Badge (DQN vs Rule Fallback)   |
               |   - Comparative Score Breakdown & Explainable Quote   |
               +-------------------------------------------------------+
```

---

## 2. Core Architectural Components

### 2.1 Presentation & Visualization Tier (Frontend)
- **Framework**: Next.js 16.3.6 (Turbopack bundler) with React 19.
- **Styling**: TailwindCSS with CSS custom properties and custom editorial design system (`Geist`, `Geist Mono`, and `Space Grotesk` typography).
- **3D Spatial Visualization**: Three.js, React Three Fiber (`@react-three/fiber`), and Drei (`@react-three/drei`).
  - Choreographed camera movements across Local, Edge, and Cloud positions.
  - Interactive nodes with dynamic energy pulses and data-packet particle streams.
- **State Management**:
  - `src/lib/simulation/simulationState.ts`: React hook managing real-time task parameters and node conditions.
  - `src/services/apiClient.ts`: Strongly typed API client with timeout protection and static dataset fallback.

### 2.2 Application & Service Tier (FastAPI Backend)
- **Server Framework**: FastAPI $\ge 0.115.0$ running on Uvicorn ASGI.
- **Data Validation**: Pydantic v2 models guaranteeing strict boundary checking ($[0, 100]\%$, non-negative latencies, valid priorities).
- **CORS Architecture**: Configurable cross-origin middleware supporting frontend endpoints (`http://localhost:3000`, `http://127.0.0.1:3000`).
- **Endpoint Structure**:
  - `/health`: Readiness and liveness monitoring probe.
  - `/api/tasks/validate`: Isolated payload schema verification.
  - `/api/simulation/evaluate`: Dynamic task offloading simulation with live DQN inference.
  - `/api/optimization/decision`: Direct standalone DQN inference with Boltzmann Softmax confidence scores.
  - `/api/optimization/status`: Model checkpoint loading status, parameter count, and hardware execution context.
  - `/api/optimization/benchmark-report` & `/api/optimization/evaluation-results`: Machine-readable Phase 18 scientific benchmark results.
  - `/api/optimization/training-history`: 200-episode training convergence trajectory data.

### 2.3 Optimization & Machine Learning Engine (DQN)
- **Deep Q-Network Model (`QNetwork`)**:
  - Input Layer: 17 continuous normalized features in $[0.0, 1.0]$.
  - Hidden Layers: Two dense layers with 128 hidden units each and ReLU activations ($17 \to 128 \to 128 \to 3$).
  - Output Layer: 3 linear outputs corresponding to the action space $\{0: \text{LOCAL}, 1: \text{EDGE}, 2: \text{CLOUD}\}$.
  - Parameter Count: 42,947 trainable parameters.
- **Inference Service (`DQNInferenceService`)**:
  - Pinned strictly to CPU (`torch.device("cpu")`).
  - Sets network to `eval()` mode.
  - Applies Boltzmann Softmax temperature scaling ($\tau = 1.0$) to derive mathematically rigorous confidence probabilities:
    $$P(a_i) = \frac{e^{Q(s, a_i) / \tau}}{\sum_{j} e^{Q(s, a_j) / \tau}}$$
  - **Graceful Fallback**: If checkpoint is missing or corrupted, the service automatically switches to the validated rule-based heuristic with explicit labeling (`method: "rule_based_fallback"`, `is_fallback: true`).

### 2.4 Simulation & Environment Engine (`OffloadingEnvironment`)
- **State Vector Transformation (`state_to_vector`)**: Transforms domain models into a normalized 17-dimensional vector:
  - Task features (0–4): data size, CPU demand, memory demand, deadline, priority.
  - Local device features (5–8): available CPU, available memory, battery percentage, base bus latency.
  - Edge server features (9–12): CPU load, queue backlog, network latency, bandwidth.
  - Cloud datacenter features (13–16): CPU load, queue backlog, WAN latency, bandwidth.
- **Physical Dynamics Modeling (`compute_action_metrics`)**:
  - **LOCAL**: Zero network latency ($0.5\text{--}3.0\text{ ms}$ bus delay); compute throttled by local CPU deficit factor ($1.0 + (\Delta\text{CPU} / 38) \times 0.85$); battery stress multiplier applied to energy.
  - **EDGE**: Moderate latency (RTT $10\text{--}35\text{ ms}$ + transfer time); $2.4\times$ compute acceleration over local base; FIFO queue delay ($3.2\text{ ms} \times Q_{\text{edge}}$); edge tier fee.
  - **CLOUD**: High network latency (RTT $40\text{--}120\text{ ms}$ + transfer time); $4.0\times$ compute acceleration; FIFO queue delay ($1.6\text{ ms} \times Q_{\text{cloud}}$); central cloud fee.
- **Multi-Objective Reward Formulation**:
  $$R_t = -(0.35 \cdot \hat{T} + 0.25 \cdot \hat{E} + 0.15 \cdot \hat{C} + 0.10 \cdot \hat{Q} + 0.15 \cdot P_D)$$

---

## 3. Data Flow Sequences

### 3.1 Live Interactive Simulation Flow
1. User adjusts parameter sliders on `/simulation` page.
2. User clicks **RUN SIMULATION**.
3. Frontend packages `SimulationRequest` payload and issues `POST /api/simulation/evaluate`.
4. FastAPI validates payload via Pydantic domain models.
5. `evaluator.py` passes telemetry to `DQNInferenceService.predict()`.
6. Normalizer converts inputs to a 17-D tensor.
7. Model computes forward pass $\to$ Q-values $\to$ Boltzmann confidence $\to$ selected target.
8. Physical metrics engine calculates simulated latency, energy, cost, and deadline feasibility.
9. FastAPI returns structured `SimulationResponse`.
10. Frontend updates 3D scene camera focus, sets rail decision badge (`DQN AGENT (XX%)`), updates score lines, and prints explainable reason quote.

### 3.2 Offline / Failure Fallback Flow
1. If the FastAPI backend is offline or unreachable, the frontend API client catches the network error.
2. The client activates the built-in deterministic multi-criteria evaluator in the browser.
3. The UI explicitly displays the amber badge `OFFLINE FALLBACK` to maintain total academic transparency.
