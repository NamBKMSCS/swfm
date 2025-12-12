"""
Preprocessing schemas and models
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


class PreprocessingConfig(BaseModel):
    """Schema for preprocessing configuration"""
    id: str
    method_id: str
    enabled: bool
    config: Dict[str, Any]
    updated_at: Optional[datetime] = None


class PreprocessingRequest(BaseModel):
    """Request to preprocess data"""
    station_id: int = Field(..., description="Station ID to preprocess data for")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    prediction_horizons: List[int] = Field(
        default=[15, 30, 45, 60, 90],
        description="Prediction horizons in minutes"
    )
    use_custom_configs: bool = Field(
        default=False,
        description="Use custom configs from request instead of database"
    )
    custom_configs: Optional[Dict[str, Any]] = Field(
        None,
        description="Custom preprocessing configs (overrides database)"
    )


class PreprocessingResponse(BaseModel):
    """Response from preprocessing operation"""
    status: str
    message: str
    station_id: int
    records_processed: int
    features_generated: int
    prediction_horizons: List[int]
    configs_used: List[str]
    execution_time_seconds: float
    data_summary: Dict[str, Any]
    sample_data: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Sample preprocessed data records"
    )


class PreprocessingConfigUpdate(BaseModel):
    """Update preprocessing configuration"""
    method_id: str
    enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None
