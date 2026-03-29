"""FastAPI application entry-point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine
from app.core.storage import get_storage_client
from app.models.base import Base

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle hook."""
    # ── startup ───────────────────────────────────────────────────────────
    logger.info("Creating database tables (if needed)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Ensuring S3 bucket exists...")
    try:
        storage = get_storage_client()
        storage.ensure_bucket()
    except Exception:
        logger.warning("Could not connect to S3 / MinIO - storage will be unavailable")

    yield

    # ── shutdown ──────────────────────────────────────────────────────────
    await engine.dispose()


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application."""
    app = FastAPI(
        title="AlchemSim",
        description="SaaS CFD Simulation Platform",
        version="0.1.0",
        lifespan=lifespan,
        redirect_slashes=False,
    )

    from app.config import settings

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Import routers here to avoid circular imports
    from app.api.router import api_router  # noqa: E402

    app.include_router(api_router)

    @app.get("/api/health", tags=["health"])
    async def health_check() -> dict:
        return {"status": "ok", "service": "alchemsim"}

    return app


app = create_app()
