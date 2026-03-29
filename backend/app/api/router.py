"""Top-level API router that includes all sub-routers."""

from fastapi import APIRouter

from app.api import auth, geometry, mesh, projects, results, simulations, ws

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["simulations"])
api_router.include_router(geometry.router, prefix="/geometry", tags=["geometry"])
api_router.include_router(mesh.router, prefix="/mesh", tags=["mesh"])
api_router.include_router(results.router, prefix="/results", tags=["results"])
api_router.include_router(ws.router, tags=["websocket"])
