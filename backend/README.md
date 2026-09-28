# Cloud-Edge Task Offloading Optimization Backend

FastAPI backend foundation for **AI-Based Dynamic Task Offloading Optimization in Cloud-Edge Computing Environments**.

This backend service provides the foundational API layer, Pydantic schemas for tasks and system telemetry, CORS configuration for the Next.js frontend, and validation endpoints.

---

## 1. Prerequisites

- **Python 3.10+** (Tested with Python 3.12)
- PowerShell (Windows) or Terminal (macOS/Linux)

---

## 2. Setup Virtual Environment

Navigate to the `backend/` directory from the project root:

```bash
cd backend
```

### Windows (PowerShell)
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1
```

> **Note for PowerShell execution policy:** If script execution is restricted, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
> ```

### Windows (Command Prompt - CMD)
```cmd
python -m venv .venv
.\.venv\Scripts\activate.bat
```

### macOS / Linux (Bash / Zsh)
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Install Requirements

With the virtual environment activated:

```bash
pip install -r requirements.txt
```

---

## 4. Environment Configuration

Copy the example environment file:

### Windows (PowerShell)
```powershell
Copy-Item .env.example .env
```

### macOS / Linux
```bash
cp .env.example .env
```

Default configuration in `.env`:
```ini
HOST=127.0.0.1
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001
```

---

## 5. Starting the Backend Server

Start the development server with auto-reload:

### From the `backend/` directory:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Or using Python module runner:
```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The server will start at:
- **Base URL:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
- **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`

---

## 6. API Endpoints

### 6.1. Health Check
- **Method:** `GET`
- **Path:** `/health`
- **Description:** Verifies service uptime and operational status.
- **Example Response:**
  ```json
  {
    "status": "ok",
    "service": "cloud-edge-offloading-backend"
  }
  ```

### 6.2. API Information
- **Method:** `GET`
- **Path:** `/api`
- **Description:** Returns service metadata, version, and routing index.
- **Example Response:**
  ```json
  {
    "name": "AI-Based Dynamic Task Offloading Optimization Backend",
    "service": "cloud-edge-offloading-backend",
    "version": "0.1.0",
    "phase": "Phase 12 - Backend Foundation",
    "status": "operational",
    "docs_url": "/docs",
    "endpoints": {
      "health": "/health",
      "api_info": "/api",
      "task_validate": "/api/tasks/validate"
    }
  }
  ```

### 6.3. Task Validation Pipeline
- **Method:** `POST`
- **Path:** `/api/tasks/validate`
- **Description:** Validates task schema parameters against system constraints.
- **Request Body:**
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
- **Response (`200 OK`):**
  ```json
  {
    "valid": true,
    "task_id": "TASK_001",
    "message": "Task accepted for simulation",
    "details": {
      "task_type": "OBJECT_DETECTION",
      "data_size_mb": 24.5,
      "cpu_demand_percent": 65.0,
      "memory_demand_percent": 45.0,
      "deadline_ms": 45.0,
      "priority": "medium"
    }
  }
  ```

---

## 7. Testing Endpoints via PowerShell or cURL

### Test Health Endpoint:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get
```

### Test API Metadata Endpoint:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api" -Method Get
```

### Test Task Validation:
```powershell
$body = @{
    task_id = "TASK_001"
    task_type = "OBJECT_DETECTION"
    data_size_mb = 24.5
    cpu_demand_percent = 65.0
    memory_demand_percent = 45.0
    deadline_ms = 45.0
    priority = "medium"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/tasks/validate" -Method Post -ContentType "application/json" -Body $body
```

---

## 8. Architecture & Domain Models

- **`Task`** (`app/models/task.py`): Models a computational workload with payload size (`data_size_mb`), compute intensity (`cpu_demand_percent`), RAM allocation (`memory_demand_percent`), latency constraint (`deadline_ms`), and scheduling urgency (`priority`).
- **`SystemState`** (`app/models/system.py`): Telemetry models across the three computing tiers:
  - **Local:** `cpu_available`, `memory_available`, `battery_level`, `base_latency`
  - **Edge:** `cpu_load`, `task_queue`, `network_latency`, `bandwidth`
  - **Cloud:** `cpu_load`, `task_queue`, `network_latency`, `bandwidth`
- **`services/`** (`app/services/`): Reserved for algorithmic offloading models, heuristic baselines, and reinforcement learning engines in subsequent phases.
