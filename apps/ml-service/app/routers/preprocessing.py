"""
Preprocessing Router
API endpoints for data preprocessing operations
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any

from app.schemas.preprocessing import (
    PreprocessingRequest,
    PreprocessingResponse,
    PreprocessingConfig,
    PreprocessingConfigUpdate
)
from app.services.preprocessing_service import PreprocessingService
from app.config import get_settings

settings = get_settings()
router = APIRouter()


@router.post("/preprocess", response_model=PreprocessingResponse)
async def preprocess_data(request: PreprocessingRequest):
    """
    Preprocess station data using configurations from database
    
    This endpoint:
    1. Fetches preprocessing configurations from the database
    2. Retrieves station measurements
    3. Applies all enabled preprocessing steps:
       - Lag features (1h, 2h, 3h, 6h, 12h, 24h)
       - Rolling statistics (mean, std over 3h, 6h, 12h, 24h windows)
       - Rate of change (1h, 3h, 6h differences)
       - Time features (cyclical encoding for hour/month)
       - Rainfall features (cumulative over windows)
       - Weather interactions
       - Station statistics
    4. Creates target variables for prediction horizons
    5. Cleans data (handles missing values)
    
    Args:
        request: PreprocessingRequest with station_id, date range, and horizons
        
    Returns:
        PreprocessingResponse with preprocessing results and metadata
    """
    try:
        service = PreprocessingService()
        
        # Use custom configs if provided
        configs = request.custom_configs if request.use_custom_configs else None
        
        result = service.preprocess_data(
            station_id=request.station_id,
            start_date=request.start_date,
            end_date=request.end_date,
            prediction_horizons=request.prediction_horizons,
            custom_configs=configs
        )
        
        return PreprocessingResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preprocessing failed: {str(e)}")


@router.get("/configs", response_model=List[PreprocessingConfig])
async def get_preprocessing_configs(
    enabled_only: bool = Query(True, description="Return only enabled configs")
):
    """
    Get all preprocessing configurations from database
    
    Returns a list of all preprocessing methods and their configurations:
    - lag_features: Historical water level lags
    - rolling_statistics: Rolling mean/std calculations
    - rate_of_change: Water level differences
    - time_features: Temporal features with cyclical encoding
    - rainfall_features: Cumulative rainfall
    - weather_interactions: Weather-derived features
    - station_statistics: Station-specific stats
    - data_cleaning: Missing value handling
    - feature_scaling: StandardScaler configuration
    - target_creation: Prediction horizon targets
    - train_test_split: Data splitting strategy
    - weather_merge: Weather data integration
    
    Args:
        enabled_only: If True, return only enabled configurations
        
    Returns:
        List of preprocessing configurations
    """
    try:
        service = PreprocessingService()
        
        query = service.supabase.table('preprocessing_configs').select('*')
        
        if enabled_only:
            query = query.eq('enabled', True)
        
        response = query.execute()
        
        configs = [PreprocessingConfig(**row) for row in response.data]
        return configs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch configs: {str(e)}")


@router.get("/configs/{method_id}", response_model=PreprocessingConfig)
async def get_preprocessing_config(method_id: str):
    """
    Get a specific preprocessing configuration by method_id
    
    Available method_ids:
    - lag_features
    - rolling_statistics
    - rate_of_change
    - time_features
    - rainfall_features
    - weather_interactions
    - station_statistics
    - data_cleaning
    - feature_scaling
    - target_creation
    - train_test_split
    - weather_merge
    
    Args:
        method_id: Unique identifier for preprocessing method
        
    Returns:
        PreprocessingConfig for the specified method
    """
    try:
        service = PreprocessingService()
        
        response = service.supabase.table('preprocessing_configs')\
            .select('*')\
            .eq('method_id', method_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Config '{method_id}' not found")
        
        return PreprocessingConfig(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch config: {str(e)}")


@router.put("/configs/{method_id}", response_model=PreprocessingConfig)
async def update_preprocessing_config(method_id: str, update: PreprocessingConfigUpdate):
    """
    Update a preprocessing configuration
    
    Allows updating the 'enabled' flag or 'config' JSON for a specific method.
    
    Args:
        method_id: Unique identifier for preprocessing method
        update: PreprocessingConfigUpdate with fields to update
        
    Returns:
        Updated PreprocessingConfig
    """
    try:
        service = PreprocessingService()
        
        # Build update dict
        update_data = {}
        if update.enabled is not None:
            update_data['enabled'] = update.enabled
        if update.config is not None:
            update_data['config'] = update.config
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        update_data['updated_at'] = 'now()'
        
        response = service.supabase.table('preprocessing_configs')\
            .update(update_data)\
            .eq('method_id', method_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Config '{method_id}' not found")
        
        return PreprocessingConfig(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update config: {str(e)}")


@router.get("/features/list")
async def list_features():
    """
    List all features that will be generated by the preprocessing pipeline
    
    Returns a comprehensive list of all 48+ features that are created during
    preprocessing, organized by category.
    
    Returns:
        Dictionary with feature categories and feature names
    """
    return {
        "total_features": 48,
        "categories": {
            "current_values": {
                "count": 1,
                "features": ["water_level"]
            },
            "lag_features": {
                "count": 6,
                "features": [
                    "water_level_lag_1h", "water_level_lag_2h", "water_level_lag_3h",
                    "water_level_lag_6h", "water_level_lag_12h", "water_level_lag_24h"
                ]
            },
            "rolling_statistics": {
                "count": 8,
                "features": [
                    "water_level_rolling_mean_3h", "water_level_rolling_mean_6h",
                    "water_level_rolling_mean_12h", "water_level_rolling_mean_24h",
                    "water_level_rolling_std_3h", "water_level_rolling_std_6h",
                    "water_level_rolling_std_12h", "water_level_rolling_std_24h"
                ]
            },
            "rate_of_change": {
                "count": 3,
                "features": [
                    "water_level_diff_1h", "water_level_diff_3h", "water_level_diff_6h"
                ]
            },
            "station_statistics": {
                "count": 4,
                "features": [
                    "station_water_mean", "station_water_std",
                    "water_level_deviation", "alarm_level"
                ]
            },
            "weather_features": {
                "count": 14,
                "features": [
                    "temperature", "humidity", "pressure", "wind_speed",
                    "rainfall", "rainfall_1h", "rainfall_6h", "rainfall_12h", "rainfall_24h",
                    "rainfall_sum_3h", "rainfall_sum_6h", "rainfall_sum_12h", "rainfall_sum_24h",
                    "temp_humidity_interaction", "pressure_diff_3h"
                ]
            },
            "time_features": {
                "count": 9,
                "features": [
                    "hour", "day_of_week", "day_of_month", "month", "is_weekend",
                    "hour_sin", "hour_cos", "month_sin", "month_cos"
                ]
            },
            "location_features": {
                "count": 2,
                "features": ["latitude", "longitude"]
            }
        },
        "target_variables": {
            "count": 5,
            "features": [
                "target_15min", "target_30min", "target_45min",
                "target_60min", "target_90min"
            ]
        }
    }


@router.get("/pipeline/summary")
async def get_pipeline_summary():
    """
    Get a summary of the complete preprocessing pipeline
    
    Returns information about the preprocessing steps, their order,
    and the configurations applied.
    
    Returns:
        Dictionary with pipeline summary
    """
    try:
        service = PreprocessingService()
        configs = service.get_preprocessing_configs()
        
        # Define the actual pipeline steps (9 main preprocessing steps)
        pipeline_steps = [
                {
                    "order": 1,
                    "method": "time_features",
                    "description": "Extract temporal features with cyclical encoding",
                    "enabled": "time_features" in configs
                },
                {
                    "order": 2,
                    "method": "lag_features",
                    "description": "Create historical water level lag features",
                    "enabled": "lag_features" in configs
                },
                {
                    "order": 3,
                    "method": "rolling_statistics",
                    "description": "Calculate rolling mean and std over time windows",
                    "enabled": "rolling_statistics" in configs
                },
                {
                    "order": 4,
                    "method": "rate_of_change",
                    "description": "Compute water level differences for trend analysis",
                    "enabled": "rate_of_change" in configs
                },
                {
                    "order": 5,
                    "method": "rainfall_features",
                    "description": "Calculate cumulative rainfall over windows",
                    "enabled": "rainfall_features" in configs
                },
                {
                    "order": 6,
                    "method": "weather_interactions",
                    "description": "Create weather interaction features",
                    "enabled": "weather_interactions" in configs
                },
                {
                    "order": 7,
                    "method": "station_statistics",
                    "description": "Compute station-specific statistical features",
                    "enabled": "station_statistics" in configs
                },
                {
                    "order": 8,
                    "method": "target_creation",
                    "description": "Create target variables for prediction horizons",
                    "enabled": "target_creation" in configs
                },
                {
                    "order": 9,
                    "method": "data_cleaning",
                    "description": "Handle missing values and remove invalid rows",
                    "enabled": "data_cleaning" in configs
                }
            ]
        
        return {
            "pipeline_name": "Water Level Forecasting Preprocessing",
            "version": "1.0.0",
            "total_steps": len(pipeline_steps),
            "steps": pipeline_steps,
            "configurations": configs
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pipeline summary: {str(e)}")
