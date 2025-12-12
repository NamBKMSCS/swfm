"""
Weather Data Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional


class WeatherLocation(BaseModel):
    latitude: float
    longitude: float
    name: str
    country: str


class WeatherCondition(BaseModel):
    main: str
    description: str
    icon: Optional[str] = None


class Temperature(BaseModel):
    current: float
    feels_like: float
    min: float
    max: float
    unit: str = "celsius"


class Atmospheric(BaseModel):
    pressure: int
    humidity: int
    visibility: Optional[int] = None
    clouds: Optional[int] = None


class Wind(BaseModel):
    speed: Optional[float] = None
    direction: Optional[int] = None
    gust: Optional[float] = None


class Precipitation(BaseModel):
    rain_1h: Optional[float] = None
    rain_3h: Optional[float] = None
    snow_1h: Optional[float] = None
    snow_3h: Optional[float] = None


class WeatherDataResponse(BaseModel):
    location: WeatherLocation
    weather: WeatherCondition
    temperature: Temperature
    atmospheric: Atmospheric
    wind: Wind
    precipitation: Precipitation
    timestamp: int
    timezone: Optional[int] = None
    sunrise: Optional[int] = None
    sunset: Optional[int] = None


class WeatherRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
