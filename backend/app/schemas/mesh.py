"""Pydantic schemas for mesh generation endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RefinementZone(BaseModel):
    """A spatial region where the mesh should be finer."""

    type: str = Field(description="box or sphere")
    center: list[float] | None = None
    size: list[float] | None = None
    radius: float | None = None
    element_size: float = Field(gt=0)


class MeshGenerateRequest(BaseModel):
    simulation_id: uuid.UUID
    element_size: float = Field(gt=0, description="Global element size")
    refinement_zones: list[RefinementZone] = Field(default_factory=list)


class MeshResponse(BaseModel):
    id: uuid.UUID
    simulation_id: uuid.UUID
    file_key: str | None
    format: str | None
    node_count: int | None
    element_count: int | None
    min_quality: float | None
    avg_quality: float | None
    quality_histogram: dict | None
    mesh_config: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
