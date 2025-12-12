"""
Weather Router - Fetch weather data from Open-Meteo API
"""
from fastapi import APIRouter, HTTPException, Query
from app.services.weather_service import WeatherService
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


def get_weather_service() -> WeatherService:
    """Get Weather Service instance (no API key needed for Open-Meteo)"""
    return WeatherService()


@router.get("/current")
async def get_current_weather(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude coordinate")
):
    """
    Get current weather data for specified coordinates from Open-Meteo API
    
    **Free & Open-Source** - No API key required!
    
    Parameters:
    - latitude: Latitude (-90 to 90)
    - longitude: Longitude (-180 to 180)
    
    Returns current weather data including:
    - Temperature, humidity, pressure
    - Wind speed and direction
    - Cloud cover
    - Precipitation
    """
    try:
        service = get_weather_service()
        weather_data = await service.get_weather_by_coordinates(latitude, longitude)
        return weather_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch weather: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather data: {str(e)}"
        )


@router.get("/forecast")
async def get_weather_forecast(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude coordinate"),
    minutes: List[int] = Query(
        default=[0, 15, 30, 45, 60, 120, 180, 360],
        description="Forecast horizons in minutes (0=current, 15, 30, 45, 60, 120, 180, 360)"
    )
):
    """
    Get weather forecasts for multiple time horizons from Open-Meteo API
    
    **Free & Open-Source** - No API key required!
    
    Parameters:
    - latitude: Latitude (-90 to 90)
    - longitude: Longitude (-180 to 180)
    - minutes: List of forecast times in minutes
      - Default: [0, 15, 30, 45, 60, 120, 180, 360]
      - 0 = current, 15 = +15min, 60 = +1h, 360 = +6h
    
    Returns weather forecasts including:
    - Temperature, humidity, pressure for each time horizon
    - Wind speed and direction
    - Rainfall accumulations (1h, 3h, 6h, 12h, 24h)
    - Pressure difference over 3 hours
    
    Example:
    - `/weather/forecast?latitude=13.7563&longitude=100.5018`
    - `/weather/forecast?latitude=13.7563&longitude=100.5018&minutes=15&minutes=30&minutes=60`
    """
    try:
        service = get_weather_service()
        weather_data = await service.get_weather_forecast(latitude, longitude, minutes)
        return weather_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch weather forecast: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather forecast: {str(e)}"
        )
