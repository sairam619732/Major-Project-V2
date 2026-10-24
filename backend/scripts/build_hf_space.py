"""Assemble the Hugging Face Space for the cloud node into backend/dist/hf-space.

Run from backend/:
    .venv\\Scripts\\python.exe scripts\\build_hf_space.py
Then upload that folder to your Space (see README section "Cloud node on Hugging Face Spaces").
"""

import shutil
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
OUT = BACKEND / "dist" / "hf-space"
IGNORE = shutil.ignore_patterns("__pycache__", "*.pyc", "checkpoints")
TEXT_SUFFIXES = {".py", ".txt", ".md", ".json", ".toml", ".cfg"}


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for name in ("Dockerfile", "README.md", "requirements.txt"):
        shutil.copy2(BACKEND / "deploy" / "hf-space" / name, OUT / name)
    # The node runs the same detector code as the backend (app/services/cv_executor.py and its imports).
    shutil.copytree(BACKEND / "app", OUT / "app", ignore=IGNORE)
    shutil.copytree(BACKEND / "node", OUT / "node", ignore=IGNORE)
    # The Space builds on Linux: use LF line endings even if git checked files out with CRLF
    # (a CRLF line break after "\" in the Dockerfile would break its multi-line RUN commands).
    for path in OUT.rglob("*"):
        if path.is_file() and (path.suffix in TEXT_SUFFIXES or path.name == "Dockerfile"):
            path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))
    files = sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob("*") if p.is_file())
    print(f"Built {OUT} ({len(files)} files)")


if __name__ == "__main__":
    main()
