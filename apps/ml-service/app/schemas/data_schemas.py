"""
Pydantic Schemas for Data API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class MergeDataRequest(BaseModel):
    """Request model for merging station and weather data"""
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    tolerance_hours: int = Field(2, ge=1, le=24, description="Time tolerance for matching (1-24 hours)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "start_date": "2025-11-01",
                "end_date": "2025-12-01",
                "tolerance_hours": 2
            }
        }


class MergeDataStats(BaseModel):
    """Statistics from merge operation"""
    total_records: int
    records_with_weather: int
    records_missing_weather: int
    coverage_percentage: float
    stations_count: int
    time_range_start: Optional[str]
    time_range_end: Optional[str]
    weather_source: str


class MergeDataResponse(BaseModel):
    """Response model for merge operation"""
    success: bool
    message: str
    stats: MergeDataStats
    data_preview: List[dict] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    error: str
    detail: Optional[str] = None
