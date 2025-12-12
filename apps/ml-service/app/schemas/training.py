"""
Training Schemas - Request and response models for training API
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal


class TrainingRequest(BaseModel):
    """Request to train a model"""
    station_id: Optional[int] = Field(None, description="Station ID to train model for (None = all stations)")
    start_date: Optional[str] = Field(None, description="Start date for training data (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date for training data (YYYY-MM-DD)")
    prediction_horizons: List[int] = Field(
        default=[15, 30, 45, 60],
        description="Prediction horizons in minutes"
    )
    model_types: List[str] = Field(
        default=["linear", "ridge"],
        description="Model types to train: linear, ridge"
    )
    test_size: float = Field(default=0.2, ge=0.1, le=0.5, description="Test set size ratio")
    use_time_split: bool = Field(default=True, description="Use time-based split instead of random")
    
    # Model-specific hyperparameters
    ridge_alpha: float = Field(default=1.0, ge=0.0, description="Ridge regularization strength")
    
    # MLflow settings
    experiment_name: Optional[str] = Field(None, description="MLflow experiment name")
    register_model: bool = Field(default=True, description="Register model in MLflow Model Registry")
    model_stage: Literal["None", "Staging", "Production"] = Field(
        default="None",
        description="Initial stage for registered model"
    )


class ModelMetrics(BaseModel):
    """Metrics for a trained model"""
    rmse: float
    mae: float
    r2: float


class HorizonModelResult(BaseModel):
    """Result for a single model at a specific horizon"""
    model_type: str
    horizon_minutes: int
    train_metrics: ModelMetrics
    test_metrics: ModelMetrics
    training_time_seconds: float
    mlflow_run_id: str


class ModelSyncRequest(BaseModel):
    """Request to sync model from Supabase to MLflow"""
    run_id: str = Field(..., description="MLflow run ID from model_performance table")
    register_name: Optional[str] = Field(None, description="Custom name for model registration (auto-generated if not provided)")
    stage: Literal["None", "Staging", "Production"] = Field(
        default="None",
        description="Stage to promote model to after registration"
    )


class ModelSyncResponse(BaseModel):
    """Response from model sync operation"""
    success: bool
    run_id: str
    model_name: str
    model_version: int
    model_type: str
    station_id: Optional[int]
    horizon_minutes: int
    metrics: ModelMetrics
    stage: str
    message: str
    model_uri: Optional[str] = None
    registered_model_version: Optional[str] = None


class TrainingResponse(BaseModel):
    """Response from training request"""
    success: bool
    message: str
    station_id: Optional[int] = None
    station_name: Optional[str] = None
    
    # Data info
    total_samples: int
    train_samples: int
    test_samples: int
    features_count: int
    feature_names: List[str]
    
    # Training results
    results: List[HorizonModelResult]
    
    # MLflow info
    experiment_id: str
    experiment_name: str
    
    # Best models
    best_models: Dict[int, Dict[str, Any]]  # horizon -> {model_type, rmse, run_id}
    
    # Execution info
    total_training_time_seconds: float
    preprocessing_time_seconds: float


class TrainingStatusResponse(BaseModel):
    """Response for training status"""
    status: Literal["idle", "training", "completed", "failed"]
    current_model: Optional[str] = None
    current_horizon: Optional[int] = None
    progress: int = Field(ge=0, le=100, description="Progress percentage")
    message: str


class ModelListResponse(BaseModel):
    """List of trained models"""
    models: List[Dict[str, Any]]
    total: int


class ModelComparisonResponse(BaseModel):
    """Comparison between models"""
    station_id: int
    horizon_minutes: int
    models: List[Dict[str, Any]]
    best_model: Dict[str, Any]
    comparison_chart_data: Dict[str, Any]
