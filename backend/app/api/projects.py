"""Project CRUD endpoints scoped by workspace ownership."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.project import Project
from app.models.simulation import Simulation
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.project import ProjectCreate, ProjectList, ProjectResponse, ProjectUpdate

router = APIRouter()


async def _verify_workspace_ownership(
    workspace_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Workspace:
    """Return the workspace if the current user owns it, else 403."""
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    if workspace.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return workspace


async def _get_project_with_count(project: Project, db: AsyncSession) -> ProjectResponse:
    """Build a ProjectResponse including the simulation count."""
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


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    """Create a new project inside a workspace."""
    workspace_id = body.workspace_id
    if workspace_id is None:
        # Auto-select the user's first workspace
        ws_result = await db.execute(
            select(Workspace).where(Workspace.owner_id == user.id).limit(1)
        )
        ws = ws_result.scalar_one_or_none()
        if ws is None:
            raise HTTPException(status_code=404, detail="No workspace found")
        workspace_id = ws.id
    else:
        await _verify_workspace_ownership(workspace_id, user, db)
    project = Project(
        name=body.name,
        description=body.description,
        workspace_id=workspace_id,
    )
    db.add(project)
    await db.flush()
    return await _get_project_with_count(project, db)


@router.get("", response_model=ProjectList)
async def list_projects(
    workspace_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectList:
    """List projects in a workspace with pagination and optional search."""
    if workspace_id is None:
        # Auto-select the user's first workspace
        ws_result = await db.execute(
            select(Workspace).where(Workspace.owner_id == user.id).limit(1)
        )
        ws = ws_result.scalar_one_or_none()
        if ws is None:
            return ProjectList(items=[], total=0, page=page, page_size=page_size)
        workspace_id = ws.id
    else:
        await _verify_workspace_ownership(workspace_id, user, db)

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

    items = [await _get_project_with_count(p, db) for p in projects]
    return ProjectList(items=items, total=total, page=page, page_size=page_size)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    """Retrieve a single project by ID."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await _verify_workspace_ownership(project.workspace_id, user, db)
    return await _get_project_with_count(project, db)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    """Update project name and / or description."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await _verify_workspace_ownership(project.workspace_id, user, db)

    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    await db.flush()
    await db.refresh(project)
    return await _get_project_with_count(project, db)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a project and all its simulations (cascade)."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await _verify_workspace_ownership(project.workspace_id, user, db)
    await db.delete(project)
    await db.flush()
