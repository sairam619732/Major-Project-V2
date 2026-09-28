"""Simulation execution and evaluation endpoints."""

from fastapi import APIRouter, status
from app.models.simulation import SimulationRequest, SimulationResponse
from app.services.evaluator import evaluate_simulation

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.post(
    "/evaluate",
    response_model=SimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Dynamic Offloading Simulation",
    description=(
        "Receives task parameters, local device conditions, edge server state, "
        "and cloud infrastructure telemetry to compute the optimal multi-objective execution target."
    ),
)
@router.post(
    "/run",
    response_model=SimulationResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def run_simulation_endpoint(payload: SimulationRequest) -> SimulationResponse:
    """Evaluates task offloading decision across Local, Edge, and Cloud tiers using the DQN policy."""
    response = evaluate_simulation(
        task=payload.task,
        local=payload.local,
        edge=payload.edge,
        cloud=payload.cloud,
        algorithm=payload.algorithm or "dqn",
    )
    return response

