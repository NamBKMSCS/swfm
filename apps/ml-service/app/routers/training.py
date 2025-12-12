"""
Training Router - API endpoints for model training
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
import mlflow
from mlflow.tracking import MlflowClient

from app.schemas.training import (
    TrainingRequest,
    TrainingResponse,
    TrainingStatusResponse,
    ModelListResponse,
    ModelComparisonResponse
)
from app.services.training_service import TrainingService
from app.config import get_settings

router = APIRouter()
settings = get_settings()

# Global training status
training_status = {
    "status": "idle",
    "current_model": None,
    "current_horizon": None,
    "progress": 0,
    "message": "No training in progress"
}


@router.post("/train", response_model=TrainingResponse)
async def train_models(request: TrainingRequest):
    """
    Train ML models for water level prediction
    
    This endpoint:
    - Fetches and preprocesses station data
    - Trains Linear and Ridge models for multiple prediction horizons
    - Logs all training runs to MLflow
    - Returns comprehensive training results and metrics
    
    Default horizons: [15, 30, 45, 60] minutes
    
    Example:
    ```json
    {
        "station_id": 1,
        "start_date": "2025-11-01",
        "end_date": "2025-12-01",
        "prediction_horizons": [15, 30, 60],
        "model_types": ["linear", "ridge"],
        "test_size": 0.2,
        "ridge_alpha": 1.0
    }
    ```
    """
    global training_status
    
    # Check if training is already in progress
    if training_status["status"] == "training":
        raise HTTPException(
            status_code=409,
            detail="Training already in progress. Please wait for it to complete."
        )
    
    try:
        # Debug logging
        print(f"🔍 Received station_id: {request.station_id} (type: {type(request.station_id)})")
        
        # Check if station is excluded
        if request.station_id is not None and request.station_id in [1, 7]:
            raise HTTPException(
                status_code=400,
                detail=f"Station {request.station_id} is excluded from training due to data quality issues"
            )
        
        # Update status
        station_msg = f"station {request.station_id}" if request.station_id is not None else "all stations (unified model, excluding stations 1 & 7)"
        training_status = {
            "status": "training",
            "current_model": request.model_types[0] if request.model_types else "ridge",
            "current_horizon": request.prediction_horizons[0] if request.prediction_horizons else 60,
            "progress": 0,
            "message": f"Starting training for {station_msg}"
        }
        
        # Initialize training service
        training_service = TrainingService()
        
        # Train models
        result = training_service.train_models(
            station_id=request.station_id,
            start_date=request.start_date,
            end_date=request.end_date,
            prediction_horizons=request.prediction_horizons,
            model_types=request.model_types,
            test_size=request.test_size,
            use_time_split=request.use_time_split,
            ridge_alpha=request.ridge_alpha,
            experiment_name=request.experiment_name,
            register_model=request.register_model,
            model_stage=request.model_stage
        )
        
        # Update status
        training_status = {
            "status": "completed",
            "current_model": None,
            "current_horizon": None,
            "progress": 100,
            "message": f"Training completed successfully. {len(result['results'])} models trained."
        }
        
        return TrainingResponse(**result)
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"\n❌ Training Error:\n{error_trace}")
        
        # Update status
        training_status = {
            "status": "failed",
            "current_model": None,
            "current_horizon": None,
            "progress": 0,
            "message": f"Training failed: {str(e)}"
        }
        
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.post("/train-all-stations")
async def train_all_stations(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    prediction_horizons: List[int] = [15, 30, 45, 60],
    model_types: List[str] = ["linear", "ridge"],
    test_size: float = 0.2
):
    """
    Train models for all active stations
    
    This endpoint will:
    - Fetch all stations from database
    - Train models for each station sequentially
    - Return summary of all training results
    
    Note: This may take significant time depending on number of stations
    """
    global training_status
    
    # Check if training is already in progress
    if training_status["status"] == "training":
        raise HTTPException(
            status_code=409,
            detail="Training already in progress. Please wait for it to complete."
        )
    
    try:
        training_service = TrainingService()
        
        # Get all stations
        supabase = training_service.preprocessing_service.supabase
        stations_response = supabase.table('stations').select('id, name').execute()
        
        if not stations_response.data:
            raise HTTPException(status_code=404, detail="No stations found")
        
        stations = stations_response.data
        total_stations = len(stations)
        
        all_results = []
        successful = 0
        failed = 0
        
        for idx, station in enumerate(stations, 1):
            station_id = station['id']
            station_name = station['name']
            
            try:
                # Update status
                training_status = {
                    "status": "training",
                    "current_model": f"Station {station_id}",
                    "current_horizon": None,
                    "progress": int((idx / total_stations) * 100),
                    "message": f"Training station {idx}/{total_stations}: {station_name}"
                }
                
                print(f"\n{'='*70}")
                print(f"Training station {idx}/{total_stations}: {station_name} (ID: {station_id})")
                print(f"{'='*70}")
                
                # Train models for this station
                result = training_service.train_models(
                    station_id=station_id,
                    start_date=start_date,
                    end_date=end_date,
                    prediction_horizons=prediction_horizons,
                    model_types=model_types,
                    test_size=test_size,
                    use_time_split=True,
                    ridge_alpha=1.0,
                    experiment_name=None,
                    register_model=False,
                    model_stage="None"
                )
                
                all_results.append({
                    "station_id": station_id,
                    "station_name": station_name,
                    "success": True,
                    "models_trained": len(result['results']),
                    "training_time": result['total_training_time_seconds']
                })
                
                successful += 1
                
            except Exception as e:
                print(f"✗ Failed to train station {station_id}: {str(e)}")
                all_results.append({
                    "station_id": station_id,
                    "station_name": station_name,
                    "success": False,
                    "error": str(e)
                })
                failed += 1
        
        # Update final status
        training_status = {
            "status": "completed",
            "current_model": None,
            "current_horizon": None,
            "progress": 100,
            "message": f"Batch training completed. {successful} successful, {failed} failed."
        }
        
        return {
            "success": True,
            "message": f"Trained models for {successful}/{total_stations} stations",
            "total_stations": total_stations,
            "successful": successful,
            "failed": failed,
            "results": all_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        training_status = {
            "status": "failed",
            "current_model": None,
            "current_horizon": None,
            "progress": 0,
            "message": f"Batch training failed: {str(e)}"
        }
        raise HTTPException(status_code=500, detail=f"Batch training failed: {str(e)}")


@router.get("/status", response_model=TrainingStatusResponse)
async def get_training_status():
    """
    Get current training status
    
    Returns the current status of training operations:
    - idle: No training in progress
    - training: Training is running
    - completed: Training finished successfully
    - failed: Training failed
    """
    return TrainingStatusResponse(**training_status)


@router.get("/experiments")
async def list_experiments():
    """
    List all MLflow experiments
    
    Returns all experiments with their metadata
    """
    try:
        client = MlflowClient()
        experiments = client.search_experiments()
        
        return {
            "experiments": [
                {
                    "experiment_id": exp.experiment_id,
                    "name": exp.name,
                    "artifact_location": exp.artifact_location,
                    "lifecycle_stage": exp.lifecycle_stage,
                    "creation_time": exp.creation_time
                }
                for exp in experiments
            ],
            "total": len(experiments)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list experiments: {str(e)}")


@router.get("/experiments/{experiment_name}/runs")
async def get_experiment_runs(experiment_name: str, limit: int = 50):
    """
    Get all runs for a specific experiment
    
    Returns training runs with their metrics and parameters
    """
    try:
        client = MlflowClient()
        
        # Get experiment
        experiment = mlflow.get_experiment_by_name(experiment_name)
        if experiment is None:
            raise HTTPException(status_code=404, detail=f"Experiment '{experiment_name}' not found")
        
        # Get runs
        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=limit,
            order_by=["start_time DESC"]
        )
        
        return {
            "experiment_name": experiment_name,
            "experiment_id": experiment.experiment_id,
            "runs": [
                {
                    "run_id": run.info.run_id,
                    "run_name": run.data.tags.get("mlflow.runName", ""),
                    "status": run.info.status,
                    "start_time": run.info.start_time,
                    "end_time": run.info.end_time,
                    "metrics": run.data.metrics,
                    "params": run.data.params,
                    "tags": run.data.tags
                }
                for run in runs
            ],
            "total": len(runs)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get runs: {str(e)}")


@router.get("/runs/{run_id}")
async def get_run_details(run_id: str):
    """
    Get detailed information about a specific run
    
    Returns complete information including metrics, parameters, artifacts, and model info
    """
    try:
        client = MlflowClient()
        run = client.get_run(run_id)
        
        return {
            "run_id": run.info.run_id,
            "experiment_id": run.info.experiment_id,
            "run_name": run.data.tags.get("mlflow.runName", ""),
            "status": run.info.status,
            "start_time": run.info.start_time,
            "end_time": run.info.end_time,
            "duration_seconds": (run.info.end_time - run.info.start_time) / 1000 if run.info.end_time else None,
            "metrics": run.data.metrics,
            "params": run.data.params,
            "tags": run.data.tags,
            "artifact_uri": run.info.artifact_uri
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get run details: {str(e)}")


@router.get("/models/{station_id}")
async def get_station_models(station_id: int):
    """
    Get all trained models for a specific station
    
    Returns models grouped by prediction horizon
    """
    try:
        client = MlflowClient()
        experiment_name = f"swfm-station-{station_id}"
        
        # Get experiment
        experiment = mlflow.get_experiment_by_name(experiment_name)
        if experiment is None:
            return {
                "station_id": station_id,
                "models": [],
                "total": 0,
                "message": f"No models found for station {station_id}"
            }
        
        # Get runs
        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=["start_time DESC"]
        )
        
        models_by_horizon = {}
        
        for run in runs:
            horizon = run.data.params.get("horizon_minutes")
            model_type = run.data.params.get("model_type")
            
            if horizon and model_type:
                horizon = int(horizon)
                if horizon not in models_by_horizon:
                    models_by_horizon[horizon] = []
                
                models_by_horizon[horizon].append({
                    "run_id": run.info.run_id,
                    "model_type": model_type,
                    "horizon_minutes": horizon,
                    "test_rmse": run.data.metrics.get("test_rmse"),
                    "test_mae": run.data.metrics.get("test_mae"),
                    "test_r2": run.data.metrics.get("test_r2"),
                    "training_time": run.data.metrics.get("training_time_seconds"),
                    "start_time": run.info.start_time
                })
        
        return {
            "station_id": station_id,
            "experiment_name": experiment_name,
            "models_by_horizon": models_by_horizon,
            "total_models": sum(len(models) for models in models_by_horizon.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get station models: {str(e)}")


@router.get("/models/{station_id}/best")
async def get_best_models(station_id: int):
    """
    Get the best performing model for each prediction horizon
    
    Returns the model with lowest RMSE for each horizon
    """
    try:
        # Get all models for the station
        models_data = await get_station_models(station_id)
        
        if not models_data.get("models_by_horizon"):
            raise HTTPException(
                status_code=404,
                detail=f"No models found for station {station_id}"
            )
        
        best_models = {}
        
        for horizon, models in models_data["models_by_horizon"].items():
            # Find model with lowest RMSE
            if models:
                best = min(models, key=lambda m: m["test_rmse"] if m["test_rmse"] is not None else float('inf'))
                best_models[horizon] = best
        
        return {
            "station_id": station_id,
            "best_models": best_models,
            "total_horizons": len(best_models)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get best models: {str(e)}")


@router.delete("/experiments/{experiment_name}")
async def delete_experiment(experiment_name: str):
    """
    Delete an experiment and all its runs
    
    WARNING: This will permanently delete all training data for this experiment
    """
    try:
        client = MlflowClient()
        
        # Get experiment
        experiment = mlflow.get_experiment_by_name(experiment_name)
        if experiment is None:
            raise HTTPException(status_code=404, detail=f"Experiment '{experiment_name}' not found")
        
        # Delete experiment
        client.delete_experiment(experiment.experiment_id)
        
        return {
            "success": True,
            "message": f"Experiment '{experiment_name}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete experiment: {str(e)}")


@router.post("/runs/{run_id}/register")
async def register_model_from_run(
    run_id: str,
    model_name: str,
    stage: str = "None"
):
    """
    Register a model from a training run to MLflow Model Registry
    
    Parameters:
    - run_id: MLflow run ID
    - model_name: Name for the registered model
    - stage: Initial stage (None, Staging, Production)
    """
    try:
        client = MlflowClient()
        
        # Get run info
        run = client.get_run(run_id)
        
        # Register model
        model_uri = f"runs:/{run_id}/model"
        result = mlflow.register_model(model_uri, model_name)
        
        # Transition to stage if specified
        if stage != "None":
            client.transition_model_version_stage(
                name=model_name,
                version=result.version,
                stage=stage
            )
        
        return {
            "success": True,
            "message": f"Model registered successfully",
            "model_name": model_name,
            "version": result.version,
            "run_id": run_id,
            "stage": stage
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register model: {str(e)}")


@router.delete("/cleanup-old-models")
async def cleanup_old_model_records():
    """
    Clean up old model performance records for 120 and 180 minute horizons
    
    Removes database records for models that are no longer used
    """
    from supabase import create_client
    
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_key)
        
        # Delete model performance records for 120 and 180 minute models
        models_to_clean = ['linear_120min', 'ridge_120min', 'linear_180min', 'ridge_180min']
        
        deleted_total = 0
        deleted_by_type = {}
        
        for model_type in models_to_clean:
            result = supabase.table('model_performance').delete().eq('model_type', model_type).execute()
            count = len(result.data) if result.data else 0
            if count > 0:
                deleted_by_type[model_type] = count
                deleted_total += count
        
        return {
            "success": True,
            "message": f"Deleted {deleted_total} old model performance records",
            "deleted_total": deleted_total,
            "deleted_by_type": deleted_by_type
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cleanup old model records: {str(e)}"
        )
