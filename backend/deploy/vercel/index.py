"""Vercel entrypoint for the cloud offloading node.

Vercel loads the `app` variable from this file and runs it as a Python Vercel Function.
The node runs the object detector on ONNX Runtime (PyTorch is too large for Vercel Functions).
Set NODE_TOKEN in the Vercel project's Environment Variables; without it the node refuses tasks.
"""

import os

# Defaults for Vercel; any of these can be overridden in the project's Environment Variables.
os.environ.setdefault("NODE_TIER", "CLOUD")
os.environ.setdefault("NODE_ID", "cloud-vercel")
os.environ.setdefault("DETECTOR_ENGINE", "onnx")
# Vercel Functions accept request bodies up to 4.5 MB; leave room for the form encoding.
os.environ.setdefault("NODE_MAX_UPLOAD_MB", "4")
# This node is on the public internet: never run it without an access key.
os.environ.setdefault("NODE_REQUIRE_TOKEN", "1")

from node.server import app  # noqa: E402,F401
