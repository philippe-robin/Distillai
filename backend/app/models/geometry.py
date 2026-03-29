"""Geometry model - stores CAD / primitive geometry metadata."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import BigInteger, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, JSONB, Base, TimestampMixin


class GeometryFormat(str, enum.Enum):
    stl = "stl"
    step = "step"
    primitive = "primitive"


class Geometry(TimestampMixin, Base):
    __tablename__ = "geometries"

    simulation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("simulations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    format: Mapped[GeometryFormat] = mapped_column(
        Enum(GeometryFormat, name="geometry_format", native_enum=False),
        nullable=False,
    )
    file_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    bounding_box: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    face_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    primitive_config: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)

    # ── relationships ─────────────────────────────────────────────────────
    simulation: Mapped["Simulation"] = relationship(back_populates="geometry")  # noqa: F821
