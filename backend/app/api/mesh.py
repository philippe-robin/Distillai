"""Mesh generation and retrieval endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import StorageClient
from app.dependencies import get_current_user, get_db, get_storage
from app.models.mesh import Mesh
from app.models.project import Project
from app.models.simulation import Simulation, SimulationStatus
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.mesh import MeshGenerateRequest, MeshResponse

router = APIRouter()


async def _authorise_simulation(
    simulation_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Simulation:
    """Verify ownership chain: user -> workspace -> project -> simulation."""
    result = await db.execute(select(Simulation).where(Simulation.id == simulation_id))
    sim = result.scalar_one_or_none()
    if sim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")

    project_result = await db.execute(select(Project).where(Project.id == sim.project_id))
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    ws_result = await db.execute(select(Workspace).where(Workspace.id == project.workspace_id))
    ws = ws_result.scalar_one_or_none()
    if ws is None or ws.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return sim


@router.post("/generate", response_model=MeshResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_mesh(
    body: MeshGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeshResponse:
    """Enqueue a mesh generation task via Celery.

    The simulation must have geometry attached and be in a meshable state.
    """
    sim = await _authorise_simulation(body.simulation_id, user, db)

    if sim.geometry is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No geometry attached to this simulation",
        )

    if not sim.can_transition_to(SimulationStatus.meshing):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot start meshing from '{sim.status}' status",
        )

    # Dispatch Celery task
    from app.tasks.mesh_tasks import generate_mesh_task

    task = generate_mesh_task.delay(
        str(sim.id),
        body.element_size,
        [z.model_dump() for z in body.refinement_zones],
    )

    sim.status = SimulationStatus.meshing
    sim.celery_task_id = task.id
    await db.flush()

    # Create or update mesh record
    existing_result = await db.execute(
        select(Mesh).where(Mesh.simulation_id == sim.id)
    )
    mesh = existing_result.scalar_one_or_none()
    if mesh is None:
        mesh = Mesh(
            simulation_id=sim.id,
            mesh_config={
                "element_size": body.element_size,
                "refinement_zones": [z.model_dump() for z in body.refinement_zones],
            },
        )
        db.add(mesh)
    else:
        mesh.mesh_config = {
            "element_size": body.element_size,
            "refinement_zones": [z.model_dump() for z in body.refinement_zones],
        }
        mesh.node_count = None
        mesh.element_count = None
        mesh.min_quality = None
        mesh.avg_quality = None
    await db.flush()

    return MeshResponse.model_validate(mesh)


@router.get("/{simulation_id}", response_model=MeshResponse)
async def get_mesh(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeshResponse:
    """Retrieve mesh metadata and quality metrics for a simulation."""
    await _authorise_simulation(simulation_id, user, db)

    result = await db.execute(select(Mesh).where(Mesh.simulation_id == simulation_id))
    mesh = result.scalar_one_or_none()
    if mesh is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mesh found for this simulation",
        )
    return MeshResponse.model_validate(mesh)


@router.get("/{simulation_id}/download")
async def download_mesh(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageClient = Depends(get_storage),
) -> Response:
    """Download the generated mesh file."""
    await _authorise_simulation(simulation_id, user, db)

    result = await db.execute(select(Mesh).where(Mesh.simulation_id == simulation_id))
    mesh = result.scalar_one_or_none()
    if mesh is None or mesh.file_key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mesh file available",
        )

    data = storage.download_file(mesh.file_key)
    filename = mesh.file_key.rsplit("/", 1)[-1]
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{simulation_id}/preview")
async def preview_mesh(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageClient = Depends(get_storage),
) -> Response:
    """Return the surface mesh as STL for 3D preview in the frontend."""
    await _authorise_simulation(simulation_id, user, db)

    result = await db.execute(select(Mesh).where(Mesh.simulation_id == simulation_id))
    mesh = result.scalar_one_or_none()
    if mesh is None or mesh.file_key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mesh file available",
        )

    import tempfile
    from pathlib import Path

    from app.services.mesh_service import export_surface_stl

    mesh_data = storage.download_file(mesh.file_key)

    with tempfile.NamedTemporaryFile(suffix=".msh", delete=False) as tmp:
        tmp.write(mesh_data)
        tmp_path = tmp.name

    try:
        stl_data = export_surface_stl(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not stl_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate surface mesh preview",
        )

    return Response(
        content=stl_data,
        media_type="model/stl",
        headers={"Content-Disposition": 'inline; filename="preview.stl"'},
    )
