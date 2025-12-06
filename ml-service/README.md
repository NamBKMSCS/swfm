# ML Training Service

FastAPI-based ML service with MLflow integration for water level forecasting.

## Quick Start

```bash
# Development
pip install -r requirements.txt
uvicorn app.main:app --reload

# Docker
docker build -t swfm-ml-service .
docker run -p 8000:8000 swfm-ml-service
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/models/upload` | Upload PKL model |
| GET | `/models` | List all models |
| GET | `/models/{name}/versions` | Get model versions |
| POST | `/predict/{model_name}` | Run prediction |

## MLflow UI

Access at `http://localhost:5000` when running with docker-compose.
