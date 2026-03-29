"""Result model - stores individual simulation output fields."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, JSONB, Base, TimestampMixin


class ResultField(str, enum.Enum):
    p = "p"
    U = "U"
    T = "T"
    k = "k"
    epsilon = "epsilon"
    residuals = "residuals"


class Result(TimestampMixin, Base):
    __tablename__ = "results"

    simulation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("simulations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field: Mapped[ResultField] = mapped_column(
        Enum(ResultField, name="result_field", native_enum=False),
        nullable=False,
    )
    time_step: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    min_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB(), nullable=True)

    # ── relationships ─────────────────────────────────────────────────────
    simulation: Mapped["Simulation"] = relationship(back_populates="results")  # noqa: F821
