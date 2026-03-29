"""Celery tasks for CFD solver execution."""

from __future__ import annotations

import logging
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.run_simulation")
def run_simulation_task(self, simulation_id: str) -> dict:
    """Download mesh, generate case directory, run OpenFOAM, upload results.

    This task runs synchronously inside a Celery worker process.
    """
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session

    from app.api.ws import publish_simulation_update_sync
    from app.config import settings
    from app.core.storage import StorageClient
    from app.models.mesh import Mesh
    from app.models.result import Result
    from app.models.simulation import Simulation, SimulationStatus
    from app.services.result_service import extract_results
    from app.services.solver_service import (
        generate_case_directory,
        parse_residuals,
        run_solver,
    )

    # Synchronous DB connection
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
    work_dir = Path(tempfile.mkdtemp(prefix=f"alchemsim_{simulation_id}_"))

    try:
        with Session(engine) as session:
            # Load simulation and mesh
            sim = session.execute(
                select(Simulation).where(Simulation.id == sim_uuid)
            ).scalar_one()
            mesh_record = session.execute(
                select(Mesh).where(Mesh.simulation_id == sim_uuid)
            ).scalar_one()

            if mesh_record.file_key is None:
                raise ValueError("Mesh has no file_key")

            # Download mesh from S3
            publish_simulation_update_sync(simulation_id, {
                "type": "solver_progress",
                "status": "running",
                "message": "Downloading mesh...",
                "progress": 5,
            })

            mesh_data = storage.download_file(mesh_record.file_key)
            mesh_path = work_dir / "mesh.msh"
            mesh_path.write_bytes(mesh_data)

            # Generate OpenFOAM case directory
            publish_simulation_update_sync(simulation_id, {
                "type": "solver_progress",
                "status": "running",
                "message": "Generating case directory...",
                "progress": 10,
            })

            case_dir = generate_case_directory(sim, mesh_path, work_dir)

            # Run solver
            publish_simulation_update_sync(simulation_id, {
                "type": "solver_progress",
                "status": "running",
                "message": "Running solver...",
                "progress": 15,
            })

            try:
                result = run_solver(case_dir, timeout=3600)
            except FileNotFoundError:
                logger.warning(
                    "OpenFOAM solver not found - simulation %s will be marked as failed",
                    simulation_id,
                )
                sim.status = SimulationStatus.failed
                sim.completed_at = datetime.now(UTC)
                session.commit()

                publish_simulation_update_sync(simulation_id, {
                    "type": "solver_failed",
                    "status": "failed",
                    "error": "OpenFOAM solver not found on this system",
                })
                return {"status": "failed", "error": "solver not found"}

            # Parse residuals for convergence monitoring
            log_files = list(case_dir.glob("*.log"))
            all_residuals: dict[str, list[float]] = {}
            for log_file in log_files:
                parsed = parse_residuals(log_file)
                for field, values in parsed.items():
                    all_residuals.setdefault(field, []).extend(values)

            n_iterations = max((len(v) for v in all_residuals.values()), default=0)

            # Publish residuals
            publish_simulation_update_sync(simulation_id, {
                "type": "solver_progress",
                "status": "running",
                "message": "Extracting results...",
                "progress": 85,
                "iterations": n_iterations,
                "residuals": {
                    k: v[-10:] for k, v in all_residuals.items()  # last 10 values
                },
            })

            # Extract and upload results
            result_records = extract_results(case_dir, simulation_id)
            for rec in result_records:
                # Check if file exists in case_dir and upload
                db_result = Result(
                    simulation_id=sim_uuid,
                    field=rec["field"],
                    time_step=rec.get("time_step"),
                    file_key=rec.get("file_key"),
                    min_value=rec.get("min_value"),
                    max_value=rec.get("max_value"),
                    metadata_=rec.get("metadata_"),
                )
                session.add(db_result)

            # Determine final status
            if result.returncode == 0:
                sim.status = SimulationStatus.converged
            else:
                sim.status = SimulationStatus.diverged

            sim.completed_at = datetime.now(UTC)
            sim.current_iteration = n_iterations
            sim.progress_pct = 100.0
            session.commit()

            final_status = sim.status.value
            publish_simulation_update_sync(simulation_id, {
                "type": "solver_complete",
                "status": final_status,
                "iterations": n_iterations,
                "progress": 100,
            })

            return {
                "status": final_status,
                "iterations": n_iterations,
                "result_count": len(result_records),
            }

    except Exception as exc:
        logger.exception("Solver failed for simulation %s", simulation_id)

        try:
            with Session(engine) as session:
                sim = session.execute(
                    select(Simulation).where(Simulation.id == sim_uuid)
                ).scalar_one()
                sim.status = SimulationStatus.failed
                sim.completed_at = datetime.now(UTC)
                session.commit()

                publish_simulation_update_sync(simulation_id, {
                    "type": "solver_failed",
                    "status": "failed",
                    "error": str(exc),
                })
        except Exception:
            logger.exception("Failed to update simulation status after solver error")

        raise
    finally:
        engine.dispose()
        # Clean up working directory
        import shutil

        shutil.rmtree(work_dir, ignore_errors=True)
