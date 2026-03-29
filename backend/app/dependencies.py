"""Shared FastAPI dependency functions."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import decode_access_token
from app.core.storage import StorageClient, get_storage_client
from app.models.user import User

bearer_scheme = HTTPBearer()


# ── Database session ──────────────────────────────────────────────────────


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session with automatic commit / rollback."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Current user (JWT) ───────────────────────────────────────────────────


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the JWT from the ``Authorization`` header.

    Returns the corresponding ``User`` ORM instance or raises 401.
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


# ── Storage ───────────────────────────────────────────────────────────────


def get_storage() -> StorageClient:
    """Return the S3 / MinIO storage client."""
    return get_storage_client()
