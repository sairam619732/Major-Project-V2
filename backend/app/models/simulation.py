"""Pydantic schemas for the simulation evaluation API."""

from typing import Dict, Union, Optional, List, Any
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


class ObjectDetectionResultItem(BaseModel):
    """Individual object detection candidate with bounding coordinates and confidence."""

    label: str = Field(..., description="COCO semantic class name")
    confidence: float = Field(..., description="Detector confidence score [0.0, 1.0]")
    box_normalized: List[float] = Field(
        ...,
        description="Bounding coordinates normalized to [0.0, 1.0] as [ymin, xmin, ymax, xmax]",
    )
    box_pixels: Optional[List[float]] = Field(
        default=None,
        description="Bounding coordinates in pixel units [xmin, ymin, xmax, ymax]",
    )


class ImageMetadataSchema(BaseModel):
    """Extracted physical and computational attributes of the uploaded image."""

    width: int
    height: int
    size_bytes: int
    size_mb: float
    format: str
    mode: str
    pixel_count: int
    estimated_cpu_demand: float
    estimated_memory_demand: float


class SimulationExecuteResponse(BaseModel):
    """Structured response for unified image offloading and real CV execution."""

    task_id: str
    task_type: str
    decision: str = Field(..., description="'LOCAL' | 'EDGE' | 'CLOUD'")
    action_index: int = Field(..., description="0 for LOCAL, 1 for EDGE, 2 for CLOUD")
    confidence: float = Field(..., description="DQN policy action confidence")
    q_values: Dict[str, float] = Field(..., description="Q-values computed across candidate actions")
    execution_environment: str = Field(..., description="Human-readable execution environment label")
    environment_description: str = Field(..., description="Environment execution details")
    is_simulated_distributed: bool = Field(..., description="True if simulated Edge or Cloud offload")
    detections: List[ObjectDetectionResultItem] = Field(default_factory=list)
    detection_count: int
    annotated_image_base64: Optional[str] = Field(default=None, description="Base64 encoded JPEG with rendered bounding boxes")
    image_metadata: Optional[ImageMetadataSchema] = Field(default=None, description="Image physical attributes")
    execution_time_ms: float = Field(..., description="Measured neural inference runtime in milliseconds")
    latency_ms: float = Field(..., description="Total multi-tier latency including transmission")
    energy: float = Field(..., description="Energy consumption in Joules")
    cost: float = Field(..., description="Monetary/resource cost index")
    reward: float = Field(..., description="DQN step reward value")
    deadline_penalty: float = Field(default=0.0)
    feasible: bool = Field(..., description="Whether execution satisfied deadline and memory constraints")
    success: bool = Field(default=True)
    model_architecture: str = Field(..., description="Neural network detector architecture")
    candidateScores: Optional[Dict[str, CandidateScoreSchema]] = Field(default=None)
    reason: Optional[str] = Field(default=None)
    summary: Optional[str] = Field(default=None)
    # Phase 14 Execution Architecture Metrics
    execution_worker: str = Field(default="local-host-device", description="Worker service node handling execution")
    workload_type: str = Field(default="IMAGE", description="'IMAGE' | 'IMAGE_BATCH' | 'VIDEO'")
    input_size_mb: float = Field(default=0.0, description="Payload size in megabytes")
    processing_time_ms: float = Field(default=0.0, description="Measured neural processing time in milliseconds")
    network_transfer_ms: float = Field(default=0.0, description="Network transmission round-trip overhead in ms")
    processed_count: int = Field(default=1, description="Number of images or sampled frames processed")
    batch_items: Optional[List[Dict[str, Any]]] = Field(default=None, description="Per-item or per-frame detailed breakdown")
    status: str = Field(default="SUCCESS", description="Task execution status: SUCCESS or FAILED")
    error_message: Optional[str] = Field(default=None, description="Failure description if failed")


