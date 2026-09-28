"""Pydantic models representing compute node state across Local, Edge, and Cloud tiers."""

from pydantic import BaseModel, Field


class LocalNodeState(BaseModel):
    """Represents the operating telemetry of the local mobile/IoT client device."""

    cpu_available: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Available CPU capacity percentage (0-100%)",
        examples=[70.0]
    )
    memory_available: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Available RAM capacity percentage (0-100%)",
        examples=[60.0]
    )
    battery_level: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Remaining battery reserve percentage (0-100%)",
        examples=[85.0]
    )
    base_latency: float = Field(
        ...,
        ge=0.0,
        description="Internal bus / system dispatch latency in milliseconds (ms)",
        examples=[1.2]
    )


class EdgeNodeState(BaseModel):
    """Represents the operational state of the intermediate Edge computing node."""

    cpu_load: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Current processor utilization on Edge server node (0-100%)",
        examples=[40.0]
    )
    task_queue: int = Field(
        ...,
        ge=0,
        description="Count of waiting jobs in Edge node scheduling queue",
        examples=[2]
    )
    network_latency: float = Field(
        ...,
        ge=0.0,
        description="Round-trip network ping to Edge node in milliseconds (ms)",
        examples=[14.5]
    )
    bandwidth: float = Field(
        ...,
        ge=0.0,
        description="Available transmission bandwidth to Edge node (Gbps)",
        examples=[1.0]
    )


class CloudNodeState(BaseModel):
    """Represents the operational state of the remote Cloud datacenter cluster."""

    cpu_load: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Current processor utilization in Cloud cluster (0-100%)",
        examples=[25.0]
    )
    task_queue: int = Field(
        ...,
        ge=0,
        description="Count of waiting jobs in Cloud cluster scheduling queue",
        examples=[5]
    )
    network_latency: float = Field(
        ...,
        ge=0.0,
        description="Round-trip network ping to Cloud datacenter in milliseconds (ms)",
        examples=[65.0]
    )
    bandwidth: float = Field(
        ...,
        ge=0.0,
        description="Available transmission bandwidth to Cloud cluster (Gbps)",
        examples=[10.0]
    )


class SystemState(BaseModel):
    """Aggregated three-tier environment state across Local, Edge, and Cloud infrastructure."""

    local: LocalNodeState = Field(
        ...,
        description="Client device resource telemetry"
    )
    edge: EdgeNodeState = Field(
        ...,
        description="Intermediate Edge node telemetry"
    )
    cloud: CloudNodeState = Field(
        ...,
        description="Remote Cloud cluster telemetry"
    )
