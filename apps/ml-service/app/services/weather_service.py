"""
Weather Service - Fetch weather data from Open-Meteo API
Free, open-source weather API with no API key required
"""
import httpx
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class WeatherService:
    """Service for fetching weather data from Open-Meteo API"""
    
    OPEN_METEO_API_BASE = "https://api.open-meteo.com/v1/forecast"
    
    def __init__(self):
        """Initialize Open-Meteo weather service (no API key required)"""
        pass
    
    async def get_weather_by_coordinates(
        self,
        latitude: float,
        longitude: float
    ) -> Dict:
        """
        Fetch current weather data for given coordinates from Open-Meteo
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            
        Returns:
            Dictionary with current weather data
            
        Raises:
            httpx.HTTPError: If API request fails
        """
        params = {
            'latitude': latitude,
            'longitude': longitude,
            'current': [
                'temperature_2m',
                'relative_humidity_2m',
                'precipitation',
                'pressure_msl',
                'wind_speed_10m',
                'wind_direction_10m',
                'cloud_cover'
            ],
            'timezone': 'auto'
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.OPEN_METEO_API_BASE, params=params)
            response.raise_for_status()
            data = response.json()
        
        current = data['current']
        
        # Transform to consistent format
        weather_data = {
            "location": {
                "latitude": data["latitude"],
                "longitude": data["longitude"],
                "timezone": data.get("timezone", "UTC"),
                "elevation": data.get("elevation", 0)
            },
            "weather": {
                "temperature": current['temperature_2m'],
                "humidity": current['relative_humidity_2m'],
                "pressure": current['pressure_msl'],
                "wind_speed": current['wind_speed_10m'],
                "wind_direction": current['wind_direction_10m'],
                "cloud_cover": current['cloud_cover'],
                "precipitation": current['precipitation']
            },
            "timestamp": current['time'],
            "units": {
                "temperature": "°C",
                "pressure": "hPa",
                "wind_speed": "km/h",
                "precipitation": "mm"
            }
        }
        
        logger.info(f"Fetched weather for coordinates ({latitude}, {longitude}): {current['temperature_2m']}°C")
        
        return weather_data
    
    async def get_weather_forecast(
        self,
        latitude: float,
        longitude: float,
        minutes_list: List[int] = [0, 15, 30, 45, 60, 120, 180, 360]
    ) -> Dict:
        """
        Fetch weather forecasts for multiple time horizons from Open-Meteo
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            minutes_list: List of forecast times in minutes (0=current, 15, 30, 45, 60, 120, 180, 360)
            
        Returns:
            Dictionary with forecasts for each time horizon
            
        Raises:
            httpx.HTTPError: If API request fails
        """
        params = {
            'latitude': latitude,
            'longitude': longitude,
            'hourly': [
                'temperature_2m',
                'relative_humidity_2m',
                'precipitation',
                'pressure_msl',
                'wind_speed_10m',
                'wind_direction_10m',
                'cloud_cover'
            ],
            'timezone': 'auto',
            'forecast_days': 2  # Get 2 days to cover all horizons
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.OPEN_METEO_API_BASE, params=params)
            response.raise_for_status()
            data = response.json()
        
        hourly = data['hourly']
        times = [datetime.fromisoformat(t) for t in hourly['time']]
        
        forecasts = {}
        
        for minutes in minutes_list:
            target_time = datetime.now() + timedelta(minutes=minutes)
            
            # Find closest time index
            closest_idx = min(range(len(times)), key=lambda i: abs((times[i] - target_time).total_seconds()))
            
            # Calculate cumulative rainfall
            rainfall_1h = hourly['precipitation'][closest_idx]
            rainfall_3h = sum(hourly['precipitation'][max(0, closest_idx-2):closest_idx+1])
            rainfall_6h = sum(hourly['precipitation'][max(0, closest_idx-5):closest_idx+1])
            rainfall_12h = sum(hourly['precipitation'][max(0, closest_idx-11):closest_idx+1])
            rainfall_24h = sum(hourly['precipitation'][max(0, closest_idx-23):closest_idx+1])
            
            # Calculate pressure difference
            pressure_diff_3h = 0.0
            if closest_idx >= 3:
                pressure_diff_3h = hourly['pressure_msl'][closest_idx] - hourly['pressure_msl'][closest_idx - 3]
            
            time_label = "current" if minutes == 0 else f"+{minutes}min"
            
            forecasts[time_label] = {
                "minutes_ahead": minutes,
                "timestamp": hourly['time'][closest_idx],
                "weather": {
                    "temperature": hourly['temperature_2m'][closest_idx],
                    "humidity": hourly['relative_humidity_2m'][closest_idx],
                    "pressure": hourly['pressure_msl'][closest_idx],
                    "wind_speed": hourly['wind_speed_10m'][closest_idx],
                    "wind_direction": hourly['wind_direction_10m'][closest_idx],
                    "cloud_cover": hourly['cloud_cover'][closest_idx],
                    "rainfall_1h": rainfall_1h,
                    "rainfall_3h": rainfall_3h,
                    "rainfall_6h": rainfall_6h,
                    "rainfall_12h": rainfall_12h,
                    "rainfall_24h": rainfall_24h,
                    "pressure_diff_3h": pressure_diff_3h
                }
            }
        
        result = {
            "location": {
                "latitude": data["latitude"],
                "longitude": data["longitude"],
                "timezone": data.get("timezone", "UTC"),
                "elevation": data.get("elevation", 0)
            },
            "forecasts": forecasts,
            "units": {
                "temperature": "°C",
                "pressure": "hPa",
                "wind_speed": "km/h",
                "precipitation": "mm"
            }
        }
        
        logger.info(f"Fetched {len(forecasts)} forecasts for coordinates ({latitude}, {longitude})")
        
        return result
