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
from supabase import create_client, Client

from app.config import get_settings
from app.schemas.training import ModelSyncRequest, ModelSyncResponse, ModelMetrics

router = APIRouter()
settings = get_settings()

# Initialize Supabase client
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)


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
    accuracy: Optional[float] = None
    data_shape: Optional[str] = None
    scaler: Optional[str] = None


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
    """List all registered models with metrics from MLflow"""
    client = MlflowClient()

    try:
        registered_models = client.search_registered_models()
        models = []

        for rm in registered_models:
            # Get latest version
            versions = client.search_model_versions(f"name='{rm.name}'")
            if versions:
                latest = max(versions, key=lambda v: int(v.version))
                
                # Get metrics and params from the run
                try:
                    run = client.get_run(latest.run_id)
                    r2_score = run.data.metrics.get('r2_score', run.data.metrics.get('test_r2'))
                    
                    # Get train/test sample counts from run params/tags
                    train_samples = run.data.params.get('train_samples') or run.data.tags.get('train_samples')
                    test_samples = run.data.params.get('test_samples') or run.data.tags.get('test_samples')
                    
                    if train_samples and test_samples:
                        data_shape = f"Train: {train_samples} / Test: {test_samples}"
                    else:
                        data_shape = None
                    
                    # Get scaler type by checking if scaler artifact exists
                    scaler_type = None
                    try:
                        import joblib
                        scaler_path = client.download_artifacts(latest.run_id, "preprocessing/scaler.pkl")
                        scaler_obj = joblib.load(scaler_path)
                        scaler_type = type(scaler_obj).__name__
                    except:
                        scaler_type = "None"
                        
                except:
                    r2_score = None
                    data_shape = None
                    scaler_type = None
                
                model_info = ModelInfo(
                    name=rm.name,
                    version=latest.version,
                    stage=latest.current_stage,
                    run_id=latest.run_id,
                    created_at=str(latest.creation_timestamp),
                    description=rm.description,
                )
                
                # Add accuracy and data shape to the model info
                if r2_score is not None:
                    model_info.accuracy = r2_score
                if data_shape is not None:
                    model_info.data_shape = data_shape
                if scaler_type is not None:
                    model_info.scaler = scaler_type
                    
                models.append(model_info)

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


@router.post("/sync-from-db", response_model=ModelSyncResponse)
async def sync_model_from_database(request: ModelSyncRequest):
    """
    Sync a trained model from Supabase to MLflow Model Registry.
    
    This endpoint:
    - Fetches model performance data from Supabase using the run_id
    - Loads the corresponding model from MLflow tracking
    - Registers it in MLflow Model Registry with proper naming and tags
    - Optionally promotes it to Staging or Production stage
    
    Use this to promote best-performing models from training to production.
    
    Example:
    ```json
    {
        "run_id": "abc123def456",
        "register_name": "water-level-predictor",
        "stage": "Production"
    }
    ```
    """
    client = MlflowClient()
    
    try:
        # 1. Fetch model performance from Supabase
        print(f"🔍 Fetching model data for run_id: {request.run_id}")
        perf_data = supabase.table('model_performance')\
            .select('*')\
            .eq('id', request.run_id)\
            .execute()
        
        if not perf_data.data:
            raise HTTPException(
                status_code=404,
                detail=f"No model found with run_id: {request.run_id}"
            )
        
        model_record = perf_data.data[0]
        
        # Extract model info from model_type (e.g., "linear_60min" -> "linear", 60)
        model_type_full = model_record['model_type']
        if '_' in model_type_full and 'min' in model_type_full:
            model_type, horizon_str = model_type_full.rsplit('_', 1)
            horizon_minutes = int(horizon_str.replace('min', ''))
        else:
            model_type = model_type_full
            horizon_minutes = 60  # default
        
        station_id = model_record['station_id']
        station_id = None if station_id == 0 else station_id  # Convert 0 back to None for unified models
        
        # 2. Load model from MLflow tracking
        print(f"📦 Loading model from MLflow run: {request.run_id}")
        try:
            run = client.get_run(request.run_id)
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"MLflow run not found: {request.run_id}. Error: {str(e)}"
            )
        
        # 3. Generate model name if not provided
        if request.register_name:
            model_name = request.register_name
        else:
            station_tag = f"station{station_id}" if station_id is not None else "unified"
            model_name = f"swfm-{model_type}-{station_tag}-{horizon_minutes}min"
        
        # 4. Register model in Model Registry
        print(f"📝 Registering model as: {model_name}")
        
        # Get the model URI from the run
        model_uri = f"runs:/{request.run_id}/model"
        
        try:
            # Register the model
            model_version = mlflow.register_model(
                model_uri=model_uri,
                name=model_name
            )
            version = model_version.version
            
            # Add tags with metadata
            client.set_model_version_tag(
                name=model_name,
                version=version,
                key="station_id",
                value=str(station_id) if station_id is not None else "unified"
            )
            client.set_model_version_tag(
                name=model_name,
                version=version,
                key="model_type",
                value=model_type
            )
            client.set_model_version_tag(
                name=model_name,
                version=version,
                key="horizon_minutes",
                value=str(horizon_minutes)
            )
            client.set_model_version_tag(
                name=model_name,
                version=version,
                key="rmse",
                value=str(model_record['rmse'])
            )
            client.set_model_version_tag(
                name=model_name,
                version=version,
                key="r2",
                value=str(model_record['r2'])
            )
            
            # Update model description
            station_desc = f"Station {station_id}" if station_id is not None else "All stations (unified)"
            description = f"{model_type.title()} regression model for {station_desc}, {horizon_minutes}-min horizon. RMSE: {model_record['rmse']:.4f}, R²: {model_record['r2']:.4f}"
            client.update_model_version(
                name=model_name,
                version=version,
                description=description
            )
            
            print(f"✅ Model registered: {model_name} v{version}")
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to register model: {str(e)}"
            )
        
        # 5. Promote to stage if requested
        if request.stage and request.stage != "None":
            print(f"🚀 Promoting to {request.stage}...")
            try:
                client.transition_model_version_stage(
                    name=model_name,
                    version=version,
                    stage=request.stage
                )
            except Exception as e:
                # Don't fail if promotion fails
                print(f"⚠️  Warning: Failed to promote to {request.stage}: {str(e)}")
        
        # 6. Prepare response
        metrics = ModelMetrics(
            rmse=float(model_record['rmse']),
            mae=float(model_record['mae']),
            r2=float(model_record['r2'])
        )
        
        return ModelSyncResponse(
            success=True,
            run_id=request.run_id,
            model_name=model_name,
            model_version=int(version),
            model_type=model_type,
            station_id=station_id,
            horizon_minutes=horizon_minutes,
            metrics=metrics,
            stage=request.stage,
            message=f"Model successfully registered as '{model_name}' v{version} (stage: {request.stage})"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error syncing model: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync model from database: {str(e)}"
        )
