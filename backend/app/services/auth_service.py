"""Authentication business logic (stateless helpers)."""

from __future__ import annotations

import uuid

from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.models.user import User
from app.models.workspace import Workspace


async def register_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    full_name: str,
) -> tuple[User, str]:
    """Create a new user with a default workspace and return (user, jwt)."""
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
    )
    db.add(user)
    await db.flush()

    workspace = Workspace(
        name=f"{full_name}'s Workspace",
        owner_id=user.id,
    )
    db.add(workspace)
    await db.flush()

    token = create_access_token(subject=str(user.id))
    return user, token


async def authenticate_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
) -> tuple[User, str]:
    """Verify credentials and return (user, jwt).  Raises ValueError on failure."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        raise ValueError("Invalid email or password")
    if not user.is_active:
        raise ValueError("Account is deactivated")
    token = create_access_token(subject=str(user.id))
    return user, token


async def get_user_from_token(db: AsyncSession, token: str) -> User:
    """Resolve a JWT to a User ORM instance.  Raises ValueError on failure."""
    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise ValueError(f"Invalid token: {exc}") from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise ValueError("User not found or inactive")
    return user
