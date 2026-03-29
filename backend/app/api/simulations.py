"""Simulation CRUD + launch / cancel endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.project import Project
from app.models.simulation import Simulation, SimulationStatus
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.simulation import SimulationCreate, SimulationResponse, SimulationUpdate

router = APIRouter()


async def _authorise_simulation(
    simulation_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Simulation:
    """Load simulation and verify the current user owns the parent workspace."""
    result = await db.execute(select(Simulation).where(Simulation.id == simulation_id))
    sim = result.scalar_one_or_none()
    if sim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")

    project_result = await db.execute(select(Project).where(Project.id == sim.project_id))
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    ws_result = await db.execute(select(Workspace).where(Workspace.id == project.workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if workspace is None or workspace.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return sim


@router.post("", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
async def create_simulation(
    body: SimulationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationResponse:
    """Create a new simulation inside a project."""
    # Verify project ownership
    project_result = await db.execute(select(Project).where(Project.id == body.project_id))
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    ws_result = await db.execute(select(Workspace).where(Workspace.id == project.workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if workspace is None or workspace.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sim = Simulation(
        name=body.name,
        project_id=body.project_id,
        sim_type=body.sim_type,
        physics_config=body.physics_config.model_dump() if body.physics_config else None,
        solver_config=body.solver_config.model_dump() if body.solver_config else None,
        boundary_conditions=(
            [bc.model_dump() for bc in body.boundary_conditions]
            if body.boundary_conditions
            else None
        ),
        max_iterations=(
            body.solver_config.n_iterations if body.solver_config else 1000
        ),
    )
    db.add(sim)
    await db.flush()
    return SimulationResponse.model_validate(sim)


@router.get("", response_model=list[SimulationResponse])
async def list_simulations(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SimulationResponse]:
    """List all simulations for a project."""
    # Verify project ownership
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    ws_result = await db.execute(select(Workspace).where(Workspace.id == project.workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if workspace is None or workspace.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = await db.execute(
        select(Simulation)
        .where(Simulation.project_id == project_id)
        .order_by(Simulation.updated_at.desc())
    )
    return [SimulationResponse.model_validate(s) for s in result.scalars().all()]


@router.get("/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationResponse:
    """Retrieve a single simulation by ID."""
    sim = await _authorise_simulation(simulation_id, user, db)
    return SimulationResponse.model_validate(sim)


@router.patch("/{simulation_id}", response_model=SimulationResponse)
async def update_simulation(
    simulation_id: uuid.UUID,
    body: SimulationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationResponse:
    """Update simulation configuration.  Only allowed in ``draft`` or ``mesh_ready`` status."""
    sim = await _authorise_simulation(simulation_id, user, db)
    if sim.status not in (SimulationStatus.draft, SimulationStatus.mesh_ready):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot edit simulation in '{sim.status}' state",
        )

    if body.name is not None:
        sim.name = body.name
    if body.physics_config is not None:
        sim.physics_config = body.physics_config.model_dump()
    if body.solver_config is not None:
        sim.solver_config = body.solver_config.model_dump()
        sim.max_iterations = body.solver_config.n_iterations
    if body.boundary_conditions is not None:
        sim.boundary_conditions = [bc.model_dump() for bc in body.boundary_conditions]

    await db.flush()
    return SimulationResponse.model_validate(sim)


@router.delete("/{simulation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_simulation(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a simulation.  Not allowed while running."""
    sim = await _authorise_simulation(simulation_id, user, db)
    if sim.status in (SimulationStatus.meshing, SimulationStatus.running):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a simulation that is currently running",
        )
    await db.delete(sim)
    await db.flush()


@router.post("/{simulation_id}/launch", response_model=SimulationResponse)
async def launch_simulation(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationResponse:
    """Launch the solver for a simulation that has a ready mesh."""
    sim = await _authorise_simulation(simulation_id, user, db)
    if not sim.can_transition_to(SimulationStatus.running):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot launch from '{sim.status}' status",
        )

    # Import here to avoid circular dependency with celery
    from app.tasks.solver_tasks import run_simulation_task

    task = run_simulation_task.delay(str(sim.id))
    sim.status = SimulationStatus.running
    sim.celery_task_id = task.id
    sim.started_at = datetime.now(UTC)
    sim.progress_pct = 0.0
    sim.current_iteration = 0
    await db.flush()
    return SimulationResponse.model_validate(sim)


@router.post("/{simulation_id}/cancel", response_model=SimulationResponse)
async def cancel_simulation(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationResponse:
    """Cancel a running simulation."""
    sim = await _authorise_simulation(simulation_id, user, db)
    if sim.status != SimulationStatus.running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Simulation is not running",
        )

    # Revoke the Celery task
    if sim.celery_task_id:
        from app.tasks.celery_app import celery_app

        celery_app.control.revoke(sim.celery_task_id, terminate=True)

    sim.status = SimulationStatus.cancelled
    sim.completed_at = datetime.now(UTC)
    await db.flush()
    return SimulationResponse.model_validate(sim)


@router.get("/{simulation_id}/status")
async def get_simulation_status(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return lightweight status info for polling."""
    sim = await _authorise_simulation(simulation_id, user, db)
    return {
        "id": str(sim.id),
        "status": sim.status.value,
        "progress_pct": sim.progress_pct,
        "current_iteration": sim.current_iteration,
        "max_iterations": sim.max_iterations,
    }
