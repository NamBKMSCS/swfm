"""
Preprocessing Service
Handles data preprocessing based on configurations from database
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import time
import asyncio
from supabase import create_client, Client

from app.config import get_settings
from app.services.data_merge_service import DataMergeService

settings = get_settings()


class PreprocessingService:
    """Service for preprocessing water level data"""
    
    def __init__(self):
        """Initialize preprocessing service with Supabase client"""
        if not settings.supabase_url or not settings.supabase_key:
            raise ValueError("Supabase credentials not configured")
        
        self.supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )
        
        # Initialize data merge service for weather data integration
        self.merge_service = DataMergeService(self.supabase)
    
    def get_preprocessing_configs(self) -> Dict[str, Any]:
        """
        Fetch all preprocessing configurations from database
        
        Returns:
            Dictionary mapping method_id to config
        """
        response = self.supabase.table('preprocessing_configs').select('*').eq('enabled', True).execute()
        
        configs = {}
        for row in response.data:
            configs[row['method_id']] = row['config']
        
        return configs
    
    def get_station_data(self, station_id: Optional[int] = None, start_date: Optional[str] = None, 
                        end_date: Optional[str] = None, include_weather: bool = True) -> pd.DataFrame:
        """
        Fetch station measurements from database and merge with weather data
        
        Args:
            station_id: Station ID (if None, fetches all stations)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            include_weather: Whether to merge weather data (default: True)
            
        Returns:
            DataFrame with station measurements (and weather data if include_weather=True)
        """
        # If weather merge is enabled, use DataMergeService
        if include_weather:
            try:
                # Run async merge in sync context - handle both notebook and non-notebook environments
                try:
                    # Try to get existing event loop (Jupyter notebook case)
                    loop = asyncio.get_running_loop()
                    # If we're in a running loop, we need to use nest_asyncio
                    import nest_asyncio
                    nest_asyncio.apply()
                    df_merged, stats = asyncio.run(
                        self.merge_service.merge_station_with_weather(
                            start_date=start_date,
                            end_date=end_date,
                            tolerance_hours=2
                        )
                    )
                except RuntimeError:
                    # No running loop, create new one (normal execution case)
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    df_merged, stats = loop.run_until_complete(
                        self.merge_service.merge_station_with_weather(
                            start_date=start_date,
                            end_date=end_date,
                            tolerance_hours=2
                        )
                    )
                    loop.close()
                
                # Clean up column names from merge_asof suffixes
                # Rename station columns (remove _station suffix)
                df_merged = df_merged.rename(columns={
                    'id_station': 'id',
                    'station_id_station': 'station_id',
                    'created_at_station': 'created_at'
                })
                
                # Drop weather duplicate columns, rainfall_7to7, flow_rate, and rainfall
                cols_to_drop = ['id_weather', 'station_id_weather', 'created_at_weather', 'rainfall_7to7', 'flow_rate', 'rainfall']
                df_merged = df_merged.drop(columns=[col for col in cols_to_drop if col in df_merged.columns])
                
                # Exclude problematic stations (1 and 7)
                df_merged = df_merged[~df_merged['station_id'].isin([1, 7])]
                print(f"   ✓ Excluded stations 1 and 7 from dataset")
                
                # Filter by station_id if provided
                if station_id is not None:
                    # Check if requested station is excluded
                    if station_id in [1, 7]:
                        raise ValueError(f"Station {station_id} is excluded from training/prediction")
                    df_merged = df_merged[df_merged['station_id'] == station_id]
                    
                    if len(df_merged) == 0:
                        print(f"⚠️  No data for station {station_id} in date range. Falling back to station data only.")
                        raise ValueError(f"No data in merged result for station {station_id}")
                
                print(f"✓ Merged data with weather: {len(df_merged)} records, {stats['coverage_percentage']:.1f}% weather coverage")
                
                return df_merged.sort_values('measured_at').reset_index(drop=True)
                
            except Exception as e:
                if "No data in merged result" not in str(e):
                    print(f"⚠️  Weather merge failed: {e}. Falling back to station data only.")
                # Fall through to original implementation
        
        # Original implementation (no weather data)
        query = self.supabase.table('station_measurements').select('*')
        
        # Exclude problematic stations (1 and 7)
        query = query.not_.in_('station_id', [1, 7])
        
        # Filter by station_id if provided
        if station_id is not None:
            # Check if requested station is excluded
            if station_id in [1, 7]:
                raise ValueError(f"Station {station_id} is excluded from training/prediction")
            query = query.eq('station_id', station_id)
        
        if start_date:
            # Handle both date strings (YYYY-MM-DD) and ISO datetime strings
            if 'T' in start_date:
                query = query.gte('measured_at', start_date)
            else:
                query = query.gte('measured_at', f'{start_date}T00:00:00+00:00')
        if end_date:
            # Handle both date strings (YYYY-MM-DD) and ISO datetime strings
            if 'T' in end_date:
                query = query.lte('measured_at', end_date)
            else:
                query = query.lte('measured_at', f'{end_date}T23:59:59+00:00')
        
        # Fetch with pagination
        all_data = []
        page_size = 1000
        offset = 0
        
        while True:
            response = query.order('measured_at').range(offset, offset + page_size - 1).execute()
            if not response.data:
                break
            all_data.extend(response.data)
            if len(response.data) < page_size:
                break
            offset += page_size
        
        if not all_data:
            raise ValueError(f"No data found for station {station_id}")
        
        df = pd.DataFrame(all_data)
        df['measured_at'] = pd.to_datetime(df['measured_at'])
        
        # Drop rainfall_7to7, flow_rate, and rainfall if they exist
        cols_to_drop = ['rainfall_7to7', 'flow_rate', 'rainfall']
        df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
        
        return df.sort_values('measured_at').reset_index(drop=True)
    
    def apply_lag_features(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Apply lag features based on configuration with adaptive interval detection"""
        lag_periods = config.get('lag_periods', [1, 2, 3, 6, 12])  # Max 12h to reduce record loss
        
        # Check if we have multiple stations
        if 'station_id' in df.columns and df['station_id'].nunique() > 1:
            # Multi-station: detect interval for each station and apply adaptive lags
            for station_id in df['station_id'].unique():
                station_mask = df['station_id'] == station_id
                station_df = df[station_mask].sort_values('measured_at')
                
                # Detect actual interval for this station (in minutes)
                if len(station_df) > 1:
                    time_diffs = station_df['measured_at'].diff().dt.total_seconds() / 60
                    mode_interval = time_diffs.mode().values[0] if len(time_diffs.mode()) > 0 else 30
                    periods_per_hour = 60 / mode_interval  # e.g., 15min -> 4, 30min -> 2
                    
                    # Apply lags for this station
                    for lag in lag_periods:
                        shift_periods = int(lag * periods_per_hour)
                        col_name = f'water_level_lag_{lag}h'
                        if col_name not in df.columns:
                            df[col_name] = np.nan
                        df.loc[station_mask, col_name] = station_df['water_level'].shift(shift_periods).values
        else:
            # Single station: detect interval once
            if len(df) > 1:
                time_diffs = df.sort_values('measured_at')['measured_at'].diff().dt.total_seconds() / 60
                mode_interval = time_diffs.mode().values[0] if len(time_diffs.mode()) > 0 else 30
                periods_per_hour = 60 / mode_interval
                
                for lag in lag_periods:
                    shift_periods = int(lag * periods_per_hour)
                    df[f'water_level_lag_{lag}h'] = df['water_level'].shift(shift_periods)
        
        return df
    
    def apply_rolling_statistics(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Apply rolling statistics based on configuration with adaptive intervals"""
        windows = config.get('windows', [3, 6, 12, 24])
        statistics = config.get('statistics', ['mean', 'std'])
        min_periods = config.get('min_periods', 1)
        
        # Check if we have multiple stations
        if 'station_id' in df.columns and df['station_id'].nunique() > 1:
            # Multi-station: detect interval for each station
            for station_id in df['station_id'].unique():
                station_mask = df['station_id'] == station_id
                station_df = df[station_mask].sort_values('measured_at')
                
                if len(station_df) > 1:
                    time_diffs = station_df['measured_at'].diff().dt.total_seconds() / 60
                    mode_interval = time_diffs.mode().values[0] if len(time_diffs.mode()) > 0 else 30
                    periods_per_hour = 60 / mode_interval
                    
                    for window in windows:
                        window_periods = int(window * periods_per_hour)
                        if 'mean' in statistics:
                            col_name = f'water_level_rolling_mean_{window}h'
                            if col_name not in df.columns:
                                df[col_name] = np.nan
                            df.loc[station_mask, col_name] = station_df['water_level'].rolling(
                                window=window_periods, min_periods=min_periods
                            ).mean().values
                        if 'std' in statistics:
                            col_name = f'water_level_rolling_std_{window}h'
                            if col_name not in df.columns:
                                df[col_name] = np.nan
                            df.loc[station_mask, col_name] = station_df['water_level'].rolling(
                                window=window_periods, min_periods=min_periods
                            ).std().values
        else:
            # Single station: detect interval once
            if len(df) > 1:
                time_diffs = df.sort_values('measured_at')['measured_at'].diff().dt.total_seconds() / 60
                mode_interval = time_diffs.mode().values[0] if len(time_diffs.mode()) > 0 else 30
                periods_per_hour = 60 / mode_interval
                
                for window in windows:
                    window_periods = int(window * periods_per_hour)
                    if 'mean' in statistics:
                        df[f'water_level_rolling_mean_{window}h'] = df['water_level'].rolling(
                            window=window_periods, min_periods=min_periods
                        ).mean()
                    if 'std' in statistics:
                        df[f'water_level_rolling_std_{window}h'] = df['water_level'].rolling(
                            window=window_periods, min_periods=min_periods
                        ).std()
        
        return df
    
    def apply_rate_of_change(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Apply rate of change features with adaptive intervals"""
        periods = config.get('periods', [1, 3, 6])
        
        # Check if we have multiple stations
        if 'station_id' in df.columns and df['station_id'].nunique() > 1:
            # Multi-station: detect interval for each station
            for station_id in df['station_id'].unique():
                station_mask = df['station_id'] == station_id
                station_df = df[station_mask].sort_values('measured_at')
                
                if len(station_df) > 1:
                    time_diffs = station_df['measured_at'].diff().dt.total_seconds() / 60
                    mode_interval = time_diffs.mode().values[0] if len(time_diffs.mode()) > 0 else 30
                    periods_per_hour = 60 / mode_interval
                    
                    for period in periods:
                        shift_periods = int(period * periods_per_hour)
                        col_name = f'water_level_change_{period}h'
                        if col_name not in df.columns:
                            df[col_name] = np.nan
                        df.loc[station_mask, col_name] = station_df['water_level'].diff(shift_periods).values
        else:
            # Single station: detect interval once
            if len(df) > 1:
                time_diffs = df.sort_values('measured_at')['measured_at'].diff().dt.total_seconds() / 60
                mode_interval = time_diffs.mode().values[0] if len(time_diffs.mode()) > 0 else 30
                periods_per_hour = 60 / mode_interval
                
                for period in periods:
                    shift_periods = int(period * periods_per_hour)
                    df[f'water_level_change_{period}h'] = df['water_level'].diff(shift_periods)
        
        return df
    
    def apply_time_features(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Apply time-based features with cyclical encoding"""
        df['hour'] = df['measured_at'].dt.hour
        df['day_of_week'] = df['measured_at'].dt.dayofweek
        df['day_of_month'] = df['measured_at'].dt.day
        df['month'] = df['measured_at'].dt.month
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Cyclical encoding
        hour_cycle = config.get('hour_cycle', 24)
        month_cycle = config.get('month_cycle', 12)
        
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / hour_cycle)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / hour_cycle)
        df['month_sin'] = np.sin(2 * np.pi * (df['month'] - 1) / month_cycle)
        df['month_cos'] = np.cos(2 * np.pi * (df['month'] - 1) / month_cycle)
        
        return df
    
    def apply_rainfall_features(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Apply rainfall cumulative features"""
        if 'rainfall_1h' not in df.columns:
            return df
        
        windows = config.get('windows', [3, 6, 12, 24])
        
        # Check if we have multiple stations
        if 'station_id' in df.columns and df['station_id'].nunique() > 1:
            # Group by station_id for multi-station data
            for window in windows:
                df[f'rainfall_sum_{window}h'] = df.groupby('station_id')['rainfall_1h'].transform(
                    lambda x: x.rolling(window=window, min_periods=1).sum()
                )
        else:
            # Single station - no grouping needed
            for window in windows:
                df[f'rainfall_sum_{window}h'] = df['rainfall_1h'].rolling(
                    window=window, min_periods=1
                ).sum()
        
        return df
    
    def apply_weather_interactions(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Apply weather interaction features"""
        if 'temperature' in df.columns and 'humidity' in df.columns:
            df['temp_humidity_interaction'] = df['temperature'] * df['humidity'] / 100
        
        if 'pressure' in df.columns:
            # Check if we have multiple stations
            if 'station_id' in df.columns and df['station_id'].nunique() > 1:
                df['pressure_diff_3h'] = df.groupby('station_id')['pressure'].diff(3)
            else:
                df['pressure_diff_3h'] = df['pressure'].diff(3)
        
        return df
    
    def apply_station_statistics(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Apply station-specific statistics"""
        # Check if we have multiple stations
        if 'station_id' in df.columns and df['station_id'].nunique() > 1:
            # Calculate per-station statistics for multi-station data
            df['station_water_mean'] = df.groupby('station_id')['water_level'].transform('mean')
            df['station_water_std'] = df.groupby('station_id')['water_level'].transform('std')
            df['water_level_deviation'] = df['water_level'] - df['station_water_mean']
        else:
            # Single station - calculate once
            station_mean = df['water_level'].mean()
            station_std = df['water_level'].std()
            
            df['station_water_mean'] = station_mean
            df['station_water_std'] = station_std
            df['water_level_deviation'] = df['water_level'] - station_mean
        
        return df
    
    def create_targets(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Create target variables for multiple prediction horizons"""
        horizons = config.get('prediction_horizons', [15, 30, 45, 60, 90])
        
        # Check if we have multiple stations
        has_multiple_stations = 'station_id' in df.columns and df['station_id'].nunique() > 1
        
        # Data interval is 15 minutes
        data_interval_minutes = 15
        
        for horizon in horizons:
            # Convert horizon minutes to number of periods (15-minute intervals)
            shift_periods = horizon // data_interval_minutes
            
            if has_multiple_stations:
                # Group by station_id for multi-station data
                df[f'target_{horizon}min'] = df.groupby('station_id')['water_level'].shift(-shift_periods)
            else:
                # Single station - no grouping needed
                df[f'target_{horizon}min'] = df['water_level'].shift(-shift_periods)
        
        return df
    
    def clean_data(self, df: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Clean data - handle missing values and remove invalid rows"""
        # Make a copy to avoid SettingWithCopyWarning
        df = df.copy()
        
        # Remove rows with missing lag features
        if config.get('remove_rows_with_missing_lags', True):
            lag_cols = [col for col in df.columns if 'lag_' in col]
            if lag_cols:
                df = df.dropna(subset=lag_cols)
        
        # Impute remaining missing values
        strategy = config.get('missing_value_strategy', 'median')
        # Exclude datetime columns and only process numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        # Exclude any datetime-related columns that might have been converted
        exclude_cols = ['measured_at', 'created_at', 'id', 'station_id']
        numeric_cols = [col for col in numeric_cols if col not in exclude_cols]
        
        if strategy == 'median':
            for col in numeric_cols:
                if df[col].isnull().any():
                    df[col] = df[col].fillna(df[col].median())
        elif strategy == 'mean':
            for col in numeric_cols:
                if df[col].isnull().any():
                    df[col] = df[col].fillna(df[col].mean())
        
        return df
    
    def preprocess_data(self, station_id: Optional[int] = None, start_date: Optional[str] = None,
                       end_date: Optional[str] = None, 
                       prediction_horizons: List[int] = [15, 30, 45, 60, 90],
                       custom_configs: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main preprocessing pipeline
        
        Args:
            station_id: Station ID to process (if None, processes all stations)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            prediction_horizons: List of prediction horizons in minutes
            custom_configs: Optional custom configurations (overrides database)
            
        Returns:
            Dictionary with preprocessing results and metadata
        """
        start_time = time.time()
        
        # Get configurations
        if custom_configs:
            configs = custom_configs
        else:
            configs = self.get_preprocessing_configs()
        
        # Fetch station data
        df = self.get_station_data(station_id, start_date, end_date)
        initial_records = len(df)
        
        # Apply preprocessing steps in order
        if configs.get('time_features', {}).get('enabled', True) if isinstance(configs.get('time_features'), dict) else 'time_features' in configs:
            time_config = configs.get('time_features', {})
            df = self.apply_time_features(df, time_config)
        
        if 'lag_features' in configs:
            df = self.apply_lag_features(df, configs['lag_features'])
        
        if 'rolling_statistics' in configs:
            df = self.apply_rolling_statistics(df, configs['rolling_statistics'])
        
        if 'rate_of_change' in configs:
            df = self.apply_rate_of_change(df, configs['rate_of_change'])
        
        if 'rainfall_features' in configs:
            df = self.apply_rainfall_features(df, configs['rainfall_features'])
        
        if 'weather_interactions' in configs:
            df = self.apply_weather_interactions(df, configs['weather_interactions'])
        
        if 'station_statistics' in configs:
            df = self.apply_station_statistics(df, configs['station_statistics'])
        
        # Create targets
        if 'target_creation' in configs:
            target_config = configs['target_creation']
            target_config['prediction_horizons'] = prediction_horizons
            df = self.create_targets(df, target_config)
        
        # Clean data
        if 'data_cleaning' in configs:
            df = self.clean_data(df, configs['data_cleaning'])
        
        execution_time = time.time() - start_time
        
        # Generate summary
        # Exclude metadata and datetime columns from features
        exclude_from_features = ['id', 'station_id', 'measured_at', 'created_at']
        feature_cols = [col for col in df.columns 
                       if col not in exclude_from_features and not col.startswith('target_')]
        target_cols = [col for col in df.columns if col.startswith('target_')]
        
        # Get sample data (first 10 rows)
        sample_size = min(10, len(df))
        sample_df = df.head(sample_size)
        
        # Convert sample to list of dicts, handling datetime and NaN values
        sample_data = []
        for _, row in sample_df.iterrows():
            record = {}
            for col in df.columns:
                value = row[col]
                # Convert timestamps to ISO format
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    record[col] = value.isoformat() if pd.notna(value) else None
                # Convert NaN to None
                elif pd.isna(value):
                    record[col] = None
                # Round floats to 4 decimal places
                elif isinstance(value, (float, np.float64, np.float32)):
                    record[col] = round(float(value), 4)
                else:
                    record[col] = value
            sample_data.append(record)
        
        return {
            'status': 'success',
            'message': 'Data preprocessing completed',
            'station_id': station_id,
            'records_processed': len(df),
            'features_generated': len(feature_cols),
            'prediction_horizons': prediction_horizons,
            'configs_used': list(configs.keys()),
            'execution_time_seconds': round(execution_time, 3),
            'processed_data': df,  # Add the processed DataFrame
            'sample_data': sample_data,  # Add sample preprocessed data
            'data_summary': {
                'initial_records': initial_records,
                'final_records': len(df),
                'records_removed': initial_records - len(df),
                'date_range': {
                    'start': df['measured_at'].min().isoformat(),
                    'end': df['measured_at'].max().isoformat()
                },
                'feature_count': len(feature_cols),
                'target_count': len(target_cols),
                'missing_values': int(df[feature_cols].isnull().sum().sum()),
                'features': feature_cols[:20]  # First 20 features
            }
        }
    
    def prepare_latest_data_for_prediction(self, station_id: Optional[int] = None):
        """
        Prepare the latest available data for making predictions
        
        Args:
            station_id: Station ID (None for unified model - all stations)
            
        Returns:
            Tuple of (X_features, feature_names, scaler_info)
        """
        # Get the last 30 days of data (to ensure we have enough historical data for features)
        end_date = datetime.utcnow().isoformat()
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        
        # Fetch and preprocess data
        result = self.preprocess_data(
            station_id=station_id,
            start_date=start_date,
            end_date=end_date,
            prediction_horizons=[15]  # We only need features, not targets
        )
        
        df = result['processed_data']
        
        if df is None or len(df) == 0:
            return None, None, None
        
        # Get feature columns (exclude targets and metadata, but KEEP station_id)
        target_cols = [col for col in df.columns if col.startswith('target_')]
        
        # Exclude only metadata/identifier columns, keep all engineered features
        exclude_cols = ['measured_at', 'id', 'created_at', 'fetched_at', 'source', 'status']
        
        feature_cols = [col for col in df.columns 
                       if col not in target_cols 
                       and col not in exclude_cols
                       and not col.startswith('target_')]
        
        # Get the most recent complete record
        # IMPORTANT: At this point, all lag and rolling features have been computed correctly
        # by preprocess_data() using the full historical dataset
        X_latest = df[feature_cols].iloc[-1:].copy()
        
        # Check for NaN values and report them
        nan_cols = X_latest.columns[X_latest.isna().any()].tolist()
        if nan_cols:
            print(f"   ⚠️  WARNING: Found {len(nan_cols)} features with NaN values: {nan_cols[:10]}")
            print(f"   🔧 These will be filled with the column mean from historical data")
            
            # Fill NaN with the column mean from the full dataset (better than 0)
            for col in nan_cols:
                col_mean = df[col].mean()
                if pd.isna(col_mean):
                    # If mean is also NaN (all values are NaN), use 0
                    X_latest[col] = X_latest[col].fillna(0)
                    print(f"      • {col}: filled with 0 (no historical data)")
                else:
                    X_latest[col] = X_latest[col].fillna(col_mean)
                    print(f"      • {col}: filled with mean={col_mean:.2f}")
        else:
            print(f"   ✓ No NaN values in features - all computed correctly!")
        
        # Debug: print first 20 features and values
        print(f"   📋 Features (first 20): {feature_cols[:20]}")
        wl = X_latest['water_level'].values[0] if 'water_level' in X_latest.columns else 'N/A'
        sid = X_latest['station_id'].values[0] if 'station_id' in X_latest.columns else 'N/A'
        print(f"   📊 Input values: station_id={sid}, water_level={wl}cm ({wl/100 if isinstance(wl, (int, float)) else 'N/A'}m)")
        
        # Show some lag features to verify they're not zero
        lag_features = [col for col in feature_cols if 'lag' in col.lower()][:5]
        if lag_features:
            print(f"   🔍 Sample lag features:")
            for feat in lag_features:
                val = X_latest[feat].values[0]
                print(f"      • {feat}: {val:.2f}")
        
        print(f"   ℹ️  Total features: {len(feature_cols)}, Total samples: {len(X_latest)}")
        
        return X_latest, feature_cols, None
