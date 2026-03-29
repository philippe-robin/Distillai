"""Simulation model - the central entity of every CFD run."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, JSONB, Base, TimestampMixin


class SimulationStatus(str, enum.Enum):
    draft = "draft"
    meshing = "meshing"
    mesh_ready = "mesh_ready"
    mesh_failed = "mesh_failed"
    running = "running"
    converged = "converged"
    diverged = "diverged"
    cancelled = "cancelled"
    failed = "failed"


class SimulationType(str, enum.Enum):
    cfd_steady = "cfd_steady"
    cfd_transient = "cfd_transient"


# Valid status transitions
VALID_STATUS_TRANSITIONS: dict[SimulationStatus, set[SimulationStatus]] = {
    SimulationStatus.draft: {SimulationStatus.meshing},
    SimulationStatus.meshing: {SimulationStatus.mesh_ready, SimulationStatus.mesh_failed},
    SimulationStatus.mesh_ready: {SimulationStatus.running, SimulationStatus.meshing},
    SimulationStatus.mesh_failed: {SimulationStatus.meshing},
    SimulationStatus.running: {
        SimulationStatus.converged,
        SimulationStatus.diverged,
        SimulationStatus.cancelled,
        SimulationStatus.failed,
    },
    SimulationStatus.converged: {SimulationStatus.running},  # allow re-run
    SimulationStatus.diverged: {SimulationStatus.running, SimulationStatus.meshing},
    SimulationStatus.cancelled: {SimulationStatus.running, SimulationStatus.meshing},
    SimulationStatus.failed: {SimulationStatus.running, SimulationStatus.meshing},
}


class Simulation(TimestampMixin, Base):
    __tablename__ = "simulations"

    name: Mapped[str] = mapped_column(String(256), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[SimulationStatus] = mapped_column(
        Enum(SimulationStatus, name="simulation_status", native_enum=False),
        default=SimulationStatus.draft,
        nullable=False,
    )
    sim_type: Mapped[SimulationType] = mapped_column(
        Enum(SimulationType, name="simulation_type", native_enum=False),
        default=SimulationType.cfd_steady,
        nullable=False,
    )

    # ── configuration (JSONB) ─────────────────────────────────────────────
    physics_config: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    solver_config: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    boundary_conditions: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)

    # ── execution tracking ────────────────────────────────────────────────
    celery_task_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    progress_pct: Mapped[float | None] = mapped_column(Float, nullable=True, default=0.0)
    current_iteration: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    max_iterations: Mapped[int | None] = mapped_column(Integer, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── relationships ─────────────────────────────────────────────────────
    project: Mapped["Project"] = relationship(back_populates="simulations")  # noqa: F821
    geometry: Mapped["Geometry | None"] = relationship(  # noqa: F821
        back_populates="simulation",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    mesh: Mapped["Mesh | None"] = relationship(  # noqa: F821
        back_populates="simulation",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    results: Mapped[list["Result"]] = relationship(  # noqa: F821
        back_populates="simulation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def can_transition_to(self, new_status: SimulationStatus) -> bool:
        """Return True if transitioning from current status to *new_status* is allowed."""
        return new_status in VALID_STATUS_TRANSITIONS.get(self.status, set())
