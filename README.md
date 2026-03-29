# AlchemSim

SaaS multiphysics simulation platform for chemical and process engineering.

## Quick Start

```bash
docker compose up
```

Frontend: http://localhost:5173
API docs: http://localhost:8000/docs
MinIO console: http://localhost:9001

## Architecture

| Service        | Technology           | Port |
|----------------|----------------------|------|
| Frontend       | React + TypeScript   | 5173 |
| Backend API    | FastAPI + SQLAlchemy | 8000 |
| Task Queue     | Celery + Redis       | -    |
| Database       | PostgreSQL 17        | 5432 |
| Cache/Broker   | Redis 7              | 6379 |
| Object Storage | MinIO (S3-compat)    | 9000 |

## Development

```bash
make up        # Start all services
make down      # Stop all services
make migrate   # Run database migrations
make seed      # Seed sample data
make logs      # Tail service logs
make lint      # Run linters
make clean     # Remove volumes and build artifacts
```

## Environment

Copy `.env.example` to `.env` and adjust values as needed.
