"""Pydantic schemas for project endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=256)
    description: str | None = None
    workspace_id: uuid.UUID | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=256)
    description: str | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    workspace_id: uuid.UUID
    simulation_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectList(BaseModel):
    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int
