"""
Models Router - Upload and manage ML models with MLflow
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import mlflow
from mlflow.tracking import MlflowClient
import pickle
import os

from app.config import get_settings

router = APIRouter()
settings = get_settings()


class ModelUploadResponse(BaseModel):
    success: bool
    model_name: str
    version: str
    run_id: str
    message: str


class ModelInfo(BaseModel):
    name: str
    version: str
    stage: str
    run_id: str
    created_at: str
    description: Optional[str] = None


class ModelListResponse(BaseModel):
    models: list[ModelInfo]
    total: int


@router.post("/upload", response_model=ModelUploadResponse)
async def upload_model(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    description: str = Form(default=""),
    algorithm: str = Form(default="custom"),
    station_id: Optional[int] = Form(default=None),
):
    """
    Upload a PKL model file and register it with MLflow.

    - **file**: PKL file containing the trained model
    - **model_name**: Name for the model in the registry
    - **description**: Optional description of the model
    - **algorithm**: Algorithm type (arima, lstm, hybrid, etc.)
    - **station_id**: Optional station ID this model is trained for
    """
    # Validate file extension
    if not file.filename.endswith((".pkl", ".pickle")):
        raise HTTPException(status_code=400, detail="Only PKL/Pickle files are allowed")

    # Validate file size
    file_size = 0
    content = await file.read()
    file_size = len(content) / (1024 * 1024)  # MB

    if file_size > settings.max_model_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.max_model_size_mb}MB limit",
        )

    # Reset file position
    await file.seek(0)

    try:
        # Validate it's a valid pickle file
        model = pickle.loads(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid pickle file: {str(e)}")

    # Save model temporarily
    temp_path = os.path.join(settings.models_dir, f"temp_{file.filename}")
    os.makedirs(settings.models_dir, exist_ok=True)

    with open(temp_path, "wb") as f:
        f.write(content)

    try:
        # Create MLflow experiment if doesn't exist
        experiment_name = f"swfm-{algorithm}"
        experiment = mlflow.get_experiment_by_name(experiment_name)
        if experiment is None:
            mlflow.create_experiment(experiment_name)
        mlflow.set_experiment(experiment_name)

        # Start MLflow run and log model
        with mlflow.start_run(run_name=f"{model_name}-upload") as run:
            # Log parameters
            mlflow.log_param("algorithm", algorithm)
            mlflow.log_param("upload_source", "manual")
            if station_id:
                mlflow.log_param("station_id", station_id)

            # Log the model artifact
            mlflow.log_artifact(temp_path, artifact_path="model")

            # Also log with sklearn flavor for easier loading
            try:
                mlflow.sklearn.log_model(
                    model,
                    artifact_path="sklearn_model",
                    registered_model_name=model_name,
                )
            except Exception:
                # If not sklearn compatible, use pyfunc
                mlflow.pyfunc.log_model(
                    artifact_path="pyfunc_model",
                    python_model=None,
                    artifacts={"model": temp_path},
                    registered_model_name=model_name,
                )

            run_id = run.info.run_id

        # Get the registered model version
        client = MlflowClient()
        versions = client.search_model_versions(f"name='{model_name}'")
        latest_version = max([int(v.version) for v in versions]) if versions else 1

        # Update model description
        if description:
            client.update_registered_model(name=model_name, description=description)

        return ModelUploadResponse(
            success=True,
            model_name=model_name,
            version=str(latest_version),
            run_id=run_id,
            message=f"Model '{model_name}' v{latest_version} registered successfully",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to register model: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("", response_model=ModelListResponse)
async def list_models():
    """List all registered models"""
    client = MlflowClient()

    try:
        registered_models = client.search_registered_models()
        models = []

        for rm in registered_models:
            # Get latest version
            versions = client.search_model_versions(f"name='{rm.name}'")
            if versions:
                latest = max(versions, key=lambda v: int(v.version))
                models.append(
                    ModelInfo(
                        name=rm.name,
                        version=latest.version,
                        stage=latest.current_stage,
                        run_id=latest.run_id,
                        created_at=str(latest.creation_timestamp),
                        description=rm.description,
                    )
                )

        return ModelListResponse(models=models, total=len(models))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")


@router.get("/{model_name}/versions")
async def get_model_versions(model_name: str):
    """Get all versions of a specific model"""
    client = MlflowClient()

    try:
        versions = client.search_model_versions(f"name='{model_name}'")

        if not versions:
            raise HTTPException(
                status_code=404, detail=f"Model '{model_name}' not found"
            )

        return {
            "model_name": model_name,
            "versions": [
                {
                    "version": v.version,
                    "stage": v.current_stage,
                    "run_id": v.run_id,
                    "status": v.status,
                    "created_at": str(v.creation_timestamp),
                }
                for v in sorted(versions, key=lambda x: int(x.version), reverse=True)
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get model versions: {str(e)}"
        )


@router.post("/{model_name}/promote/{version}")
async def promote_model(model_name: str, version: str, stage: str = "Production"):
    """Promote a model version to a stage (Staging, Production, Archived)"""
    valid_stages = ["Staging", "Production", "Archived", "None"]
    if stage not in valid_stages:
        raise HTTPException(
            status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}"
        )

    client = MlflowClient()

    try:
        client.transition_model_version_stage(
            name=model_name, version=version, stage=stage
        )

        return {
            "success": True,
            "message": f"Model '{model_name}' v{version} promoted to {stage}",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to promote model: {str(e)}"
        )


@router.delete("/{model_name}")
async def delete_model(model_name: str):
    """Delete a registered model and all its versions"""
    client = MlflowClient()

    try:
        # First archive all versions
        versions = client.search_model_versions(f"name='{model_name}'")
        for v in versions:
            if v.current_stage != "Archived":
                client.transition_model_version_stage(
                    name=model_name, version=v.version, stage="Archived"
                )

        # Delete the model
        client.delete_registered_model(name=model_name)

        return {
            "success": True,
            "message": f"Model '{model_name}' deleted successfully",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")
