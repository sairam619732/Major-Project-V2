"""Convenient root runner for Real Edge Execution Server.

Phase 14A: Real Edge Server Connection.
Usage:
    python run_edge_server.py
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from edge_server.run import main

if __name__ == "__main__":
    main()
