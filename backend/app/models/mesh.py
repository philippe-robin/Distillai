"""Mesh model - stores generated mesh metadata and quality metrics."""

from __future__ import annotations

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, JSONB, Base, TimestampMixin


class Mesh(TimestampMixin, Base):
    __tablename__ = "meshes"

    simulation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("simulations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    file_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    format: Mapped[str | None] = mapped_column(String(32), nullable=True)
    node_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    element_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_quality: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_quality: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_histogram: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    mesh_config: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)

    # ── relationships ─────────────────────────────────────────────────────
    simulation: Mapped["Simulation"] = relationship(back_populates="mesh")  # noqa: F821
