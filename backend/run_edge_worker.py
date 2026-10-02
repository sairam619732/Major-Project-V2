"""Standalone Edge Execution Worker Runner.

Phase 14: Real Task Execution Through Automatic Offloading.
Runs on port 8001 (configurable via EDGE_WORKER_PORT).
"""

import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
from app.workers.execution_worker import create_worker_app

app = create_worker_app(tier="EDGE", worker_id=os.getenv("EDGE_WORKER_ID", "edge-worker-node-1"))

if __name__ == "__main__":
    port = int(os.getenv("EDGE_WORKER_PORT", "8001"))
    host = os.getenv("EDGE_WORKER_HOST", "127.0.0.1")
    print(f"==================================================")
    print(f"STARTING EDGE EXECUTION WORKER on http://{host}:{port}")
    print(f"==================================================")
    uvicorn.run(app, host=host, port=port, log_level="info")
