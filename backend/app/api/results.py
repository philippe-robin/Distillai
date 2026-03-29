"""Result retrieval and post-processing endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import StorageClient
from app.dependencies import get_current_user, get_db, get_storage
from app.models.project import Project
from app.models.result import Result
from app.models.simulation import Simulation
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.result import (
    LineRequest,
    LineResponse,
    ProbeResponse,
    ResultResponse,
)

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


@router.get("/{simulation_id}", response_model=list[ResultResponse])
async def list_results(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ResultResponse]:
    """List all available result fields and timesteps for a simulation."""
    await _authorise_simulation(simulation_id, user, db)

    result = await db.execute(
        select(Result)
        .where(Result.simulation_id == simulation_id)
        .order_by(Result.field, Result.time_step)
    )
    return [ResultResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/{simulation_id}/{field}")
async def download_result_field(
    simulation_id: uuid.UUID,
    field: str,
    time_step: int | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageClient = Depends(get_storage),
) -> Response:
    """Download a specific result field as a VTK file."""
    await _authorise_simulation(simulation_id, user, db)

    query = select(Result).where(
        Result.simulation_id == simulation_id,
        Result.field == field,
    )
    if time_step is not None:
        query = query.where(Result.time_step == time_step)
    else:
        query = query.order_by(Result.time_step.desc()).limit(1)

    result = await db.execute(query)
    res = result.scalar_one_or_none()
    if res is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No result found for field '{field}'",
        )

    if res.file_key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result file not available",
        )

    data = storage.download_file(res.file_key)
    filename = res.file_key.rsplit("/", 1)[-1]
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{simulation_id}/probe", response_model=ProbeResponse)
async def probe_point(
    simulation_id: uuid.UUID,
    point: str = Query(..., description="x,y,z coordinates"),
    field: str = Query(default="p"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProbeResponse:
    """Probe a scalar or vector value at a single spatial point (stub)."""
    await _authorise_simulation(simulation_id, user, db)

    try:
        coords = [float(x.strip()) for x in point.split(",")]
        if len(coords) != 3:
            raise ValueError("Expected 3 coordinates")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid point format: {exc}. Use 'x,y,z'.",
        ) from exc

    from app.services.result_service import get_field_data_for_probe

    value = get_field_data_for_probe(
        case_dir="",  # stub - would need actual case directory
        point=coords,
        field=field,
    )

    return ProbeResponse(point=coords, field=field, value=value)


@router.post("/{simulation_id}/line", response_model=LineResponse)
async def line_sample(
    simulation_id: uuid.UUID,
    body: LineRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LineResponse:
    """Sample field values along a line segment (stub)."""
    await _authorise_simulation(simulation_id, user, db)

    from app.services.result_service import get_field_data_for_line

    coordinates, values = get_field_data_for_line(
        case_dir="",  # stub
        start=body.start,
        end=body.end,
        field=body.field.value,
        n_points=body.n_points,
    )

    return LineResponse(
        start=body.start,
        end=body.end,
        n_points=body.n_points,
        field=body.field.value,
        coordinates=coordinates,
        values=values,
    )
