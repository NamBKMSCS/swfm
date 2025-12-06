"""
SWFM ML Service - FastAPI Application
Water Level Forecasting with MLflow Model Registry
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import mlflow

from app.config import get_settings
from app.routers import models, predict, health


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - initialize MLflow on startup"""
    # Initialize MLflow
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    
    # Create artifact directory if it doesn't exist
    import os
    os.makedirs(settings.mlflow_artifact_root, exist_ok=True)
    os.makedirs(settings.models_dir, exist_ok=True)
    
    print(f"✓ MLflow tracking URI: {settings.mlflow_tracking_uri}")
    print(f"✓ Models directory: {settings.models_dir}")
    
    yield
    
    # Cleanup on shutdown
    print("Shutting down ML Service...")


app = FastAPI(
    title=settings.app_name,
    description="ML Service for Water Level Forecasting with MLflow integration",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(models.router, prefix="/models", tags=["Models"])
app.include_router(predict.router, prefix="/predict", tags=["Predictions"])


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
