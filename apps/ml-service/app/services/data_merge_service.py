"""
Data Merge Service - Merge station measurements with weather data
"""
import pandas as pd
from datetime import datetime
from typing import Tuple, Dict, Optional
from supabase import Client
import logging

logger = logging.getLogger(__name__)


class DataMergeService:
    """Service for merging station measurements with weather data"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    async def merge_station_with_weather(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        tolerance_hours: int = 2
    ) -> Tuple[pd.DataFrame, Dict]:
        """
        Merge station measurements with weather data from Supabase
        
        Args:
            start_date: Start date filter (YYYY-MM-DD)
            end_date: End date filter (YYYY-MM-DD)
            tolerance_hours: Maximum time difference for matching (hours)
            
        Returns:
            Tuple of (merged_dataframe, statistics_dict)
        """
        logger.info(f"Starting data merge: {start_date} to {end_date}")
        
        # Fetch station measurements
        query = self.supabase.table('station_measurements').select('*')
        
        if start_date:
            query = query.gte('measured_at', f'{start_date}T00:00:00+00:00')
        if end_date:
            query = query.lte('measured_at', f'{end_date}T23:59:59+00:00')
        
        station_result = query.execute()
        df_station = pd.DataFrame(station_result.data)
        
        if df_station.empty:
            raise ValueError("No station measurements found for the specified date range")
        
        logger.info(f"Fetched {len(df_station)} station measurements")
        
        # Fetch weather measurements
        weather_query = self.supabase.table('weather_measurements').select('*')
        
        if start_date:
            weather_query = weather_query.gte('measured_at', f'{start_date}T00:00:00+00:00')
        if end_date:
            weather_query = weather_query.lte('measured_at', f'{end_date}T23:59:59+00:00')
        
        weather_result = weather_query.execute()
        df_weather = pd.DataFrame(weather_result.data)
        
        logger.info(f"Fetched {len(df_weather)} weather measurements")
        
        # Convert timestamps
        df_station['measured_at'] = pd.to_datetime(df_station['measured_at'])
        df_weather['measured_at'] = pd.to_datetime(df_weather['measured_at'])
        
        # Merge using pandas merge_asof with tolerance
        df_station_sorted = df_station.sort_values('measured_at')
        df_weather_sorted = df_weather.sort_values('measured_at')
        
        df_merged = pd.merge_asof(
            df_station_sorted,
            df_weather_sorted,
            on='measured_at',
            direction='nearest',
            tolerance=pd.Timedelta(hours=tolerance_hours),
            suffixes=('_station', '_weather')
        )
        
        # Calculate statistics
        total_records = len(df_merged)
        records_with_weather = df_merged['temperature'].notna().sum()
        records_missing_weather = total_records - records_with_weather
        coverage_percentage = (records_with_weather / total_records * 100) if total_records > 0 else 0
        
        # Get unique stations
        stations_count = df_merged['station_id'].nunique() if 'station_id' in df_merged.columns else 0
        
        stats = {
            'total_records': int(total_records),
            'records_with_weather': int(records_with_weather),
            'records_missing_weather': int(records_missing_weather),
            'coverage_percentage': round(coverage_percentage, 2),
            'stations_count': int(stations_count),
            'time_range_start': df_merged['measured_at'].min().isoformat() if not df_merged.empty else None,
            'time_range_end': df_merged['measured_at'].max().isoformat() if not df_merged.empty else None,
            'weather_source': 'supabase'
        }
        
        logger.info(f"Merge completed: {stats}")
        
        return df_merged, stats
    
    async def get_stations(self):
        """Fetch all stations"""
        result = self.supabase.table('stations').select('*').execute()
        return result.data
    
    async def get_station_measurements(
        self,
        station_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ):
        """Fetch measurements for a specific station"""
        query = self.supabase.table('station_measurements')\
            .select('*')\
            .eq('station_id', station_id)\
            .order('measured_at', desc=True)\
            .limit(limit)
        
        if start_date:
            query = query.gte('measured_at', f'{start_date}T00:00:00+00:00')
        if end_date:
            query = query.lte('measured_at', f'{end_date}T23:59:59+00:00')
        
        result = query.execute()
        return result.data
