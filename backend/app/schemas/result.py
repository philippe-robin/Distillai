"""Pydantic schemas for result / post-processing endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.result import ResultField


class ResultResponse(BaseModel):
    id: uuid.UUID
    simulation_id: uuid.UUID
    field: ResultField
    time_step: int | None
    file_key: str | None
    min_value: float | None
    max_value: float | None
    metadata_: dict | None = Field(alias="metadata_")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class ProbeRequest(BaseModel):
    """Request a scalar value at a single spatial point."""

    point: list[float] = Field(min_length=3, max_length=3, description="[x, y, z]")
    field: ResultField


class LineRequest(BaseModel):
    """Request field values along a line segment."""

    start: list[float] = Field(min_length=3, max_length=3)
    end: list[float] = Field(min_length=3, max_length=3)
    n_points: int = Field(default=100, gt=1, le=10_000)
    field: ResultField


class ProbeResponse(BaseModel):
    point: list[float]
    field: str
    value: float | list[float]


class LineResponse(BaseModel):
    start: list[float]
    end: list[float]
    n_points: int
    field: str
    coordinates: list[list[float]]
    values: list[float | list[float]]
