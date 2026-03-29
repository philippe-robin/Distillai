"""Declarative base and common mixins for all SQLAlchemy models."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String, Text, TypeDecorator, func
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class GUID(TypeDecorator):
    """Platform-independent UUID type.

    Uses PostgreSQL's native UUID when available, otherwise stores as
    a 36-character string (for SQLite in tests).
    """

    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid.UUID):
                return str(value) if dialect.name != "postgresql" else value
            return str(uuid.UUID(value)) if dialect.name != "postgresql" else uuid.UUID(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value


class JSONB(TypeDecorator):
    """Platform-independent JSONB type.

    Uses PostgreSQL's native JSONB when available, otherwise stores as
    JSON-encoded TEXT (for SQLite in tests).
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_JSONB())
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is not None and dialect.name != "postgresql":
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and dialect.name != "postgresql":
            if isinstance(value, str):
                return json.loads(value)
        return value


class Base(DeclarativeBase):
    """Shared declarative base for every ORM model."""


class TimestampMixin:
    """Mixin that adds ``id`` (UUID PK), ``created_at`` and ``updated_at``."""

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
