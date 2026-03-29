"""Pydantic schemas for simulation endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.simulation import SimulationStatus, SimulationType


class FluidProperties(BaseModel):
    """Fluid material properties (SI units)."""

    density: float = Field(default=1.225, gt=0, description="kg/m^3")
    viscosity: float = Field(default=1.789e-5, gt=0, description="Pa.s")
    specific_heat: float | None = Field(default=None, gt=0, description="J/(kg.K)")
    thermal_conductivity: float | None = Field(default=None, gt=0, description="W/(m.K)")


class BoundaryCondition(BaseModel):
    """Single boundary condition patch definition."""

    patch_name: str
    type: str  # e.g. fixedValue, zeroGradient, inletOutlet ...
    field: str  # p, U, T, k, epsilon
    value: Any = None


class SolverConfig(BaseModel):
    """Solver settings."""

    n_iterations: int = Field(default=1000, gt=0, le=100_000)
    convergence_threshold: float = Field(default=1e-4, gt=0)
    turbulence_model: str = Field(default="kEpsilon")
    write_interval: int = Field(default=100, gt=0)


class PhysicsConfig(BaseModel):
    """Top-level physics configuration."""

    fluid: FluidProperties = Field(default_factory=FluidProperties)
    gravity: list[float] = Field(default=[0.0, 0.0, -9.81])
    reference_pressure: float = Field(default=0.0)
    energy_equation: bool = Field(default=False)


class SimulationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=256)
    project_id: uuid.UUID
    sim_type: SimulationType = SimulationType.cfd_steady
    physics_config: PhysicsConfig | None = None
    solver_config: SolverConfig | None = None
    boundary_conditions: list[BoundaryCondition] | None = None


class SimulationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=256)
    physics_config: PhysicsConfig | None = None
    solver_config: SolverConfig | None = None
    boundary_conditions: list[BoundaryCondition] | None = None


class SimulationResponse(BaseModel):
    id: uuid.UUID
    name: str
    project_id: uuid.UUID
    status: SimulationStatus
    sim_type: SimulationType
    physics_config: dict | None
    solver_config: dict | None
    boundary_conditions: list[dict] | None
    celery_task_id: str | None
    progress_pct: float | None
    current_iteration: int | None
    max_iterations: int | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
