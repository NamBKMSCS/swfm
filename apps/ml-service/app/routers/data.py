"""
Data Operations Router - Merge station measurements with weather data
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from supabase import Client
import pandas as pd
import io
import logging

from app.schemas.data_schemas import (
    MergeDataRequest,
    MergeDataResponse,
    MergeDataStats,
    ErrorResponse
)
from app.services.data_merge_service import DataMergeService

router = APIRouter()
logger = logging.getLogger(__name__)


# Dependency will be added
async def get_supabase_client() -> Client:
    """Get Supabase client - implemented in dependencies"""
    from app.dependencies import get_supabase
    return get_supabase()


@router.post("/merge", response_model=MergeDataResponse)
async def merge_station_weather(
    request: MergeDataRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Merge station measurements with weather data from Supabase
    
    Returns merge statistics and data preview
    """
    try:
        service = DataMergeService(supabase)
        
        df_merged, stats = await service.merge_station_with_weather(
            start_date=request.start_date,
            end_date=request.end_date,
            tolerance_hours=request.tolerance_hours
        )
        
        response_stats = MergeDataStats(**stats)
        preview = df_merged.head(10).to_dict(orient='records')
        
        return MergeDataResponse(
            success=True,
            message=f"Successfully merged {stats['total_records']} records",
            stats=response_stats,
            data_preview=preview
        )
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Merge failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Merge operation failed: {str(e)}")


@router.post("/merge/download")
async def merge_and_download(
    request: MergeDataRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Merge station measurements with weather data and download as CSV
    """
    try:
        service = DataMergeService(supabase)
        
        df_merged, stats = await service.merge_station_with_weather(
            start_date=request.start_date,
            end_date=request.end_date,
            tolerance_hours=request.tolerance_hours
        )
        
        # Convert to CSV
        stream = io.StringIO()
        df_merged.to_csv(stream, index=False)
        stream.seek(0)
        
        filename = f"merged_data_{request.start_date or 'all'}_{request.end_date or 'all'}.csv"
        
        return StreamingResponse(
            io.BytesIO(stream.getvalue().encode()),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Merge and download failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Operation failed: {str(e)}")


@router.get("/stations")
async def list_stations(supabase: Client = Depends(get_supabase_client)):
    """List all available stations"""
    try:
        service = DataMergeService(supabase)
        stations = await service.get_stations()
        
        return {
            "success": True,
            "count": len(stations),
            "stations": stations
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch stations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stations/{station_id}/measurements")
async def get_station_measurements(
    station_id: str,
    start_date: str = None,
    end_date: str = None,
    limit: int = 100,
    supabase: Client = Depends(get_supabase_client)
):
    """Get measurements for a specific station"""
    try:
        limit = min(limit, 1000)
        
        service = DataMergeService(supabase)
        measurements = await service.get_station_measurements(
            station_id=station_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
        
        return {
            "success": True,
            "station_id": station_id,
            "count": len(measurements),
            "measurements": measurements
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch measurements: {e}")
        raise HTTPException(status_code=500, detail=str(e))
