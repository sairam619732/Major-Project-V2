"""Main FastAPI application entrypoint for Cloud-Edge Offloading Backend.

Phase 12: Backend Foundation
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router
from app.services.remote_nodes import node_monitor

# Load environment variables if backend/.env is present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Retrieve CORS origins from environment with sensible localhost defaults
cors_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
)
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
# The web app hosted on Vercel (docs/DEPLOYMENT.md). Its pages run in the presenter's browser and call
# this backend on the same laptop. Set FRONTEND_URL to another address, or to "" to turn this off.
frontend_url = os.getenv("FRONTEND_URL", "https://edgeoffload-ai.vercel.app").strip().rstrip("/")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Watch the edge/cloud nodes set in EDGE_NODE_URL / CLOUD_NODE_URL (if any).
    await node_monitor.start()
    yield
    await node_monitor.stop()


app = FastAPI(
    lifespan=lifespan,
    title="AI-Based Dynamic Task Offloading Optimization Backend",
    description=(
        "Backend service providing telemetry models, task simulation contracts, "
        "and optimization infrastructure for local-edge-cloud computing environments."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Any port on this machine too: `next dev` moves to 3001, 3002, ... when 3000 is taken.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
    # Chrome asks before a public site (the Vercel web app) may call a server on this computer;
    # this answers its private-network preflight for the origins allowed above.
    allow_private_network=True,
)



@app.get(
    "/health",
    status_code=status.HTTP_200_OK,
    tags=["Health"],
    summary="Health check endpoint",
    description="Returns backend service readiness and operational status.",
)
async def health_check():
    """Health probe endpoint returning service status."""
    return {
        "status": "ok",
        "service": "cloud-edge-offloading-backend",
    }


# Mount API routes
app.include_router(api_router)


@app.get(
    "/",
    include_in_schema=False,
)
async def root():
    """Root redirect/info endpoint."""
    return {
        "service": "cloud-edge-offloading-backend",
        "phase": "Phase 12 - Backend Foundation",
        "docs": "/docs",
        "health": "/health",
        "api": "/api",
    }
