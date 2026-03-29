.PHONY: up down build migrate seed test-backend test-frontend lint logs clean

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

migrate:
	docker compose exec backend alembic upgrade head

seed:
	docker compose exec backend python -m app.seed

test-backend:
	cd backend && python -m pytest tests/ -v

test-frontend:
	cd frontend && npm test

lint:
	cd backend && ruff check app/
	cd frontend && npm run lint

logs:
	docker compose logs -f

clean:
	docker compose down -v
	rm -rf frontend/node_modules frontend/dist
	find backend -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
