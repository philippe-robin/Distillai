"""Tests for authentication endpoints: register, login, me."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient) -> None:
    """Registering a new user returns 201 with a JWT and user info."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "alice@example.com",
            "password": "securepassword",
            "full_name": "Alice Smith",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["full_name"] == "Alice Smith"
    assert data["user"]["is_active"] is True
    assert "id" in data["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    """Attempting to register with an existing email returns 409."""
    payload = {
        "email": "dupe@example.com",
        "password": "securepassword",
        "full_name": "First User",
    }
    resp1 = await client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    payload["full_name"] = "Second User"
    resp2 = await client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 409


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient) -> None:
    """Passwords shorter than 8 characters are rejected."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "short@example.com",
            "password": "abc",
            "full_name": "Short Password",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient) -> None:
    """Valid credentials return a JWT."""
    # Register first
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "correcthorse",
            "full_name": "Login Test",
        },
    )

    # Now login
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "login@example.com",
            "password": "correcthorse",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient) -> None:
    """Invalid password returns 401."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrong@example.com",
            "password": "correctpassword",
            "full_name": "Wrong PW",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "wrong@example.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient) -> None:
    """Login with unknown email returns 401."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "nobody@example.com",
            "password": "whatever",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, test_user: dict, auth_headers: dict) -> None:
    """GET /auth/me returns the current user when authenticated."""
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user["email"]
    assert data["full_name"] == test_user["full_name"]


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient) -> None:
    """GET /auth/me without a token returns 401 or 403."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient) -> None:
    """GET /auth/me with a bad token returns 401."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert response.status_code == 401
