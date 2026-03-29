"""Project model - groups simulations inside a workspace."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, Base, TimestampMixin


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── relationships ─────────────────────────────────────────────────────
    workspace: Mapped["Workspace"] = relationship(back_populates="projects")  # noqa: F821
    simulations: Mapped[list["Simulation"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
