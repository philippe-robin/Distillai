"""Workspace model - top-level organisational unit owned by a user."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import GUID, Base, TimestampMixin


class Workspace(TimestampMixin, Base):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── relationships ─────────────────────────────────────────────────────
    owner: Mapped["User"] = relationship(back_populates="workspaces")  # noqa: F821
    projects: Mapped[list["Project"]] = relationship(  # noqa: F821
        back_populates="workspace",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
