"""Import all models so Alembic and ``create_all`` discover them."""

from app.models.base import Base, TimestampMixin
from app.models.geometry import Geometry, GeometryFormat
from app.models.mesh import Mesh
from app.models.project import Project
from app.models.result import Result, ResultField
from app.models.simulation import (
    Simulation,
    SimulationStatus,
    SimulationType,
    VALID_STATUS_TRANSITIONS,
)
from app.models.user import User
from app.models.workspace import Workspace

__all__ = [
    "Base",
    "TimestampMixin",
    "Geometry",
    "GeometryFormat",
    "Mesh",
    "Project",
    "Result",
    "ResultField",
    "Simulation",
    "SimulationStatus",
    "SimulationType",
    "VALID_STATUS_TRANSITIONS",
    "User",
    "Workspace",
]
