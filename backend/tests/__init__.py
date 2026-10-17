"""Backend test suites. Run from backend/: `python -m tests.test_dqn` or `python -m unittest discover tests`."""

import sys
from pathlib import Path

# Make `app` importable however the tests are launched.
_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))
