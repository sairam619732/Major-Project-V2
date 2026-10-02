"""Edge Execution Server package.

Phase 14A: Real Edge Server Connection over Local Network (LAN/Wi-Fi).
Exposes real HTTP POST /execute inference endpoint for offloaded tasks.
"""

from .server import app

__all__ = ["app"]
