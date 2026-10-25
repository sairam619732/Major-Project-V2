"""Start this desktop as the CLOUD node (GPU), reachable from the presenter's laptop over Radmin VPN.

Run from backend/ with the GPU environment (see docs/DEPLOYMENT.md, Part 5):
    .venv-gpu\\Scripts\\python.exe scripts\\start_cloud_node.py

- Tier CLOUD on port 8200, node name "cloud-desktop".
- The detector runs on the NVIDIA GPU when the CUDA build of PyTorch is installed (else on the CPU).
- An access key is created once in backend/.cloud-node-token (not committed). Put the same value in
  CLOUD_NODE_TOKEN on the presenter's laptop.
"""

import os
import secrets
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
TOKEN_FILE = BACKEND / ".cloud-node-token"


def main() -> None:
    if not TOKEN_FILE.exists():
        TOKEN_FILE.write_text(secrets.token_urlsafe(32), encoding="utf-8")
        print(f"Created an access key in {TOKEN_FILE}")
    os.environ.setdefault("NODE_TIER", "CLOUD")
    os.environ.setdefault("NODE_PORT", "8200")
    os.environ.setdefault("NODE_ID", "cloud-desktop")
    os.environ["NODE_TOKEN"] = TOKEN_FILE.read_text(encoding="utf-8").strip()
    print(f"Access key: in {TOKEN_FILE.name} (copy it into CLOUD_NODE_TOKEN on the presenter's laptop)")

    sys.path.insert(0, str(BACKEND))
    os.chdir(BACKEND)
    from app.services.cv_executor import cv_executor  # loads (and warms up) the detector

    print(f"Detector: {cv_executor.model_architecture}" if cv_executor.is_loaded else f"Detector NOT loaded: {cv_executor.load_error}")
    from node.run import main as run_node

    run_node()


if __name__ == "__main__":
    main()
