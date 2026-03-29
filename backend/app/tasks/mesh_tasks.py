"""Celery tasks for mesh generation."""

from __future__ import annotations

import logging
import tempfile
import uuid
from pathlib import Path

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.generate_mesh")
def generate_mesh_task(
    self,
    simulation_id: str,
    element_size: float = 0.1,
    refinement_zones: list | None = None,
) -> dict:
    """Download geometry from S3, run Gmsh meshing, upload result, update DB.

    This task runs synchronously inside a Celery worker process.
    """
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session

    from app.api.ws import publish_simulation_update_sync
    from app.config import settings
    from app.core.storage import StorageClient
    from app.models.geometry import Geometry
    from app.models.mesh import Mesh
    from app.models.simulation import Simulation, SimulationStatus
    from app.services.mesh_service import generate_mesh

    # Use synchronous database connection for Celery
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2").replace(
        "postgresql+psycopg2", "postgresql"
    )
    if sync_url.startswith("postgresql+asyncpg"):
        sync_url = sync_url.replace("postgresql+asyncpg", "postgresql")
    elif "asyncpg" in sync_url:
        sync_url = sync_url.replace("asyncpg", "psycopg2")

    engine = create_engine(sync_url)
    storage = StorageClient()

    sim_uuid = uuid.UUID(simulation_id)

    try:
        with Session(engine) as session:
            # Load simulation and geometry
            sim = session.execute(
                select(Simulation).where(Simulation.id == sim_uuid)
            ).scalar_one()
            geometry = session.execute(
                select(Geometry).where(Geometry.simulation_id == sim_uuid)
            ).scalar_one()

            if geometry.file_key is None:
                raise ValueError("Geometry has no file_key")

            # Download geometry from S3
            geo_data = storage.download_file(geometry.file_key)

            # Write to temp file
            ext = geometry.file_key.rsplit(".", 1)[-1]
            with tempfile.NamedTemporaryFile(
                suffix=f".{ext}", delete=False
            ) as tmp:
                tmp.write(geo_data)
                geo_path = tmp.name

            publish_simulation_update_sync(simulation_id, {
                "type": "mesh_progress",
                "status": "meshing",
                "message": "Generating mesh...",
                "progress": 10,
            })

            try:
                # Run mesh generation
                result = generate_mesh(
                    geometry_path=geo_path,
                    element_size=element_size,
                    refinement_zones=refinement_zones,
                )

                publish_simulation_update_sync(simulation_id, {
                    "type": "mesh_progress",
                    "status": "meshing",
                    "message": "Uploading mesh...",
                    "progress": 80,
                })

                # Upload mesh to S3
                mesh_key = f"simulations/{simulation_id}/mesh/mesh.msh"
                if result.mesh_data:
                    storage.upload_file(mesh_key, result.mesh_data)
                else:
                    mesh_key = None

                # Update mesh record
                mesh = session.execute(
                    select(Mesh).where(Mesh.simulation_id == sim_uuid)
                ).scalar_one_or_none()

                if mesh is None:
                    mesh = Mesh(simulation_id=sim_uuid)
                    session.add(mesh)

                mesh.file_key = mesh_key
                mesh.format = "msh"
                mesh.node_count = result.node_count
                mesh.element_count = result.element_count
                mesh.min_quality = result.min_quality
                mesh.avg_quality = result.avg_quality
                mesh.quality_histogram = result.quality_histogram

                # Update simulation status
                sim.status = SimulationStatus.mesh_ready
                session.commit()

                publish_simulation_update_sync(simulation_id, {
                    "type": "mesh_complete",
                    "status": "mesh_ready",
                    "node_count": result.node_count,
                    "element_count": result.element_count,
                    "min_quality": result.min_quality,
                    "avg_quality": result.avg_quality,
                })

                return {
                    "status": "mesh_ready",
                    "node_count": result.node_count,
                    "element_count": result.element_count,
                    "min_quality": result.min_quality,
                    "avg_quality": result.avg_quality,
                }

            finally:
                Path(geo_path).unlink(missing_ok=True)

    except Exception as exc:
        logger.exception("Mesh generation failed for simulation %s", simulation_id)

        # Update status to failed
        try:
            with Session(engine) as session:
                sim = session.execute(
                    select(Simulation).where(Simulation.id == sim_uuid)
                ).scalar_one()
                sim.status = SimulationStatus.mesh_failed
                session.commit()

                publish_simulation_update_sync(simulation_id, {
                    "type": "mesh_failed",
                    "status": "mesh_failed",
                    "error": str(exc),
                })
        except Exception:
            logger.exception("Failed to update simulation status after mesh error")

        raise
    finally:
        engine.dispose()
