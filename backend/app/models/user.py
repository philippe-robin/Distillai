"""User account model."""

from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(320), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    full_name: Mapped[str] = mapped_column(String(256), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── relationships ─────────────────────────────────────────────────────
    workspaces: Mapped[list["Workspace"]] = relationship(  # noqa: F821
        back_populates="owner",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
