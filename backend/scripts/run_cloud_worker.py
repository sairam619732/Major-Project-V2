"""Standalone Cloud Execution Worker Runner.

Phase 14: Real Task Execution Through Automatic Offloading.
Runs on port 8002 (configurable via CLOUD_WORKER_PORT).
"""

import os
import sys
from pathlib import Path

# Ensure backend root (parent of scripts/) is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
from app.workers.execution_worker import create_worker_app

app = create_worker_app(tier="CLOUD", worker_id=os.getenv("CLOUD_WORKER_ID", "cloud-worker-datacenter"))

if __name__ == "__main__":
    port = int(os.getenv("CLOUD_WORKER_PORT", "8002"))
    host = os.getenv("CLOUD_WORKER_HOST", "127.0.0.1")
    print(f"==================================================")
    print(f"STARTING CLOUD EXECUTION WORKER on http://{host}:{port}")
    print(f"==================================================")
    uvicorn.run(app, host=host, port=port, log_level="info")
