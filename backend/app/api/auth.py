"""Authentication endpoints: register, login, me."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Create a new user account with a default workspace and return a JWT."""
    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    await db.flush()  # assign user.id

    # Create a default workspace for the new user
    workspace = Workspace(
        name=f"{body.full_name}'s Workspace",
        owner_id=user.id,
    )
    db.add(workspace)
    await db.flush()

    token = create_access_token(subject=str(user.id))
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=Token)
async def login(
    body: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Authenticate with email + password and return a JWT."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    token = create_access_token(subject=str(user.id))
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)
