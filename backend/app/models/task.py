"""Pydantic models representing offloading tasks and validation schemas."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class TaskPriority(str, Enum):
    """Task urgency/priority level in the compute queue."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Task(BaseModel):
    """Represents a computational task eligible for dynamic offloading across Local, Edge, or Cloud."""

    task_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Unique identifier for the task (e.g. 'TASK_001')",
        examples=["TASK_001"]
    )
    task_type: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Workload profile category (e.g. 'OBJECT_DETECTION', 'DATA_PROCESSING')",
        examples=["OBJECT_DETECTION"]
    )
    data_size_mb: float = Field(
        ...,
        gt=0.0,
        le=10240.0,
        description="Input payload / dataset size in Megabytes (MB)",
        examples=[24.5]
    )
    cpu_demand_percent: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Required processor compute workload intensity percentage (0-100%)",
        examples=[65.0]
    )
    memory_demand_percent: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Required RAM allocation intensity percentage (0-100%)",
        examples=[45.0]
    )
    deadline_ms: float = Field(
        ...,
        gt=0.0,
        le=600000.0,
        description="Maximum allowable completion latency in milliseconds (ms)",
        examples=[45.0]
    )
    priority: TaskPriority = Field(
        default=TaskPriority.MEDIUM,
        description="Task priority classification influencing scheduling weight",
        examples=["medium"]
    )

    @field_validator("task_id", "task_type")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("String field cannot be empty or purely whitespace.")
        return cleaned


class TaskValidationResponse(BaseModel):
    """Response schema for the task validation endpoint."""

    valid: bool = Field(default=True, description="Indicates whether the task definition is valid")
    task_id: str = Field(..., description="The validated task identifier")
    message: str = Field(
        default="Task accepted for simulation",
        description="Informational status message"
    )
    details: Optional[dict] = Field(
        default=None,
        description="Optional diagnostic or metadata details"
    )
