"""Convenience runner script for Phase 15 Empirical Benchmarking."""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.benchmark import main

if __name__ == "__main__":
    main()
