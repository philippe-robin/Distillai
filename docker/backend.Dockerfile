FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev libglu1-mesa libxcursor1 libxinerama1 \
    libxft2 libxrender1 libgomp1 && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app/__init__.py ./app/__init__.py

RUN pip install --no-cache-dir --timeout=120 . 2>&1 || \
    (echo "Retrying without gmsh..." && \
     sed -i '/"gmsh/d' pyproject.toml && \
     pip install --no-cache-dir .)

COPY . .

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
