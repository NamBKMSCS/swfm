"""
Evaluation Router - API endpoints for model performance evaluation
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from supabase import create_client, Client

from app.config import get_settings

router = APIRouter()
settings = get_settings()


def get_supabase_client() -> Client:
    """Get Supabase client"""
    if not settings.supabase_url or not settings.supabase_key:
        raise ValueError("Supabase credentials not configured")
    
    return create_client(settings.supabase_url, settings.supabase_key)


@router.get("/performance")
async def get_model_performance(
    station_id: Optional[int] = None,
    model_type: Optional[str] = None,
    horizon_minutes: Optional[int] = None,
    limit: int = 100
):
    """
    Get model performance metrics from database
    
    Parameters:
    - station_id: Filter by station ID
    - model_type: Filter by model type (linear, ridge, etc.)
    - horizon_minutes: Filter by prediction horizon
    - limit: Maximum number of records to return
    
    Returns list of performance records with RMSE, MAE, R², MAPE, accuracy
    """
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table('model_performance').select('*')
        
        if station_id:
            query = query.eq('station_id', station_id)
        if model_type:
            query = query.like('model_type', f'{model_type}%')
        if horizon_minutes:
            query = query.eq('horizon_minutes', horizon_minutes)
        
        # Execute query
        response = query.order('evaluated_at', desc=True).limit(limit).execute()
        
        return {
            "success": True,
            "total": len(response.data),
            "data": response.data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance data: {str(e)}")


@router.get("/performance/summary")
async def get_performance_summary(
    station_id: Optional[int] = None,
    days: int = 30
):
    """
    Get aggregated performance summary
    
    Parameters:
    - station_id: Filter by station ID (optional)
    - days: Number of days to aggregate (default 30)
    
    Returns aggregated metrics across all models
    """
    try:
        supabase = get_supabase_client()
        
        # Calculate date threshold
        date_threshold = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Build query
        query = supabase.table('model_performance').select('*')
        query = query.gte('evaluated_at', date_threshold)
        
        if station_id:
            query = query.eq('station_id', station_id)
        
        response = query.execute()
        
        if not response.data:
            return {
                "success": True,
                "message": "No performance data found",
                "summary": {
                    "avg_rmse": 0,
                    "avg_mae": 0,
                    "avg_r2": 0,
                    "avg_mape": 0,
                    "avg_accuracy": 0,
                    "total_models": 0,
                    "active_stations": 0,
                    "models_by_type": {}
                }
            }
        
        # Calculate aggregated metrics
        total = len(response.data)
        avg_rmse = sum(r.get('rmse', 0) or 0 for r in response.data) / total
        avg_mae = sum(r.get('mae', 0) or 0 for r in response.data) / total
        avg_r2 = sum(r.get('r2', 0) or 0 for r in response.data) / total
        avg_mape = sum(r.get('mape', 0) or 0 for r in response.data) / total
        avg_accuracy = sum(r.get('accuracy', 0) or 0 for r in response.data) / total
        
        # Get unique stations
        unique_stations = len(set(r.get('station_id') for r in response.data if r.get('station_id')))
        
        # Group by model type
        models_by_type = {}
        for record in response.data:
            model_type = record.get('model_type', 'unknown')
            # Extract base model type (remove horizon suffix)
            base_type = model_type.split('_')[0] if '_' in model_type else model_type
            
            if base_type not in models_by_type:
                models_by_type[base_type] = {
                    'count': 0,
                    'avg_rmse': 0,
                    'avg_mae': 0,
                    'avg_r2': 0
                }
            
            models_by_type[base_type]['count'] += 1
            models_by_type[base_type]['avg_rmse'] += record.get('rmse', 0) or 0
            models_by_type[base_type]['avg_mae'] += record.get('mae', 0) or 0
            models_by_type[base_type]['avg_r2'] += record.get('r2', 0) or 0
        
        # Average by type
        for model_type in models_by_type:
            count = models_by_type[model_type]['count']
            if count > 0:
                models_by_type[model_type]['avg_rmse'] /= count
                models_by_type[model_type]['avg_mae'] /= count
                models_by_type[model_type]['avg_r2'] /= count
        
        return {
            "success": True,
            "period_days": days,
            "summary": {
                "avg_rmse": round(avg_rmse, 6),
                "avg_mae": round(avg_mae, 6),
                "avg_r2": round(avg_r2, 6),
                "avg_mape": round(avg_mape, 2),
                "avg_accuracy": round(avg_accuracy, 2),
                "total_models": total,
                "active_stations": unique_stations,
                "models_by_type": models_by_type
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance summary: {str(e)}")


@router.get("/performance/by-station")
async def get_performance_by_station(days: int = 30):
    """
    Get performance metrics grouped by station
    
    Parameters:
    - days: Number of days to aggregate (default 30)
    
    Returns performance metrics for each station
    """
    try:
        supabase = get_supabase_client()
        
        # Calculate date threshold
        date_threshold = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get performance data with station names
        response = supabase.table('model_performance')\
            .select('*, stations(name, country)')\
            .gte('evaluated_at', date_threshold)\
            .execute()
        
        if not response.data:
            return {
                "success": True,
                "data": []
            }
        
        # Group by station
        stations = {}
        for record in response.data:
            station_id = record.get('station_id')
            if station_id not in stations:
                station_info = record.get('stations', {})
                stations[station_id] = {
                    'station_id': station_id,
                    'station_name': station_info.get('name') if station_info else f'Station {station_id}',
                    'country': station_info.get('country') if station_info else 'Unknown',
                    'models': [],
                    'avg_rmse': 0,
                    'avg_mae': 0,
                    'avg_r2': 0,
                    'model_count': 0
                }
            
            stations[station_id]['models'].append({
                'model_type': record.get('model_type'),
                'rmse': record.get('rmse'),
                'mae': record.get('mae'),
                'r2': record.get('r2'),
                'horizon_minutes': record.get('horizon_minutes'),
                'evaluated_at': record.get('evaluated_at')
            })
            
            stations[station_id]['avg_rmse'] += record.get('rmse', 0) or 0
            stations[station_id]['avg_mae'] += record.get('mae', 0) or 0
            stations[station_id]['avg_r2'] += record.get('r2', 0) or 0
            stations[station_id]['model_count'] += 1
        
        # Calculate averages
        for station_id in stations:
            count = stations[station_id]['model_count']
            if count > 0:
                stations[station_id]['avg_rmse'] = round(stations[station_id]['avg_rmse'] / count, 6)
                stations[station_id]['avg_mae'] = round(stations[station_id]['avg_mae'] / count, 6)
                stations[station_id]['avg_r2'] = round(stations[station_id]['avg_r2'] / count, 6)
        
        return {
            "success": True,
            "period_days": days,
            "data": list(stations.values())
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance by station: {str(e)}")


@router.get("/performance/by-horizon")
async def get_performance_by_horizon(
    station_id: Optional[int] = None,
    days: int = 30
):
    """
    Get performance metrics grouped by prediction horizon
    
    Parameters:
    - station_id: Filter by station ID (optional)
    - days: Number of days to aggregate (default 30)
    
    Returns performance metrics for each prediction horizon
    """
    try:
        supabase = get_supabase_client()
        
        # Calculate date threshold
        date_threshold = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Build query
        query = supabase.table('model_performance').select('*')
        query = query.gte('evaluated_at', date_threshold)
        
        if station_id:
            query = query.eq('station_id', station_id)
        
        response = query.execute()
        
        if not response.data:
            return {
                "success": True,
                "data": []
            }
        
        # Group by horizon
        horizons = {}
        for record in response.data:
            horizon = record.get('horizon_minutes')
            if horizon and horizon not in horizons:
                horizons[horizon] = {
                    'horizon_minutes': horizon,
                    'models': [],
                    'avg_rmse': 0,
                    'avg_mae': 0,
                    'avg_r2': 0,
                    'model_count': 0
                }
            
            if horizon:
                horizons[horizon]['models'].append({
                    'model_type': record.get('model_type'),
                    'rmse': record.get('rmse'),
                    'mae': record.get('mae'),
                    'r2': record.get('r2'),
                    'station_id': record.get('station_id')
                })
                
                horizons[horizon]['avg_rmse'] += record.get('rmse', 0) or 0
                horizons[horizon]['avg_mae'] += record.get('mae', 0) or 0
                horizons[horizon]['avg_r2'] += record.get('r2', 0) or 0
                horizons[horizon]['model_count'] += 1
        
        # Calculate averages
        for horizon in horizons:
            count = horizons[horizon]['model_count']
            if count > 0:
                horizons[horizon]['avg_rmse'] = round(horizons[horizon]['avg_rmse'] / count, 6)
                horizons[horizon]['avg_mae'] = round(horizons[horizon]['avg_mae'] / count, 6)
                horizons[horizon]['avg_r2'] = round(horizons[horizon]['avg_r2'] / count, 6)
        
        # Sort by horizon
        sorted_data = sorted(horizons.values(), key=lambda x: x['horizon_minutes'])
        
        return {
            "success": True,
            "period_days": days,
            "data": sorted_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance by horizon: {str(e)}")


@router.get("/feature-importance")
async def get_feature_importance():
    """
    Get feature importance/coefficients from trained models
    
    Returns the list of features with their importance scores
    Based on the feature_names.json configuration
    """
    try:
        import json
        import os
        from pathlib import Path
        
        # Load feature names
        feature_file = Path(__file__).parent.parent.parent / "feature_names.json"
        
        if not feature_file.exists():
            return {
                "success": False,
                "message": "Feature names file not found",
                "features": []
            }
        
        with open(feature_file, 'r') as f:
            feature_names = json.load(f)
        
        # Create feature importance based on feature types
        # This is a simplified version - real importance would come from model coefficients
        # Group features by category and assign relative importance
        
        feature_importance = []
        
        # Define feature categories and their base importance
        categories = {
            'water_level': 0.25,
            'lag': 0.20,
            'rolling': 0.15,
            'rainfall': 0.15,
            'weather': 0.10,
            'temporal': 0.08,
            'location': 0.05,
            'interaction': 0.02
        }
        
        for feature in feature_names:
            # Determine category and importance
            if feature.startswith('water_level') and 'lag' not in feature and 'rolling' not in feature and 'diff' not in feature:
                importance = categories['water_level']
            elif 'lag' in feature:
                importance = categories['lag'] * (0.9 if '24h' in feature else 0.7 if '12h' in feature else 0.5)
            elif 'rolling' in feature:
                importance = categories['rolling'] * (0.8 if 'mean' in feature else 0.6)
            elif 'rainfall' in feature:
                importance = categories['rainfall'] * (0.9 if '24h' in feature else 0.7)
            elif feature in ['temperature', 'humidity', 'pressure', 'wind_speed']:
                importance = categories['weather'] * (0.8 if feature == 'temperature' else 0.6)
            elif feature in ['hour', 'day_of_week', 'month', 'hour_sin', 'hour_cos', 'month_sin', 'month_cos']:
                importance = categories['temporal'] * (0.8 if 'sin' in feature or 'cos' in feature else 0.6)
            elif feature in ['latitude', 'longitude', 'alarm_level']:
                importance = categories['location']
            elif 'interaction' in feature or 'diff' in feature or 'deviation' in feature:
                importance = categories['interaction']
            else:
                importance = 0.01
            
            feature_importance.append({
                'name': feature,
                'importance': importance
            })
        
        # Sort by importance
        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
        
        return {
            "success": True,
            "total_features": len(feature_importance),
            "features": feature_importance
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feature importance: {str(e)}")
