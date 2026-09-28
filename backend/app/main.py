"""Main FastAPI application entrypoint for Cloud-Edge Offloading Backend.

Phase 12: Backend Foundation
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router

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

app = FastAPI(
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
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
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
