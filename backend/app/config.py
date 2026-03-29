"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings.

    All values can be overridden via environment variables (case-insensitive).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://alchemsim:alchemsim@localhost:5432/alchemsim"
    )

    # ── Redis / Celery ────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── S3 / MinIO ────────────────────────────────────────────────────────
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "alchemsim"

    # ── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── CORS ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # ── OpenFOAM ──────────────────────────────────────────────────────────
    OPENFOAM_CONTAINER: str = "alchemsim-solver-1"


settings = Settings()
