"""Celery application configuration."""

from celery import Celery

from app.config import settings

celery_app = Celery(
    "alchemsim",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    task_soft_time_limit=3600,
    task_time_limit=7200,
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.tasks"])
