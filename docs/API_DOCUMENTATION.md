# REST API Documentation

**Service**: Cloud-Edge Offloading Backend Service  
**Version**: 1.0.0  
**Base URL**: `http://127.0.0.1:8000` (Local Development / Demo)  
**Interactive Docs**: `http://127.0.0.1:8000/docs` (Swagger UI)  

---

## 1. System Endpoints

### 1.1 Health Check
- **Method**: `GET`
- **Endpoint**: `/health`
- **Purpose**: Operational probe for service availability and orchestrator health checks.
- **Request Body**: None
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "cloud-edge-offloading-backend"
}
```

### 1.2 API Metadata
- **Method**: `GET`
- **Endpoint**: `/api`
- **Purpose**: Returns service discovery information, active phase, and list of mounted routes.
- **Request Body**: None
- **Response**: `200 OK`
```json
{
  "name": "AI-Based Dynamic Task Offloading Optimization Backend",
  "service": "cloud-edge-offloading-backend",
  "version": "1.0.0",
  "phase": "Phase 19 - Final Production Readiness & Hardened Pipeline",
  "status": "operational",
  "docs_url": "/docs",
  "endpoints": {
    "health": "/health",
    "api_info": "/api",
    "task_validate": "/api/tasks/validate",
    "simulation_evaluate": "/api/simulation/evaluate",
    "optimization_decision": "/api/optimization/decision",
    "optimization_train": "/api/optimization/train",
    "optimization_benchmark": "/api/optimization/benchmark",
    "optimization_status": "/api/optimization/status",
    "optimization_benchmark_report": "/api/optimization/benchmark-report",
    "optimization_evaluation_results": "/api/optimization/evaluation-results",
    "optimization_training_history": "/api/optimization/training-history"
  }
}
```

---

## 2. Task Validation Endpoints

### 2.1 Validate Task Payload
- **Method**: `POST`
- **Endpoint**: `/api/tasks/validate`
- **Purpose**: Validates task parameters against Pydantic schema boundaries prior to execution.
- **Request Body**:
```json
{
  "task_id": "TASK_001",
  "task_type": "OBJECT_DETECTION",
  "data_size_mb": 24.5,
  "cpu_demand_percent": 65.0,
  "memory_demand_percent": 45.0,
  "deadline_ms": 45.0,
  "priority": "medium"
}
```
- **Response**: `200 OK`
```json
{
  "valid": true,
  "task_id": "TASK_001",
  "message": "Task parameters are valid"
}
```
- **Validation Errors (`422 Unprocessable Entity`)**:
```json
{
  "detail": [
    {
      "loc": ["body", "cpu_demand_percent"],
      "msg": "Input should be less than or equal to 100",
      "type": "less_than_equal"
    }
  ]
}
```

---

## 3. Simulation Endpoints

### 3.1 Evaluate Dynamic Simulation
- **Method**: `POST`
- **Endpoint**: `/api/simulation/evaluate`
- **Purpose**: Evaluates task placement across Local, Edge, and Cloud tiers using the DQN policy.
- **Request Body**:
```json
{
  "task": {
    "task_id": "TASK_001",
    "task_type": "DYNAMIC_WORKLOAD",
    "data_size_mb": 24.5,
    "cpu_demand_percent": 65.0,
    "memory_demand_percent": 45.0,
    "deadline_ms": 75.0,
    "priority": 3
  },
  "local": {
    "cpu_available": 45.0,
    "memory_available": 55.0,
    "battery_level": 70.0,
    "base_latency": 1.2
  },
  "edge": {
    "cpu_load": 40.0,
    "task_queue": 2,
    "network_latency": 12.5,
    "bandwidth": 10.0
  },
  "cloud": {
    "cpu_load": 30.0,
    "task_queue": 5,
    "network_latency": 60.0,
    "bandwidth": 25.0
  },
  "algorithm": "dqn"
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "taskId": "TASK_001",
  "timestamp": 1727552000.0,
  "selectedTarget": "local",
  "selectedCandidate": {
    "target": "local",
    "displayName": "LOCAL",
    "score": 112.4,
    "breakdown": {
      "computeCost": 72.5,
      "networkCost": 0.6,
      "queueCost": 0.0,
      "resourcePressure": 24.3,
      "deadlineRisk": 15.0,
      "totalCost": 112.4
    },
    "estimatedLatencyMs": 85.2,
    "feasible": true
  },
  "candidateScores": {
    "local": { "displayName": "LOCAL", "score": 112.4 },
    "edge": { "displayName": "EDGE", "score": 134.8 },
    "cloud": { "displayName": "CLOUD", "score": 218.6 }
  },
  "reason": "DQN agent selected LOCAL with 38.4% confidence. Ample local device resources (45.0% CPU available) and zero network overhead provide the lowest simulated execution cost for TASK_001.",
  "summary": "LOCAL selected via DQN Policy with total cost score of 112.4 (est. 85.2 ms).",
  "isSimulated": true,
  "source": "backend",
  "method": "dqn",
  "confidence": 0.3844,
  "q_values": {
    "local": -2.6035,
    "edge": -2.7161,
    "cloud": -2.9493
  },
  "is_fallback": false
}
```

---

## 4. Optimization & Machine Learning Endpoints

### 4.1 Standalone DQN Optimization Decision
- **Method**: `POST`
- **Endpoint**: `/api/optimization/decision`
- **Purpose**: Computes pure DQN offloading inference with Boltzmann Softmax confidence without full simulation breakdown.
- **Request Body**: Same structure as simulation payload, with optional `temperature` (float, default: 1.0).
- **Response**: `200 OK`
```json
{
  "decision": "LOCAL",
  "action_index": 0,
  "confidence": 0.3844,
  "q_values": {
    "local": -2.6035,
    "edge": -2.7161,
    "cloud": -2.9493
  },
  "metrics": {
    "latency_ms": 85.2,
    "energy_joules": 0.187,
    "cost": 0.033,
    "queue_penalty": 0.20,
    "deadline_penalty": 0.0,
    "reward": -0.1531,
    "feasible": true
  },
  "method": "dqn",
  "is_fallback": false,
  "model_path": "app/ml/checkpoints/dqn_offloading_best.pt",
  "note": null
}
```

### 4.2 Benchmark Request (DQN vs Classical Baselines)
- **Method**: `POST`
- **Endpoint**: `/api/optimization/benchmark`
- **Purpose**: Evaluates a specific live input task simultaneously across DQN and all 5 classical baselines.
- **Response**: `200 OK`
```json
{
  "dqn": { "decision": "LOCAL", "action_index": 0, "confidence": 0.3844, ... },
  "baselines": {
    "local_only": { "action": 0, "action_name": "LOCAL", "latency_ms": 85.2, ... },
    "edge_only": { "action": 1, "action_name": "EDGE", "latency_ms": 94.6, ... },
    "cloud_only": { "action": 2, "action_name": "CLOUD", "latency_ms": 204.1, ... },
    "random": { "action": 0, "action_name": "LOCAL", ... },
    "rule_based_greedy": { "action": 0, "action_name": "LOCAL", ... }
  }
}
```

### 4.3 Optimization Status
- **Method**: `GET`
- **Endpoint**: `/api/optimization/status`
- **Purpose**: Inspects active model loading status, state dimension, action dimension, and hardware execution device.
- **Response**: `200 OK`
```json
{
  "status": "operational",
  "model_loaded": true,
  "model_path": "app/ml/checkpoints/dqn_offloading_best.pt",
  "seed": 42,
  "state_dim": 17,
  "action_dim": 3,
  "device": "cpu",
  "fallback_available": true
}
```

### 4.4 Retrieve Scientific Benchmark Report
- **Methods**: `GET`
- **Endpoints**: `/api/optimization/benchmark-report` and `/api/optimization/evaluation-results`
- **Purpose**: Serves the 5-seed empirical benchmark summary, seed-to-seed variance, per-policy metrics, and training history.
- **Response**: `200 OK` (JSON document structured according to `BenchmarkReportData` schema).

### 4.5 Retrieve Training History Trajectory
- **Method**: `GET`
- **Endpoint**: `/api/optimization/training-history`
- **Purpose**: Serves the 200-episode learning trajectory (loss, epsilon, cumulative reward, per-episode action counts).
- **Response**: `200 OK` (JSON array of 200 episode records).
