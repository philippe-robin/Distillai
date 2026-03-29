"""Initial schema: users, workspaces, projects, simulations, geometries, meshes, results.

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), unique=True, index=True, nullable=False),
        sa.Column("hashed_password", sa.String(128), nullable=False),
        sa.Column("full_name", sa.String(256), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── workspaces ────────────────────────────────────────────────────────
    op.create_table(
        "workspaces",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "owner_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── projects ──────────────────────────────────────────────────────────
    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "workspace_id",
            UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── simulations ───────────────────────────────────────────────────────
    op.create_table(
        "simulations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column(
            "project_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "sim_type",
            sa.String(20),
            nullable=False,
            server_default="cfd_steady",
        ),
        sa.Column("physics_config", JSONB, nullable=True),
        sa.Column("solver_config", JSONB, nullable=True),
        sa.Column("boundary_conditions", JSONB, nullable=True),
        sa.Column("celery_task_id", sa.String(256), nullable=True),
        sa.Column("progress_pct", sa.Float(), nullable=True, server_default="0"),
        sa.Column("current_iteration", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("max_iterations", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── geometries ────────────────────────────────────────────────────────
    op.create_table(
        "geometries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "simulation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("simulations.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
            index=True,
        ),
        sa.Column("format", sa.String(20), nullable=False),
        sa.Column("file_key", sa.String(512), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("bounding_box", JSONB, nullable=True),
        sa.Column("face_count", sa.Integer(), nullable=True),
        sa.Column("primitive_config", JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── meshes ────────────────────────────────────────────────────────────
    op.create_table(
        "meshes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "simulation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("simulations.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
            index=True,
        ),
        sa.Column("file_key", sa.String(512), nullable=True),
        sa.Column("format", sa.String(32), nullable=True),
        sa.Column("node_count", sa.Integer(), nullable=True),
        sa.Column("element_count", sa.Integer(), nullable=True),
        sa.Column("min_quality", sa.Float(), nullable=True),
        sa.Column("avg_quality", sa.Float(), nullable=True),
        sa.Column("quality_histogram", JSONB, nullable=True),
        sa.Column("mesh_config", JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── results ───────────────────────────────────────────────────────────
    op.create_table(
        "results",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "simulation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("simulations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("field", sa.String(20), nullable=False),
        sa.Column("time_step", sa.Integer(), nullable=True),
        sa.Column("file_key", sa.String(512), nullable=True),
        sa.Column("min_value", sa.Float(), nullable=True),
        sa.Column("max_value", sa.Float(), nullable=True),
        sa.Column("metadata", JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("results")
    op.drop_table("meshes")
    op.drop_table("geometries")
    op.drop_table("simulations")
    op.drop_table("projects")
    op.drop_table("workspaces")
    op.drop_table("users")
