# SWFM ML Service — Run Guide

This ML service includes:
- MLflow tracking server (artifacts on host)
- Postgres backend store for MLflow
- ML API (`uvicorn`) and auto-trainer

Use either Docker Compose or the local startup script.

## Prerequisites
- Docker and Docker Compose
- Bash on Linux
- Optional (local script run): Python 3.11 and `pip`

## Configuration
1. Create an environment file:
   ```bash
   cp ml-service/example.env ml-service/.env
   ```
2. (Optional) Edit `ml-service/.env` to customize:
   - `MLFLOW_DB_PORT`, `MLFLOW_DB_NAME`, `MLFLOW_DB_USER`, `MLFLOW_DB_PASSWORD`
   - `SUPABASE_URL`, `SUPABASE_KEY` (required for data merging endpoints)

## Option A — Run with Docker Compose
Run the full stack in containers.
```bash
cd ml-service
docker compose -f docker-compose.ml.yml up -d --build
```

- MLflow UI: `http://localhost:5000`
- API Health: `http://localhost:8000/health`
- API Docs: `http://localhost:8000/docs`

Stop and remove containers:
```bash
docker compose -f docker-compose.ml.yml down
```

## Option B — Run Locally with Script
Run services on the host using the startup script.
```bash
# optional: install MLflow if not present
pip install mlflow

bash ml-service/start_ml_service.sh
```

- Logs written to `ml-service/logs/`
- MLflow UI: `http://localhost:5000`
- API Health: `http://localhost:8000/health`

Stop / status / restart:
```bash
bash ml-service/start_ml_service.sh stop
bash ml-service/start_ml_service.sh status
bash ml-service/start_ml_service.sh restart
```

## Verify Services
```bash
# Postgres container (compose)
docker ps | grep swfm-mlflow-postgres

# MLflow health
curl -f http://localhost:5000/health

# API health
curl -f http://localhost:8000/health
```

## Logs
- Local script run: `ml-service/logs/mlflow.log`, `api_service.log`, `auto_training.log`
- Docker Compose:
  ```bash
  docker logs -f swfm-mlflow
  docker logs -f swfm-ml-api
  docker logs -f swfm-ml-trainer
  ```

## Troubleshooting
- Port conflicts (5432/5000/8000): set `MLFLOW_DB_PORT` (and other ports) in `ml-service/.env` before `docker compose up`, or edit the script env vars.
- Postgres permissions: if `pgdata` volume has permission issues, try:
  ```bash
  cd ml-service
  docker compose -f docker-compose.ml.yml down -v
  rm -rf mlflow_pgdata
  docker compose -f docker-compose.ml.yml up -d --build
  ```
- MLflow install (local script): ensure `pip install mlflow` succeeded.
- API errors: check `SUPABASE_URL`, `SUPABASE_KEY` in `.env` for endpoints that require them.
- Health checks failing: wait ~20s; Postgres + MLflow start sequentially and have health checks.

## Notes
- `MLFLOW_TRACKING_URI` inside containers is `http://mlflow:5000`. On host it’s `http://localhost:5000`.
- MLflow artifacts persist to the host: `ml-service/mlartifacts`.
- Postgres data persists via named volume `pgdata` (compose) or `ml-service/mlflow_pgdata` (local script run).
