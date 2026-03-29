"""Project CRUD service with workspace access checks."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.simulation import Simulation
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.project import ProjectCreate, ProjectList, ProjectResponse, ProjectUpdate


async def verify_workspace_access(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user: User,
) -> Workspace:
    """Return the workspace if the user owns it, else raise ``PermissionError``."""
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if ws is None:
        raise LookupError("Workspace not found")
    if ws.owner_id != user.id:
        raise PermissionError("Access denied")
    return ws


async def _project_response(project: Project, db: AsyncSession) -> ProjectResponse:
    """Build a ``ProjectResponse`` with a simulation count."""
    count_result = await db.execute(
        select(func.count()).select_from(Simulation).where(Simulation.project_id == project.id)
    )
    sim_count = count_result.scalar() or 0
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        workspace_id=project.workspace_id,
        simulation_count=sim_count,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


async def create_project(
    db: AsyncSession,
    payload: ProjectCreate,
    user: User,
) -> ProjectResponse:
    """Create a project inside the given workspace."""
    await verify_workspace_access(db, payload.workspace_id, user)

    project = Project(
        name=payload.name,
        description=payload.description,
        workspace_id=payload.workspace_id,
    )
    db.add(project)
    await db.flush()
    return await _project_response(project, db)


async def list_projects(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user: User,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> ProjectList:
    """Return a paginated list of projects for the given workspace."""
    await verify_workspace_access(db, workspace_id, user)

    base_q = select(Project).where(Project.workspace_id == workspace_id)
    count_q = select(func.count()).select_from(Project).where(
        Project.workspace_id == workspace_id
    )

    if search:
        base_q = base_q.where(Project.name.ilike(f"%{search}%"))
        count_q = count_q.where(Project.name.ilike(f"%{search}%"))

    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        base_q.order_by(Project.updated_at.desc()).offset(offset).limit(page_size)
    )
    projects = result.scalars().all()

    items = [await _project_response(p, db) for p in projects]
    return ProjectList(items=items, total=total, page=page, page_size=page_size)


async def get_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    user: User,
) -> ProjectResponse:
    """Retrieve a single project by ID."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise LookupError("Project not found")
    await verify_workspace_access(db, project.workspace_id, user)
    return await _project_response(project, db)


async def update_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    user: User,
) -> ProjectResponse:
    """Update name and/or description."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise LookupError("Project not found")
    await verify_workspace_access(db, project.workspace_id, user)

    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    await db.flush()
    return await _project_response(project, db)


async def delete_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    user: User,
) -> None:
    """Delete a project and cascade to all child simulations."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise LookupError("Project not found")
    await verify_workspace_access(db, project.workspace_id, user)
    await db.delete(project)
    await db.flush()
