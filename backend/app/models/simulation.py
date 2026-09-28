"""Pydantic schemas for the simulation evaluation API."""

from typing import Dict, Union, Optional
from pydantic import BaseModel, Field
from app.models.task import TaskPriority
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState


class SimulationTaskInput(BaseModel):
    """Task parameters collected from the simulation controls."""

    task_id: str = Field(
        default="TASK_001",
        description="Task identifier"
    )
    task_type: str = Field(
        default="OBJECT_DETECTION",
        description="Workload classification category"
    )
    data_size_mb: float = Field(
        ...,
        gt=0.0,
        le=10240.0,
        description="Payload size in MB",
        examples=[24.5]
    )
    cpu_demand_percent: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="CPU compute intensity demand (0-100%)",
        examples=[65.0]
    )
    memory_demand_percent: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Memory demand percentage (0-100%)",
        examples=[45.0]
    )
    deadline_ms: float = Field(
        ...,
        gt=0.0,
        le=600000.0,
        description="Maximum allowable completion latency in ms",
        examples=[45.0]
    )
    priority: Union[int, TaskPriority, str] = Field(
        default=3,
        description="Task scheduling priority level (1-5 or low/medium/high/critical)"
    )


class SimulationRequest(BaseModel):
    """Full simulation request payload collecting task, local, edge, and cloud inputs."""

    task: SimulationTaskInput
    local: LocalNodeState
    edge: EdgeNodeState
    cloud: CloudNodeState
    algorithm: Optional[str] = Field(default="dqn", description="Optimization algorithm ('dqn' | 'rule_based' | 'greedy')")


class CostBreakdownSchema(BaseModel):
    """Multi-criteria cost formulation breakdown."""

    computeCost: float
    networkCost: float
    queueCost: float
    resourcePressure: float
    deadlineRisk: float
    totalCost: float


class CandidateScoreSchema(BaseModel):
    """Candidate execution tier score and performance estimation."""

    target: str = Field(..., description="'local' | 'edge' | 'cloud'")
    displayName: str = Field(..., description="'LOCAL' | 'EDGE' | 'CLOUD'")
    score: float = Field(..., description="Normalized composite cost index (lower is better)")
    breakdown: CostBreakdownSchema
    estimatedLatencyMs: float = Field(..., description="Estimated completion latency in ms")
    feasible: bool = Field(..., description="Whether absolute deadline and resource constraints are satisfied")


class SimulationResponse(BaseModel):
    """Simulation evaluation response returned to the frontend."""

    status: str = Field(default="success")
    taskId: str
    timestamp: float
    selectedTarget: str = Field(..., description="Selected optimal execution target ('local' | 'edge' | 'cloud')")
    selectedCandidate: CandidateScoreSchema
    candidateScores: Dict[str, CandidateScoreSchema]
    reason: str = Field(..., description="Explainable rationale behind the decision")
    summary: str
    isSimulated: bool = Field(default=True)
    source: str = Field(default="backend", description="Indicates response originated from the FastAPI backend")
    method: str = Field(default="dqn", description="'dqn' | 'rule_based_fallback' | 'rule_based'")
    confidence: Optional[float] = Field(default=None, description="Boltzmann Softmax confidence score [0.3333, 1.0]")
    q_values: Optional[Dict[str, float]] = Field(default=None, description="Estimated Q-values for local, edge, and cloud")
    is_fallback: bool = Field(default=False, description="True if fallback policy was executed")

