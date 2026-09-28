"""Task processing and validation endpoints."""

from fastapi import APIRouter, status
from app.models.task import Task, TaskValidationResponse

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post(
    "/validate",
    response_model=TaskValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate an offloading task",
    description="Accepts a Task schema and returns a structured validation response confirming suitability for simulation.",
)
async def validate_task(task: Task) -> TaskValidationResponse:
    """Validates the structure, ranges, and consistency of an incoming task definition.

    NOTE: This endpoint serves strictly as an API contract validation pipeline
    for Phase 12. Final decision engine optimization will be integrated in a later phase.
    """
    return TaskValidationResponse(
        valid=True,
        task_id=task.task_id,
        message="Task accepted for simulation",
        details={
            "task_type": task.task_type,
            "data_size_mb": task.data_size_mb,
            "cpu_demand_percent": task.cpu_demand_percent,
            "memory_demand_percent": task.memory_demand_percent,
            "deadline_ms": task.deadline_ms,
            "priority": task.priority.value,
        },
    )
