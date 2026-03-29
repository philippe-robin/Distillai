"""Tests for project CRUD endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _get_workspace_id(client: AsyncClient, auth_headers: dict) -> str:
    """Helper: retrieve the default workspace ID for the authenticated user.

    Since registration creates a default workspace, we create a project
    and read the workspace_id from it. But first we need the workspace.
    We use a small hack: list all projects for a known workspace.
    Actually, we need to figure out the workspace ID from the user.
    Let's use the user workspaces indirectly - create a project in each
    workspace until one works. Or we look at the DB.

    Simpler approach: the test user fixture already created a user with
    a workspace. We can get the workspace by querying the underlying DB.
    But that couples us to the implementation. Let's instead add a
    workspace endpoint or just test that the workspace was created.

    For now, let's use the registration response's user ID to find
    the workspace through a known pattern.
    """
    # Register a new user to get a clean workspace
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "project-ws@example.com",
            "password": "testpassword123",
            "full_name": "Project WS User",
        },
    )
    if resp.status_code == 201:
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
    else:
        headers = auth_headers

    # We need the workspace ID. Since there's no list-workspaces endpoint,
    # query the DB directly through the test session. Instead, we'll use
    # SQLAlchemy directly in the test.
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession

    from tests.conftest import TestSessionLocal
    from app.models.workspace import Workspace

    async with TestSessionLocal() as session:
        result = await session.execute(select(Workspace).limit(1))
        ws = result.scalar_one_or_none()
        if ws is not None:
            return str(ws.id)

    raise RuntimeError("No workspace found")


@pytest.mark.asyncio
async def test_create_project(
    client: AsyncClient, test_user: dict, auth_headers: dict
) -> None:
    """POST /projects creates a new project."""
    workspace_id = await _get_workspace_id(client, auth_headers)

    response = await client.post(
        "/api/v1/projects/",
        json={
            "name": "Wind Tunnel Sim",
            "description": "Test project for CFD",
            "workspace_id": workspace_id,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Wind Tunnel Sim"
    assert data["description"] == "Test project for CFD"
    assert data["workspace_id"] == workspace_id
    assert data["simulation_count"] == 0
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_list_projects(
    client: AsyncClient, test_user: dict, auth_headers: dict
) -> None:
    """GET /projects returns paginated list."""
    workspace_id = await _get_workspace_id(client, auth_headers)

    # Create two projects
    for name in ["Project Alpha", "Project Beta"]:
        await client.post(
            "/api/v1/projects/",
            json={"name": name, "workspace_id": workspace_id},
            headers=auth_headers,
        )

    response = await client.get(
        f"/api/v1/projects/?workspace_id={workspace_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 2
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_get_project(
    client: AsyncClient, test_user: dict, auth_headers: dict
) -> None:
    """GET /projects/{id} returns a single project."""
    workspace_id = await _get_workspace_id(client, auth_headers)

    create_resp = await client.post(
        "/api/v1/projects/",
        json={"name": "Single Project", "workspace_id": workspace_id},
        headers=auth_headers,
    )
    project_id = create_resp.json()["id"]

    response = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Single Project"


@pytest.mark.asyncio
async def test_update_project(
    client: AsyncClient, test_user: dict, auth_headers: dict
) -> None:
    """PATCH /projects/{id} updates name and description."""
    workspace_id = await _get_workspace_id(client, auth_headers)

    create_resp = await client.post(
        "/api/v1/projects/",
        json={"name": "Old Name", "workspace_id": workspace_id},
        headers=auth_headers,
    )
    project_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "New Name", "description": "Updated desc"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["description"] == "Updated desc"


@pytest.mark.asyncio
async def test_delete_project(
    client: AsyncClient, test_user: dict, auth_headers: dict
) -> None:
    """DELETE /projects/{id} removes the project."""
    workspace_id = await _get_workspace_id(client, auth_headers)

    create_resp = await client.post(
        "/api/v1/projects/",
        json={"name": "To Delete", "workspace_id": workspace_id},
        headers=auth_headers,
    )
    project_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/v1/projects/{project_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify it's gone
    get_resp = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_project_search(
    client: AsyncClient, test_user: dict, auth_headers: dict
) -> None:
    """GET /projects with search parameter filters results."""
    workspace_id = await _get_workspace_id(client, auth_headers)

    await client.post(
        "/api/v1/projects/",
        json={"name": "CFD Simulation", "workspace_id": workspace_id},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/projects/",
        json={"name": "Heat Transfer", "workspace_id": workspace_id},
        headers=auth_headers,
    )

    response = await client.get(
        f"/api/v1/projects/?workspace_id={workspace_id}&search=CFD",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert all("CFD" in item["name"] for item in data["items"])


@pytest.mark.asyncio
async def test_project_not_found(client: AsyncClient, auth_headers: dict) -> None:
    """GET /projects/{id} with nonexistent ID returns 404."""
    import uuid

    response = await client.get(
        f"/api/v1/projects/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_project_unauthorized(client: AsyncClient) -> None:
    """Endpoints require authentication."""
    import uuid

    response = await client.get(
        f"/api/v1/projects/?workspace_id={uuid.uuid4()}",
    )
    assert response.status_code in (401, 403)
