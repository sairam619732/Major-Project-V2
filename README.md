# AI-Based Dynamic Task Offloading Optimization in Cloud-Edge Computing Environments

A full-stack, academically verified research platform and demonstration system for dynamic multi-objective task offloading across three-tier computing hierarchies (Mobile Local, Proximity Edge, and Hyperscale Cloud) using Deep Reinforcement Learning (DQN).

---

## 1. Overview

Modern mobile, IoT, and edge applications—such as augmented reality, autonomous robotics, and real-time computer vision—demand high computational throughput and stringent low-latency execution while running on energy-constrained mobile devices. 

Static offloading strategies fail to adapt to fluctuating conditions:
- **Local execution** eliminates wireless latency but quickly saturates device CPU, drains batteries, and causes thermal throttling.
- **Cloud offloading** offers massive computing capacity but incurs significant wide-area network (WAN) latency and recurring infrastructure fees.
- **Edge computing** provides a middle ground with proximity micro-datacenters, but has finite queue capacities that suffer from contention under heavy loads.

This project designs, trains, evaluates, and demonstrates an **intelligent offloading arbiter** powered by a **Deep Q-Network (DQN)**. The DQN autonomously evaluates 17 real-time telemetry variables to place incoming tasks onto the optimal execution tier (LOCAL, EDGE, or CLOUD) to minimize a multi-objective cost function comprising latency, energy consumption, financial costs, queue congestion, and hard deadline violation penalties.

---

## 2. Architecture

The system operates across three tiers with a decoupled, fail-safe communication architecture:

```text
User / Client Browser (Next.js 16 + React Three Fiber 3D Simulation)
       │
       │ HTTP / REST (JSON)
       ▼
FastAPI Backend (Uvicorn ASGI @ Port 8000)
       │
       ├─► Pydantic v2 Schema Validation
       │
       ├─► 17-Dimensional Feature Normalization Vector
       │
       ▼
DQN Optimization Engine (PyTorch CPU Inference Service)
       │
       ├─► 0: LOCAL (Mobile Device CPU)
       ├─► 1: EDGE  (Proximity Fog Node)
       └─► 2: CLOUD (Hyperscale Datacenter)
       │
       ▼
Discrete-Event Simulation Environment (OffloadingEnvironment)
       │
       ├─► Network RTT + Queue Latency + Execution Throttling
       ├─► Battery Draw & RF Transmission Energy
       ├─► Multi-Objective Cost & Deadline Verification
       │
       ▼
Interactive Visualization & Research Analytics
       ├─► Real-Time Decision Badge (DQN vs Rule Fallback)
       ├─► 3D Spatial Scene with Animated Node Cameras
       └─► Research Benchmark Visualizations (/research)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architectural documentation.

---

## 3. Technology Stack

### Frontend & UI
- **Framework**: Next.js 16.4.3 (App Router with Turbopack)
- **UI Library**: React 19
- **3D Graphics & Canvas**: Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`
- **Typography & Styling**: TailwindCSS, CSS Modules, Google Fonts (`Geist`, `Geist Mono`, `Space Grotesk`)
- **Animation**: Custom frame-choreographed camera transitions & WebGL shaders

### Backend & Services
- **API Framework**: FastAPI $\ge 0.115.0$
- **ASGI Server**: Uvicorn $\ge 0.30.0$
- **Data Validation & Contracts**: Pydantic v2 $\ge 2.8.0$
- **Environment Management**: Python-dotenv $\ge 1.0.0$

### AI & Reinforcement Learning
- **Framework**: PyTorch $\ge 2.2.0$ (Pinned to deterministic CPU execution)
- **Numerical Processing**: NumPy $\ge 1.26.0$
- **Algorithm**: Deep Q-Network (DQN) with Huber Loss (`SmoothL1Loss`), Experience Replay Buffer, and Target Network Synchronization

### Simulation & Benchmarking
- **Environment**: Custom discrete-event Markov Decision Process (`OffloadingEnvironment`)
- **Action Selection**: Boltzmann Softmax Confidence ($\tau = 1.0$) and greedy evaluation
- **Datasets**: Synthetic offloading dataset generated from the environment's cost model, with a preprocessing pipeline (`data/`), plus JSON/CSV benchmark summaries

### Testing & Verification
- **Python**: Python `unittest` framework (`backend/tests/`)
- **Node.js**: Native Node test runners (`tests/unit/`, `tests/e2e/`)

---

## 4. DQN Methodology

### State Representation
The environment observation is encoded as a normalized continuous vector $\mathbf{s}_t \in [0.0, 1.0]^{17}$:
- **Task Features (0–4)**: Data size (MB), CPU demand (%), memory demand (%), deadline (ms), priority level (1–5).
- **Local Device Features (5–8)**: Available CPU (%), available memory (%), battery level (%), base bus latency (ms).
- **Edge Server Features (9–12)**: CPU load (%), task queue length, network RTT (ms), bandwidth (Mbps).
- **Cloud Datacenter Features (13–16)**: CPU load (%), task queue length, WAN RTT (ms), bandwidth (Mbps).

### Action Space
Discrete action space $\mathcal{A} = \{0, 1, 2\}$:
- **0 = LOCAL**: Process task on local mobile processor.
- **1 = EDGE**: Offload task to proximity edge server.
- **2 = CLOUD**: Offload task to remote cloud datacenter.

### Multi-Objective Reward Formulation
The system optimizes a composite cost mapped into a negative scalar reward $R_t \in [-2.0, 0.0]$:
$$R_t = -\left(w_L \cdot \hat{T} + w_E \cdot \hat{E} + w_C \cdot \hat{C} + w_Q \cdot \hat{Q} + w_D \cdot P_D\right)$$
- $\hat{T} = \min(1.0, T_{\text{total}} / 500.0)$ normalized latency ($w_L = 0.35$).
- $\hat{E} = \min(1.0, E_{\text{total}} / 5.0)$ normalized energy consumption ($w_E = 0.25$).
- $\hat{C} = \min(1.0, C_{\text{monetary}} / 2.0)$ normalized infrastructure cost ($w_C = 0.15$).
- $\hat{Q} \in [0.0, 1.0]$ queue congestion factor ($w_Q = 0.10$).
- $P_D$ deadline violation penalty ($w_D = 0.15$).

### Q-Network & Training
- **Network Architecture**: MLP with three hidden layers: $17 \to 128 \to 128 \to 64 \to 3$, LayerNorm after the first layer and ReLU activations (27,523 parameters).
- **Loss Function**: Huber Loss (`nn.SmoothL1Loss`).
- **Optimizer**: Adam ($\text{lr} = 5 \times 10^{-4}$).
- **Replay Buffer**: Capacity of 10,000 transitions; mini-batch size of 64.
- **Target Network**: Synchronized every 20 episodes ($\gamma = 0.95$).
- **Exploration Schedule**: Epsilon-greedy decaying from $\epsilon_0 = 1.0$ to $\epsilon_{\min} = 0.05$ with decay rate $0.99$.

### Inference & Confidence
During live inference and benchmarking, exploration is disabled ($\epsilon = 0.0$). Softmax temperature scaling ($\tau = 1.0$) calculates action confidence:
$$P(a_i) = \frac{e^{Q(s, a_i) / \tau}}{\sum_{j=0}^2 e^{Q(s, a_j) / \tau}}$$

---

## 5. Baselines

All policies were evaluated on identical streaming task sequences:
1. **Local-Only**: Forces all computation to execute on the mobile device ($a = 0$).
2. **Edge-Only**: Forces all workloads to be transmitted to the proximity edge server ($a = 1$).
3. **Cloud-Only**: Forces all workloads to be transmitted to the hyperscale cloud ($a = 2$).
4. **Random Policy**: Uniform random selection over $\{0, 1, 2\}$.
5. **Rule-Based Greedy (Min-Cost Heuristic)**: Evaluates all tiers with instantaneous global knowledge of current queue state and network delays, selecting the tier that minimizes immediate cost.

---

## 6. Research Results

All metrics reflect actual empirical data from Phase 18 evaluated across **5 independent seeds** (`[42, 101, 2024, 777, 8888]`) and **500 workloads** (**3,000 policy executions**):

### Comprehensive Policy Comparison

| Policy | Mean Reward (± 95% CI) | Latency (ms) | Energy (J) | Cost Index | Feasibility Rate | % LOCAL | % EDGE | % CLOUD |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Rule-Based Greedy** | **-0.1364 ± 0.0120** | **82.05 ± 4.18** | 0.137 ± 0.009 | 0.069 ± 0.007 | **76.4%** | 77.8% | 22.0% | 0.2% |
| **TRAINED DQN** | **-0.1531 ± 0.0136** | **89.40 ± 5.19** | 0.177 ± 0.012 | **0.066 ± 0.009** | **72.0%** | 85.0% | 10.8% | 4.2% |
| **Local-Only** | -0.1690 ± 0.0158 | 101.52 ± 7.32 | 0.248 ± 0.019 | 0.027 ± 0.001 | 69.0% | 100.0% | 0.0% | 0.0% |
| **Edge-Only** | -0.2147 ± 0.0113 | 104.92 ± 3.06 | 0.048 ± 0.002 | 0.214 ± 0.001 | 66.2% | 0.0% | 100.0% | 0.0% |
| **Random** | -0.2783 ± 0.0169 | 141.34 ± 6.92 | 0.184 ± 0.015 | 0.230 ± 0.016 | 50.8% | 37.2% | 28.6% | 34.2% |
| **Cloud-Only** | -0.4313 ± 0.0119 | 206.43 ± 4.30 | 0.194 ± 0.005 | 0.465 ± 0.001 | 21.2% | 0.0% | 0.0% | 100.0% |

### Pairwise Comparison: DQN vs Baselines
- **vs Local-Only**: **+11.94%** Latency Reduction, **+28.93%** Energy Reduction, **+0.0159** Reward Improvement.
- **vs Edge-Only**: **+14.79%** Latency Reduction, **+69.07%** Cost Reduction, **+0.0616** Reward Improvement.
- **vs Cloud-Only**: **+56.69%** Latency Reduction, **+85.77%** Cost Reduction, **+0.2782** Reward Improvement.
- **vs Random**: **+36.75%** Latency Reduction, **+71.27%** Cost Reduction, **+0.1252** Reward Improvement.
- **vs Rule-Based Greedy**: **-8.96%** Latency Difference, **+4.61%** Cost Reduction, **-0.0167** Reward Difference.

---

## 7. Limitations

1. **Training Budget**: The DQN was trained for 200 episodes. An extended training budget ($\ge 1,000$ episodes) with Prioritized Experience Replay (PER) could close the remaining 7.35 ms latency gap with the expert heuristic.
2. **Action Space Granularity**: The action space is discrete offloading ($0, 1, 2$). Task partitioning (DAG-based subtask splitting) is not currently supported.
3. **Queueing & Network Dynamics**: The simulator models FIFO queues and distribution-based RTT and bandwidth, rather than low-level physical RF packet loss or TCP window congestion.

---

## 8. Project Structure

```text
├── backend/                           # FastAPI Backend & ML Engine
│   ├── app/
│   │   ├── api/                       # API Routers (tasks, simulation, optimization)
│   │   ├── ml/                        # DQN Architecture, Environment, Agent, Baselines
│   │   │   ├── checkpoints/           # Saved PyTorch Model (.pt)
│   │   │   ├── agent.py               # DQNAgent implementation
│   │   │   ├── benchmark.py           # Multi-Seed Benchmark Engine
│   │   │   ├── environment.py         # Discrete-event MDP Simulator & cost model
│   │   │   ├── inference.py           # DQNInferenceService (CPU-pinned)
│   │   │   └── network.py             # QNetwork neural architecture
│   │   ├── models/                    # Pydantic v2 Request/Response Schemas
│   │   └── services/                  # Evaluator, CV executor (local in-process inference)
│   ├── scripts/                       # run_benchmark.py
│   ├── tests/                         # Python test suites (unit, DQN, benchmark, API)
│   ├── docs/                          # DQN pipeline & evaluation methodology
│   └── benchmarks/results/            # Generated evaluation results & reports (source of truth)
├── data/                              # Dataset (see data/README.md)
│   ├── pipeline/                      # generate_dataset.py, preprocess_dataset.py
│   ├── raw/                           # Generated dataset (read by /api/dataset)
│   └── processed/                     # train/val/test splits + preprocessing report
├── docs/                              # Project Documentation
│   ├── ARCHITECTURE.md                # System Architecture & Component Interaction
│   ├── API_DOCUMENTATION.md           # REST API Contract & Request/Response Samples
│   ├── EVALUATION.md                  # Comprehensive Scientific Evaluation Methodology
│   └── DEMO_CHECKLIST.md              # College Presentation Runbook & Demo Script
├── public/
│   ├── assets/                        # 3D models (GLB) and holo/: the model images the site shows
│   ├── data/                          # Benchmark summary, training history & report for /research
│   └── samples/                       # Sample image/video workloads
├── scripts/models/                    # Procedural GLB generators (Three.js, run with node)
├── src/                               # Next.js 16 Frontend
│   ├── app/                           # Routes (landing, simulation, research, dashboard pages, /api/dataset, /dev/hologram-bake)
│   ├── components/
│   │   ├── 3d/                        # Landing page scene & models
│   │   ├── simulation/                # Simulation Sliders, 3D Canvas & Editorial Rail
│   │   ├── research/                  # Charts, Comparison Tables, Trajectories
│   │   └── layout/  ui/  transitions/ # Dashboard shell, navigation, story sections
│   ├── lib/                           # Decision engine, simulation state, 3D helpers
│   ├── hooks/  store/  types/
│   └── services/apiClient.ts          # API Client with Offline Fallback
├── tests/
│   ├── unit/                          # Research data & store stability checks
│   └── e2e/                           # Frontend ↔ backend integration suites
└── README.md
```

---

## 9. Installation

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **Python**: v3.10, v3.11, or v3.12
- **Git**

### Clone & Setup
```bash
git clone https://github.com/sairam619732/Major-Project-V2.git
cd "Major Project V2"

# 1. Install Frontend Dependencies
npm install

# 2. Setup Python Backend Environment
cd backend
python -m venv .venv
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
cd ..
```

---

## 10. Running the Backend

From the project root:
```bash
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at `http://127.0.0.1:8000`. On its own it is the only server the project needs: a tier with no node connected is simulated (the workload runs in-process on the local machine and its network and queueing costs come from the cost model).  
Interactive Swagger API documentation is available at `http://127.0.0.1:8000/docs`.

### Task limits
Sized for ordinary laptops and free CPU servers, and checked in the browser, the backend and every node:
- **Image:** one photo (JPG, PNG or WebP), up to 10 MB.
- **Image batch:** up to 10 photos at a time, each up to 10 MB.
- **Video:** one video, up to 10 seconds and 50 MB, analysed at 1 frame per second (so at most 10 frames). Needs **ffmpeg** on the machine that runs it (Windows: `winget install Gyan.FFmpeg`); without it the task is refused with a clear message.

The numbers live in `backend/app/services/workload_limits.py` and `src/lib/simulation/workloadLimits.ts`.

### Edge and cloud nodes (optional)
The edge and cloud tiers can be real machines running the offloading node (`backend/node`). A node reports its own CPU load, memory and task queue, and runs the object detector on tasks sent to it. The backend checks each node every 3 s, measures the real network latency (round trip) and bandwidth (a 1 KB and a 2 MB upload timed back to back every 30 s; the difference is the transfer time), feeds these to the DQN, and sends the task to the node when the DQN picks that tier. A node that stops answering is shown as offline and gets no tasks.

**Three machines (your laptop + a teammate's laptop as edge + Vercel as cloud):** follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), then start with `npm run present`.

**Single-laptop demo (no second machine, no cloud account).** One command runs every tier on this laptop:
```bash
npm run demo
```
It builds the web app and starts four programs: the edge node (port 8100), the cloud node (8200), the backend (8000) and the web app (http://localhost:3000; use `npm run demo -- --port=3001` if 3000 is taken). Ctrl+C stops them all; `npm run demo:stop` stops a demo whose window was closed. `backend/.env` is not changed.
- **Real:** object detection runs inside each node program, and each node's CPU load and task queue are read with psutil. The backend measures latency and bandwidth to each node as usual.
- **Emulated:** the network. Each node delays its own traffic like a real link: edge 20 ms round trip and 300 Mbps (nearby server over Wi-Fi), cloud 90 ms and 50 Mbps (datacenter over home broadband). The settings are in `scripts/demo.mjs` (`NODE_EMULATED_RTT_MS`, `NODE_EMULATED_JITTER_MS` and `NODE_EMULATED_BANDWIDTH_MBPS` on a node).
- The app labels these links **EMULATED NETWORK** (orange), never as live network readings. All tiers share this laptop's CPU, so edge and cloud compute is no faster than local here.

**Edge (a PC on the same Wi-Fi).** On that PC, set up the backend as in section 9, then:
```powershell
cd backend
.\.venv\Scripts\python.exe -m node.run
```
It prints the line to use, e.g. `EDGE_NODE_URL=http://192.168.1.20:8100`. Allow port 8100 through that PC's firewall. On the laptop running the main backend, put that line in `backend/.env` (copy `backend/.env.example`) and restart the backend.

**Cloud (Hugging Face Spaces, free CPU tier).** The same node runs in a Docker Space (`backend/deploy/hf-space/`). A tier whose URL is empty stays simulated.
1. On huggingface.co create a **New Space**: SDK **Docker**, template **Blank**, hardware **CPU basic (free)**, visibility **Public**.
2. In the Space's **Settings → Variables and secrets**, add a **secret** `NODE_TOKEN` with a long random value, e.g. from `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Only callers that send this key can use the node.
3. Build the upload folder and upload it (log in with your own Hugging Face access token that has write permission):
   ```powershell
   cd backend
   .\.venv\Scripts\python.exe scripts\build_hf_space.py
   .\.venv\Scripts\python.exe -m pip install -U huggingface_hub
   .\.venv\Scripts\hf.exe auth login
   .\.venv\Scripts\hf.exe upload <your-username>/<space-name> dist\hf-space . --repo-type space
   ```
4. Wait for the Space to finish building (its **Logs** tab), then open `https://<your-username>-<space-name>.hf.space/health`.
5. In `backend/.env` set `CLOUD_NODE_URL=https://<your-username>-<space-name>.hf.space` and `CLOUD_NODE_TOKEN=<the same key>`, then restart the backend.

A free Space sleeps after a long time without requests; the first request after that is slow while it wakes up. While the backend runs it checks the node every 3 s, which keeps it awake.

---

## 11. Running the Frontend

From the project root (in a separate terminal):
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

For an optimized production build:
```bash
npm run build
npm run start
```

### Model images
The tablet, edge rack and cloud datacenter are shown as pre-rendered images (`public/assets/holo/`), not live 3D models. Each image is drawn as an animated hologram, and on the landing page the pointer reveals a real-look image of the model. The images are rendered from the GLB models in `public/assets/` with the site's own hologram shader. After changing a model, run `npm run dev`, open `http://localhost:3000/dev/hologram-bake` and click **Render and save all images**. That page only works in development.

---

## 12. Running Tests

### Everything at once
From the project root, one command runs the type-check, lint, every frontend and backend test suite, the production build, and the live API and end-to-end tests (it starts the backend on port 8000 if it isn't already running) and prints a pass/fail summary:
```bash
npm run check
```
`npm run check:quick` skips the production build and the live tests. The individual suites are listed below.

### Backend Unit & Integration Tests
```powershell
cd backend
# 1. Phase 18 Scientific Evaluation Suite
.\.venv\Scripts\python.exe -m tests.test_phase18

# 2. Phase 17 DQN Integration Suite
.\.venv\Scripts\python.exe -m tests.test_phase17

# 3. Phase 14B DQN Neural Architecture Suite
.\.venv\Scripts\python.exe -m tests.test_dqn

# 4. Phase 15 Benchmark Suite
.\.venv\Scripts\python.exe -m tests.test_benchmark

# 5. Offloading Node & Node Monitor Suite
.\.venv\Scripts\python.exe -m tests.test_nodes

# 5b. Task Limits Suite (video checks need ffmpeg)
.\.venv\Scripts\python.exe -m tests.test_workload_limits

# 5c. Input Handling Suite (broken images, oversized uploads, what-if zeros, training switch)
.\.venv\Scripts\python.exe -m tests.test_hardening

# 6. Full Backend API Regression Suite (requires running server)
.\.venv\Scripts\python.exe -m tests.test_api
cd ..
```

### Frontend & End-to-End Integration Tests
Run from the project root:
```bash
# 1. Research Visualization Verification
node tests/unit/test_phase16.mjs

# 2. End-to-End Frontend-Backend Integration (requires running server)
node tests/e2e/test_integration.mjs

# 3. TypeScript unit tests (run with tsx, installed as a dev dependency)
npx tsx tests/unit/test_store_snapshot_stability.ts
npx tsx src/lib/offloading/__tests__/testDecisionEngine.ts
npx tsx src/lib/simulation/__tests__/testSimulationPresets.ts
```

---

## 13. Reproducing Results

To execute the 5-seed empirical benchmark and re-generate all machine-readable datasets and reports:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts/run_benchmark.py --seeds 42,101,2024,777,8888 --eval-episodes 100
```

This generates:
- `backend/benchmarks/results/evaluation_results.json`
- `backend/benchmarks/results/evaluation_results.csv`
- `backend/benchmarks/results/evaluation_samples.csv`
- `backend/benchmarks/results/EVALUATION_REPORT.md`
- Copies `benchmark_summary.json` and `BENCHMARK_REPORT.md` to `public/data/` for the `/research` visualization page.

To rebuild the training dataset and its preprocessed splits, see [data/README.md](data/README.md).

---

## 14. API Endpoints

| HTTP Method | Route | Description |
|:---:|:---|:---|
| `GET` | `/health` | Service liveness probe |
| `GET` | `/api` | Service identification & route index |
| `POST` | `/api/tasks/validate` | Schema validation for task payloads |
| `POST` | `/api/simulation/evaluate` | Dynamic offloading simulation with live DQN inference |
| `POST` | `/api/optimization/decision` | Pure DQN inference with Boltzmann Softmax confidence |
| `POST` | `/api/optimization/benchmark` | Real-time comparative evaluation (DQN vs 5 baselines) |
| `GET` | `/api/optimization/status` | Model loading status, hardware device, and parameter count |
| `GET` | `/api/optimization/benchmark-report` | Full 5-seed empirical benchmark report (JSON) |
| `GET` | `/api/optimization/evaluation-results` | Scientific evaluation summary and seed variance |
| `GET` | `/api/optimization/training-history` | 200-episode training trajectory (loss, epsilon, reward) |
| `POST` | `/api/optimization/train` | Retrains the DQN and overwrites the checkpoint. Off by default (403); set `ENABLE_TRAINING_API=1` in `backend/.env` to allow it |

See [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for full request/response schemas.

---

## 15. Academic Integrity

This project adheres strictly to scientific honesty standards:
- **No Fabricated Benchmarks**: All figures presented in documentation and the `/research` page are computed directly from actual simulation runs under seeds `[42, 101, 2024, 777, 8888]`.
- **Honest Comparative Reporting**: We transparently report that the Rule-Based Greedy heuristic achieves superior latency ($82.05\text{ ms}$ vs $89.40\text{ ms}$, an $8.96\%$ advantage) and reward ($-0.1364$ vs $-0.1531$). We do **not** claim DQN superiority where the empirical data does not support it.
- **Fail-Safe Transparency**: When the backend is offline, the frontend explicitly displays `OFFLINE FALLBACK` rather than simulating a fake neural network response.
