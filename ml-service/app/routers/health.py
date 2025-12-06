"""
Health Check Router
"""

from fastapi import APIRouter
import mlflow

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    mlflow_status = "unknown"
    try:
        mlflow.get_tracking_uri()
        mlflow_status = "connected"
    except Exception as e:
        mlflow_status = f"error: {str(e)}"

    return {"status": "healthy", "mlflow": mlflow_status}
