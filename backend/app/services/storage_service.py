"""Thin convenience layer over core.storage for simulation-specific paths."""

from __future__ import annotations

import uuid

from app.core.storage import StorageClient, get_storage_client


def _sim_prefix(simulation_id: uuid.UUID | str) -> str:
    return f"simulations/{simulation_id}"


def upload_geometry(
    simulation_id: uuid.UUID | str,
    filename: str,
    data: bytes,
    content_type: str = "application/octet-stream",
    storage: StorageClient | None = None,
) -> str:
    """Upload geometry and return the S3 key."""
    s = storage or get_storage_client()
    key = f"{_sim_prefix(simulation_id)}/geometry/{filename}"
    s.upload_file(key, data, content_type)
    return key


def upload_mesh(
    simulation_id: uuid.UUID | str,
    filename: str,
    data: bytes,
    storage: StorageClient | None = None,
) -> str:
    """Upload a mesh file and return the S3 key."""
    s = storage or get_storage_client()
    key = f"{_sim_prefix(simulation_id)}/mesh/{filename}"
    s.upload_file(key, data, "application/octet-stream")
    return key


def upload_result(
    simulation_id: uuid.UUID | str,
    field: str,
    time_step: int | None,
    data: bytes,
    storage: StorageClient | None = None,
) -> str:
    """Upload a result field file and return the S3 key."""
    s = storage or get_storage_client()
    ts_part = f"_{time_step}" if time_step is not None else ""
    key = f"{_sim_prefix(simulation_id)}/results/{field}{ts_part}.vtk"
    s.upload_file(key, data, "application/octet-stream")
    return key


def download(key: str, storage: StorageClient | None = None) -> bytes:
    """Download an arbitrary key."""
    s = storage or get_storage_client()
    return s.download_file(key)


def presigned_url(key: str, storage: StorageClient | None = None) -> str:
    """Generate a presigned download URL."""
    s = storage or get_storage_client()
    return s.get_presigned_url(key)
