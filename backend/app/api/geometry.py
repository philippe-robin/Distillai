"""Geometry upload / generation endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import StorageClient
from app.dependencies import get_current_user, get_db, get_storage
from app.models.geometry import Geometry, GeometryFormat
from app.models.project import Project
from app.models.simulation import Simulation
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.geometry import GeometryResponse, PrimitiveCreate
from app.services.geometry_service import generate_primitive, process_uploaded_geometry

router = APIRouter()


async def _authorise_simulation_for_geometry(
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


@router.post("/upload", response_model=GeometryResponse, status_code=status.HTTP_201_CREATED)
async def upload_geometry(
    simulation_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageClient = Depends(get_storage),
) -> GeometryResponse:
    """Upload a geometry file (STL or STEP) for a simulation."""
    sim = await _authorise_simulation_for_geometry(simulation_id, user, db)

    # Determine format from filename
    filename = file.filename or "geometry.stl"
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext in ("stl",):
        geo_format = GeometryFormat.stl
    elif ext in ("step", "stp"):
        geo_format = GeometryFormat.step
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported geometry format: {ext}. Use STL or STEP.",
        )

    data = await file.read()
    file_key = f"simulations/{sim.id}/geometry/{filename}"

    # Upload to S3
    storage.upload_file(file_key, data, content_type=file.content_type or "application/octet-stream")

    # Process geometry to extract metadata
    metadata = process_uploaded_geometry(data, geo_format)

    # Delete existing geometry if any
    existing_result = await db.execute(
        select(Geometry).where(Geometry.simulation_id == sim.id)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    geometry = Geometry(
        simulation_id=sim.id,
        format=geo_format,
        file_key=file_key,
        file_size_bytes=len(data),
        bounding_box=metadata.get("bounding_box"),
        face_count=metadata.get("face_count"),
    )
    db.add(geometry)
    await db.flush()
    return GeometryResponse.model_validate(geometry)


@router.post("/primitive", response_model=GeometryResponse, status_code=status.HTTP_201_CREATED)
async def create_primitive(
    body: PrimitiveCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageClient = Depends(get_storage),
) -> GeometryResponse:
    """Generate a primitive geometry (box, cylinder, sphere, tube) via Gmsh."""
    sim = await _authorise_simulation_for_geometry(body.simulation_id, user, db)

    result = generate_primitive(body.type, body.params)
    stl_data = result["stl_data"]
    file_key = f"simulations/{sim.id}/geometry/primitive_{body.type}.stl"
    storage.upload_file(file_key, stl_data, content_type="model/stl")

    # Delete existing geometry if any
    existing_result = await db.execute(
        select(Geometry).where(Geometry.simulation_id == sim.id)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    geometry = Geometry(
        simulation_id=sim.id,
        format=GeometryFormat.primitive,
        file_key=file_key,
        file_size_bytes=len(stl_data),
        bounding_box=result.get("bounding_box"),
        face_count=result.get("face_count"),
        primitive_config={"type": body.type, "params": body.params},
    )
    db.add(geometry)
    await db.flush()
    return GeometryResponse.model_validate(geometry)


@router.get("/by-simulation/{simulation_id}", response_model=GeometryResponse)
async def get_geometry_by_simulation(
    simulation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GeometryResponse:
    """Retrieve geometry metadata by simulation ID."""
    await _authorise_simulation_for_geometry(simulation_id, user, db)
    result = await db.execute(
        select(Geometry).where(Geometry.simulation_id == simulation_id)
    )
    geo = result.scalar_one_or_none()
    if geo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geometry not found")
    return GeometryResponse.model_validate(geo)


@router.get("/{geometry_id}", response_model=GeometryResponse)
async def get_geometry(
    geometry_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GeometryResponse:
    """Retrieve geometry metadata by ID."""
    result = await db.execute(select(Geometry).where(Geometry.id == geometry_id))
    geo = result.scalar_one_or_none()
    if geo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geometry not found")
    # Verify ownership
    await _authorise_simulation_for_geometry(geo.simulation_id, user, db)
    return GeometryResponse.model_validate(geo)


@router.get("/{geometry_id}/download")
async def download_geometry(
    geometry_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageClient = Depends(get_storage),
) -> Response:
    """Download the geometry file."""
    result = await db.execute(select(Geometry).where(Geometry.id == geometry_id))
    geo = result.scalar_one_or_none()
    if geo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geometry not found")
    await _authorise_simulation_for_geometry(geo.simulation_id, user, db)

    if geo.file_key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No geometry file available"
        )

    data = storage.download_file(geo.file_key)
    ext = geo.file_key.rsplit(".", 1)[-1]
    media_type = "model/stl" if ext == "stl" else "application/octet-stream"
    filename = geo.file_key.rsplit("/", 1)[-1]
    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
