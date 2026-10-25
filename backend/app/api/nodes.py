"""Settings for the optional edge and cloud nodes (used by the Configuration page).

The app works with both nodes disabled: every task then runs on this machine.

Security:
  - API keys are accepted here but never returned: responses only say whether a key is set.
  - Changing settings or testing a connection is allowed only from this computer (loopback), so
    another device on the network can't repoint the nodes. The browser sends the key to this
    backend over the loopback interface (it never leaves the machine); the backend sends it to the
    node only in the X-API-Key header, over HTTPS when the node's URL is https://.
  - Saved settings go to backend/node_settings.json on this computer: plain text, readable by
    this user account, not encrypted, and ignored by git. backend/.env is the alternative.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.services.remote_nodes import node_monitor, validate_node_url

router = APIRouter(prefix="/nodes", tags=["Remote nodes"])

TIERS = ("edge", "cloud")
LOOPBACK = {"127.0.0.1", "::1", "localhost", "testclient"}


class NodeSettingsUpdate(BaseModel):
    enabled: bool = Field(..., description="Use this node for tasks")
    url: Optional[str] = Field(default=None, description="Node base URL, http(s)://host[:port]")
    api_key: Optional[str] = Field(default=None, max_length=512, description="New key; omit or leave empty to keep the saved one")
    clear_api_key: bool = Field(default=False, description="Remove the saved key")


class NodeTestRequest(BaseModel):
    url: Optional[str] = Field(default=None, description="URL to test; default: the saved one")
    api_key: Optional[str] = Field(default=None, max_length=512, description="Key to test; default: the saved one")


def _tier(tier: str) -> str:
    tier = tier.lower()
    if tier not in TIERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown tier: use edge or cloud.")
    return tier


def _local_only(request: Request) -> None:
    host = request.client.host if request.client else ""
    if host not in LOOPBACK:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Node settings can only be changed from the computer running this backend.",
        )


@router.get("", summary="Edge and cloud node settings and live status (never includes API keys)")
async def list_nodes():
    return node_monitor.telemetry()


@router.put("/{tier}", summary="Save a node's settings")
async def update_node(tier: str, body: NodeSettingsUpdate, request: Request):
    _local_only(request)
    key = _tier(tier)
    try:
        return node_monitor.update_settings(key, body.enabled, body.url, body.api_key, body.clear_api_key)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/{tier}/test", summary="Test a node: reachable, API key accepted, valid replies")
async def test_node(tier: str, body: NodeTestRequest, request: Request):
    _local_only(request)
    key = _tier(tier)
    node = node_monitor.nodes[key]
    url = body.url or node.url
    if not url:
        raise HTTPException(status_code=422, detail="Enter the node's URL first.")
    api_key = body.api_key if body.api_key else node.token
    try:
        validate_node_url(url)
        return await node_monitor.test_connection(url, api_key)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
