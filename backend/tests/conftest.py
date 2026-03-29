"""Shared test fixtures: async test client, in-memory SQLite DB, test user."""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import create_access_token, hash_password
from app.models.base import Base

# ---------------------------------------------------------------------------
# Event loop
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the whole test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ---------------------------------------------------------------------------
# Database (async SQLite in-memory)
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a fresh database session with all tables created."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ---------------------------------------------------------------------------
# Override dependencies
# ---------------------------------------------------------------------------

async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Override the get_db dependency to use the test database."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# FastAPI test client
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP client pointing at the test app."""
    # Reset DB tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    from app.dependencies import get_db
    from app.main import app

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Test user + auth helpers
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def test_user(client: AsyncClient) -> dict:
    """Register a test user and return user info + auth token."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@alchemsim.dev",
            "password": "testpassword123",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 201, response.text
    data = response.json()
    return {
        "id": data["user"]["id"],
        "email": data["user"]["email"],
        "full_name": data["user"]["full_name"],
        "access_token": data["access_token"],
    }


@pytest_asyncio.fixture
async def auth_headers(test_user: dict) -> dict[str, str]:
    """Return Authorization headers for the test user."""
    return {"Authorization": f"Bearer {test_user['access_token']}"}


@pytest_asyncio.fixture
async def test_workspace(client: AsyncClient, test_user: dict, auth_headers: dict) -> dict:
    """Return the default workspace created during registration."""
    # The registration endpoint creates a default workspace.
    # We need to find it - get user's workspaces via the me endpoint
    # For now, we know the workspace is created with name "{full_name}'s Workspace"
    # Let's get it from the DB through a project creation test
    return {
        "user_id": test_user["id"],
        "token": test_user["access_token"],
    }
