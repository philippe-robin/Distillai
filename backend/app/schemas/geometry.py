"""Pydantic schemas for geometry endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.geometry import GeometryFormat


class PrimitiveCreate(BaseModel):
    """Request body for generating a primitive geometry via Gmsh."""

    simulation_id: uuid.UUID
    type: str = Field(
        description="Primitive type: box, cylinder, sphere, or tube",
        pattern=r"^(box|cylinder|sphere|tube)$",
    )
    params: dict[str, Any] = Field(
        description="Primitive-specific parameters (e.g. width, height, radius, ...)"
    )


class GeometryResponse(BaseModel):
    id: uuid.UUID
    simulation_id: uuid.UUID
    format: GeometryFormat
    filename: str | None = None
    file_size: int | None = None
    bounding_box: dict | None = None
    face_count: int | None = None
    vertex_count: int | None = None
    primitive_config: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj: Any, **kwargs: Any) -> "GeometryResponse":
        """Custom validation that maps DB fields to API fields."""
        from app.models.geometry import Geometry as GeometryModel

        if isinstance(obj, GeometryModel):
            # Extract filename from file_key
            filename = None
            if obj.file_key:
                filename = obj.file_key.rsplit("/", 1)[-1]

            # Convert bounding_box from {min: {x,y,z}, max: {x,y,z}} to {min: [x,y,z], max: [x,y,z]}
            bbox = None
            if obj.bounding_box:
                raw = obj.bounding_box
                try:
                    min_vals = raw.get("min", {})
                    max_vals = raw.get("max", {})
                    if isinstance(min_vals, dict):
                        bbox = {
                            "min": [min_vals.get("x", 0), min_vals.get("y", 0), min_vals.get("z", 0)],
                            "max": [max_vals.get("x", 0), max_vals.get("y", 0), max_vals.get("z", 0)],
                        }
                    else:
                        bbox = raw  # Already in array format
                except Exception:
                    bbox = None

            # Compute vertex_count from face_count (3 vertices per triangle)
            vertex_count = (obj.face_count or 0) * 3

            return cls(
                id=obj.id,
                simulation_id=obj.simulation_id,
                format=obj.format,
                filename=filename,
                file_size=obj.file_size_bytes,
                bounding_box=bbox,
                face_count=obj.face_count,
                vertex_count=vertex_count,
                primitive_config=obj.primitive_config,
                created_at=obj.created_at,
                updated_at=obj.updated_at,
            )

        return super().model_validate(obj, **kwargs)
