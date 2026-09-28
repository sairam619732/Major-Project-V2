"""API routing aggregation."""

from fastapi import APIRouter
from app.api.tasks import router as tasks_router
from app.api.simulation import router as simulation_router
from app.api.optimization import router as optimization_router

api_router = APIRouter(prefix="/api")


@api_router.get(
    "",
    summary="API Information",
    description="Returns backend service identification, version metadata, and accessible endpoints.",
    tags=["System"],
)
@api_router.get(
    "/",
    include_in_schema=False,
)
async def api_root():
    return {
        "name": "AI-Based Dynamic Task Offloading Optimization Backend",
        "service": "cloud-edge-offloading-backend",
        "version": "1.0.0",
        "phase": "Phase 19 - Final Production Readiness & Hardened Pipeline",
        "status": "operational",
        "docs_url": "/docs",
        "endpoints": {
            "health": "/health",
            "api_info": "/api",
            "task_validate": "/api/tasks/validate",
            "simulation_evaluate": "/api/simulation/evaluate",
            "optimization_decision": "/api/optimization/decision",
            "optimization_train": "/api/optimization/train",
            "optimization_benchmark": "/api/optimization/benchmark",
            "optimization_status": "/api/optimization/status",
            "optimization_benchmark_report": "/api/optimization/benchmark-report",
            "optimization_evaluation_results": "/api/optimization/evaluation-results",
            "optimization_training_history": "/api/optimization/training-history",
        },
    }


api_router.include_router(tasks_router)
api_router.include_router(simulation_router)
api_router.include_router(optimization_router)

__all__ = ["api_router"]
