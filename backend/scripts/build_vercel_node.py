"""Assemble the Vercel cloud node into backend/dist/vercel-node.

Run from backend/:
    .venv\\Scripts\\python.exe scripts\\build_vercel_node.py
Then deploy that folder with the Vercel CLI (see docs/DEPLOYMENT.md, part 3).

The folder holds only what the node needs: the node server, the detector code, and the detector
as an ONNX model (no PyTorch), so it fits Vercel's Python function limits.
"""

import shutil
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
OUT = BACKEND / "dist" / "vercel-node"
FILES = [
    "app/__init__.py",
    "app/services/__init__.py",
    "app/services/cv_executor.py",
    "app/services/workload_limits.py",
    "app/ml/checkpoints/ssdlite320_coco.onnx",
    "app/ml/checkpoints/ssdlite320_coco_labels.json",
    "node/__init__.py",
    "node/server.py",
]
DEPLOY_FILES = ["index.py", "pyproject.toml", "vercel.json", ".python-version"]
TEXT_SUFFIXES = {".py", ".txt", ".json", ".toml", ""}


def main() -> None:
    model = BACKEND / "app/ml/checkpoints/ssdlite320_coco.onnx"
    if not model.exists():
        raise SystemExit("Missing the ONNX model: run scripts\\export_detector_onnx.py first.")
    if OUT.exists():
        # Start clean, but keep .vercel (the link to your Vercel project) so redeploys go to the same project.
        for item in OUT.iterdir():
            if item.name == ".vercel":
                continue
            shutil.rmtree(item) if item.is_dir() else item.unlink()
    for rel in FILES:
        (OUT / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(BACKEND / rel, OUT / rel)
    for name in DEPLOY_FILES:
        shutil.copy2(BACKEND / "deploy" / "vercel" / name, OUT / name)
    # Vercel builds on Linux: write LF line endings even if git checked files out with CRLF.
    for path in OUT.rglob("*"):
        if path.is_file() and path.suffix in TEXT_SUFFIXES:
            path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))
    size_mb = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file()) / 1e6
    print(f"Built {OUT} ({size_mb:.1f} MB of code and model; dependencies are installed by Vercel)")


if __name__ == "__main__":
    main()
