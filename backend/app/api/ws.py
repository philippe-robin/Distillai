"""WebSocket endpoint for real-time simulation status updates."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage active WebSocket connections grouped by simulation ID."""

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, simulation_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(simulation_id, []).append(websocket)
        logger.info("WebSocket connected for simulation %s", simulation_id)

    def disconnect(self, simulation_id: str, websocket: WebSocket) -> None:
        conns = self._connections.get(simulation_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self._connections.pop(simulation_id, None)
        logger.info("WebSocket disconnected for simulation %s", simulation_id)

    async def broadcast(self, simulation_id: str, message: dict) -> None:
        """Send a JSON message to all connected clients for the given simulation."""
        conns = self._connections.get(simulation_id, [])
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.remove(ws)

    @property
    def active_connections(self) -> dict[str, int]:
        return {sid: len(conns) for sid, conns in self._connections.items()}


manager = ConnectionManager()


@router.websocket("/ws/simulation/{simulation_id}")
async def simulation_websocket(
    websocket: WebSocket,
    simulation_id: uuid.UUID,
) -> None:
    """WebSocket endpoint that streams status, progress, and residual updates.

    The server listens to a Redis pub/sub channel for updates published by
    Celery workers and forwards them to connected clients.

    Clients may send JSON messages with ``{"type": "ping"}`` to keep alive.
    """
    sim_id_str = str(simulation_id)
    await manager.connect(sim_id_str, websocket)

    # Start background task to listen to Redis pub/sub
    redis_task = asyncio.create_task(_redis_listener(sim_id_str))

    try:
        while True:
            # Keep the connection alive and handle client messages
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                try:
                    msg = json.loads(raw)
                    if msg.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except json.JSONDecodeError:
                    pass
            except asyncio.TimeoutError:
                # Send heartbeat
                try:
                    await websocket.send_json({"type": "heartbeat"})
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(sim_id_str, websocket)
        redis_task.cancel()
        try:
            await redis_task
        except asyncio.CancelledError:
            pass


async def _redis_listener(simulation_id: str) -> None:
    """Subscribe to Redis pub/sub and broadcast updates to WebSocket clients."""
    try:
        import redis.asyncio as aioredis

        from app.config import settings

        r = aioredis.from_url(settings.REDIS_URL)
        pubsub = r.pubsub()
        channel = f"simulation:{simulation_id}"
        await pubsub.subscribe(channel)

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await manager.broadcast(simulation_id, data)
                    except (json.JSONDecodeError, TypeError):
                        pass
        finally:
            await pubsub.unsubscribe(channel)
            await r.aclose()

    except ImportError:
        logger.warning("redis.asyncio not available - WebSocket updates disabled")
    except Exception as exc:
        logger.warning("Redis listener error for %s: %s", simulation_id, exc)


async def publish_simulation_update(simulation_id: str, data: dict) -> None:
    """Publish a simulation update to the Redis channel.

    Called by Celery tasks (or any backend code) to push updates.
    """
    try:
        import redis.asyncio as aioredis

        from app.config import settings

        r = aioredis.from_url(settings.REDIS_URL)
        channel = f"simulation:{simulation_id}"
        await r.publish(channel, json.dumps(data))
        await r.aclose()
    except Exception as exc:
        logger.warning("Failed to publish update for %s: %s", simulation_id, exc)


def publish_simulation_update_sync(simulation_id: str, data: dict) -> None:
    """Synchronous version of publish_simulation_update for Celery workers."""
    try:
        import redis as sync_redis

        from app.config import settings

        r = sync_redis.from_url(settings.REDIS_URL)
        channel = f"simulation:{simulation_id}"
        r.publish(channel, json.dumps(data))
        r.close()
    except Exception as exc:
        logger.warning("Failed to publish sync update for %s: %s", simulation_id, exc)
