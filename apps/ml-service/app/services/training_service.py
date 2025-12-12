"""
Training Service - Handles model training with MLflow tracking
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import time
import mlflow
from mlflow.tracking import MlflowClient
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler

from app.config import get_settings
from app.services.preprocessing_service import PreprocessingService
from app.schemas.training import ModelMetrics, HorizonModelResult

settings = get_settings()


class TrainingService:
    """Service for training ML models"""
    
    def __init__(self):
        """Initialize training service"""
        self.preprocessing_service = PreprocessingService()
        self.mlflow_client = MlflowClient()
        
        # Setup MLflow
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        
        # Disable logged model CRUD to avoid version mismatch between client and server
        import os
        os.environ["MLFLOW_ENABLE_LOGGED_MODEL_CRUD"] = "false"
    
    def save_performance_to_db_and_register(self, station_id: Optional[int], model_type: str, 
                                           test_metrics: ModelMetrics, run_id: str, 
                                           horizon_minutes: int, register_to_mlflow: bool = True) -> None:
        """
        Save model performance metrics to database and automatically register to MLflow Model Registry
        
        Note: The horizon is encoded in the model_type field (e.g., 'linear_15min', 'ridge_30min')
        
        Args:
            station_id: Station ID (None for unified model across all stations)
            model_type: Type of model (linear, ridge) - will be combined with horizon
            test_metrics: Test set metrics
            run_id: MLflow run ID
            horizon_minutes: Prediction horizon in minutes
            register_to_mlflow: Whether to register model to MLflow Model Registry (default: True)
        """
        # Use station_id=0 for unified models (global station entry)
        db_station_id = station_id if station_id is not None else 0
        
        try:
            # Calculate MAPE and accuracy
            mape = (test_metrics.mae / abs(test_metrics.rmse)) * 100 if test_metrics.rmse != 0 else 0
            accuracy = max(0, min(100, (1 - test_metrics.rmse) * 100))  # Simple accuracy calculation
            
            performance_data = {
                'id': run_id,  # Use MLflow run_id as the primary key
                'station_id': db_station_id,
                'model_type': f"{model_type}_{horizon_minutes}min",
                'rmse': float(test_metrics.rmse),
                'mae': float(test_metrics.mae),
                'r2': float(test_metrics.r2),
                'mape': float(mape),
                'accuracy': float(accuracy)
            }
            
            # Insert into model_performance table
            response = self.preprocessing_service.supabase.table('model_performance').insert(performance_data).execute()
            
            if response.data:
                model_scope = "unified" if station_id is None else f"station {station_id}"
                print(f"      ✓ Performance saved to database ({model_scope}, MLflow ID: {run_id[:8]}...)")
                
                # Auto-register to MLflow Model Registry
                print(f"      🔍 DEBUG: register_to_mlflow={register_to_mlflow}, type={type(register_to_mlflow)}")
                if register_to_mlflow:
                    print(f"      🔄 Calling _register_model_to_mlflow()...")
                    self._register_model_to_mlflow(
                        run_id=run_id,
                        station_id=station_id,
                        model_type=model_type,
                        horizon_minutes=horizon_minutes,
                        test_metrics=test_metrics
                    )
                else:
                    print(f"      ⏭️  Skipping registration (register_to_mlflow={register_to_mlflow})")
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"      ⚠ Warning: Failed to save performance to database:")
            print(f"         Error: {str(e)}")
            print(f"         Data attempted: {performance_data}")
            # Don't fail training if database insert fails
    
    def _register_model_to_mlflow(self, run_id: str, station_id: Optional[int], 
                                  model_type: str, horizon_minutes: int, 
                                  test_metrics: ModelMetrics) -> None:
        """
        Register trained model to MLflow Model Registry
        
        Args:
            run_id: MLflow run ID
            station_id: Station ID (None for unified model)
            model_type: Type of model (linear, ridge)
            horizon_minutes: Prediction horizon in minutes
            test_metrics: Test set metrics
        """
        print(f"      🎯 _register_model_to_mlflow() called with run_id={run_id[:8]}...")
        try:
            # Generate model name
            station_tag = f"station{station_id}" if station_id is not None else "unified"
            model_name = f"swfm-{model_type}-{station_tag}-{horizon_minutes}min"
            
            # Get the model URI from the run
            model_uri = f"runs:/{run_id}/model"
            
            # Register the model
            model_version = mlflow.register_model(
                model_uri=model_uri,
                name=model_name
            )
            version = model_version.version
            
            # Add tags with metadata
            self.mlflow_client.set_model_version_tag(
                name=model_name,
                version=version,
                key="station_id",
                value=str(station_id) if station_id is not None else "unified"
            )
            self.mlflow_client.set_model_version_tag(
                name=model_name,
                version=version,
                key="model_type",
                value=model_type
            )
            self.mlflow_client.set_model_version_tag(
                name=model_name,
                version=version,
                key="horizon_minutes",
                value=str(horizon_minutes)
            )
            self.mlflow_client.set_model_version_tag(
                name=model_name,
                version=version,
                key="rmse",
                value=str(test_metrics.rmse)
            )
            self.mlflow_client.set_model_version_tag(
                name=model_name,
                version=version,
                key="r2",
                value=str(test_metrics.r2)
            )
            
            # Update model description
            station_desc = f"Station {station_id}" if station_id is not None else "All stations (unified)"
            description = f"{model_type.title()} regression model for {station_desc}, {horizon_minutes}-min horizon. RMSE: {test_metrics.rmse:.4f}, R²: {test_metrics.r2:.4f}"
            self.mlflow_client.update_model_version(
                name=model_name,
                version=version,
                description=description
            )
            
            print(f"      ✓ Model registered in MLflow: {model_name} v{version}")
            
        except Exception as e:
            # Don't fail training if model registration fails
            print(f"      ⚠ Warning: Failed to register model to MLflow: {str(e)}")
    
    def prepare_training_data(
        self,
        station_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        prediction_horizons: List[int] = [15, 30, 45, 60],
        test_size: float = 0.2,
        use_time_split: bool = True
    ) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[int, pd.Series], Dict[int, pd.Series], List[str], StandardScaler, Dict[str, Any]]:
        """
        Prepare data for training using preprocessing service
        
        Args:
            station_id: Station ID (if None, trains on all stations with station_id as feature)
            start_date: Start date for training data (if None, uses training_range config)
            end_date: End date for training data (if None, uses training_range config)
        
        Returns:
            X_train, X_test, y_train_dict, y_test_dict, feature_names, scaler, stats
        """
        # If dates not provided, fetch from training_data_range configuration
        if start_date is None or end_date is None:
            try:
                training_range_config = self.preprocessing_service.supabase.table('preprocessing_configs')\
                    .select('config')\
                    .eq('method_id', 'training_data_range')\
                    .eq('enabled', True)\
                    .single()\
                    .execute()
                
                if training_range_config.data:
                    from dateutil.relativedelta import relativedelta
                    from datetime import datetime as dt
                    
                    config = training_range_config.data['config']
                    months = config.get('months', 1)
                    
                    # Calculate date range: current timestamp - N months to current timestamp
                    if end_date is None:
                        end_date = dt.now().strftime('%Y-%m-%d')
                    
                    if start_date is None:
                        end_dt = dt.strptime(end_date, '%Y-%m-%d')
                        start_dt = end_dt - relativedelta(months=months)
                        start_date = start_dt.strftime('%Y-%m-%d')
                    
                    print(f"   📅 Using training_data_range config: {months} month(s)")
                    print(f"   📅 Date range: {start_date} to {end_date}")
            except Exception as e:
                print(f"   ⚠️  Could not fetch training_data_range config: {e}")
                # Use default dates if config not found
                if start_date is None:
                    start_date = "2025-11-01"
                if end_date is None:
                    end_date = "2025-12-01"
                print(f"   📅 Using default dates: {start_date} to {end_date}")
        
        if station_id is None:
            print(f"📊 Preparing training data for ALL STATIONS (unified model)...")
        else:
            print(f"📊 Preparing training data for station {station_id}...")
        start_time = time.time()
        
        # Preprocess data using same configs as prediction
        result = self.preprocessing_service.preprocess_data(
            station_id=station_id,
            start_date=start_date,
            end_date=end_date,
            prediction_horizons=prediction_horizons
        )
        
        df = result['processed_data']
        
        # Get feature columns (exclude targets, timestamps, metadata)
        # Note: station_id is INCLUDED as a feature when training on all stations
        exclude_cols = ['measured_at', 'id', 'created_at', 'weather_source', 
                       'weather_lag_minutes', 'station_name', 'latitude', 'longitude', 
                       'country', 'alarm_level']
        
        # If training on single station, exclude station_id (it's constant)
        if station_id is not None:
            exclude_cols.append('station_id')
        
        # Also exclude target columns
        target_cols = [f'target_{h}min' for h in prediction_horizons]
        exclude_cols.extend(target_cols)
        
        # Filter for numeric columns only and exclude metadata/targets
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        feature_cols = [col for col in numeric_cols if col not in exclude_cols]
        
        # Remove rows with NaN in any target
        valid_mask = df[target_cols].notna().all(axis=1)
        df_clean = df[valid_mask].copy()
        
        print(f"   ✓ Data cleaned: {len(df_clean):,} valid samples (from {len(df):,})")
        
        # Prepare features (ensure only numeric columns)
        X = df_clean[feature_cols].copy()
        
        # Suppress numpy warnings about empty slices during feature validation
        import warnings
        warnings.filterwarnings('ignore', category=RuntimeWarning, message='Mean of empty slice')
        
        # Check for features with all NaN or constant values and remove them
        nan_features = X.columns[X.isna().all()].tolist()
        constant_features = X.columns[X.nunique() <= 1].tolist()
        invalid_features = list(set(nan_features + constant_features))
        
        if invalid_features:
            print(f"   ⚠ Removing {len(invalid_features)} invalid features: {invalid_features[:5]}...")
            X = X.drop(columns=invalid_features)
            feature_cols = [col for col in feature_cols if col not in invalid_features]
        
        # Fill any remaining NaN values with 0 (after lag/rolling window initialization)
        if X.isna().any().any():
            nan_count = X.isna().sum().sum()
            print(f"   ⚠ Filling {nan_count} remaining NaN values with 0")
            X = X.fillna(0)
        
        # Re-enable warnings
        warnings.filterwarnings('default', category=RuntimeWarning)
        
        # Create target dictionaries
        y_dict = {h: df_clean[f'target_{h}min'] for h in prediction_horizons}
        
        # Split train/test
        if use_time_split:
            # Time-based split
            split_idx = int(len(X) * (1 - test_size))
            X_train = X.iloc[:split_idx]
            X_test = X.iloc[split_idx:]
            y_train_dict = {h: y_dict[h].iloc[:split_idx] for h in prediction_horizons}
            y_test_dict = {h: y_dict[h].iloc[split_idx:] for h in prediction_horizons}
        else:
            # Random split
            from sklearn.model_selection import train_test_split
            train_idx, test_idx = train_test_split(
                range(len(X)), test_size=test_size, random_state=42
            )
            X_train = X.iloc[train_idx]
            X_test = X.iloc[test_idx]
            y_train_dict = {h: y_dict[h].iloc[train_idx] for h in prediction_horizons}
            y_test_dict = {h: y_dict[h].iloc[test_idx] for h in prediction_horizons}
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Convert back to DataFrame
        X_train = pd.DataFrame(X_train_scaled, columns=feature_cols, index=X_train.index)
        X_test = pd.DataFrame(X_test_scaled, columns=feature_cols, index=X_test.index)
        
        prep_time = time.time() - start_time
        
        stats = {
            'total_samples': len(df_clean),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'features_count': len(feature_cols),
            'preprocessing_time': prep_time
        }
        
        print(f"   ✓ Train/Test split: {len(X_train):,} / {len(X_test):,}")
        print(f"   ✓ Features: {len(feature_cols)}")
        print(f"   ✓ Preparation time: {prep_time:.2f}s")
        
        return X_train, X_test, y_train_dict, y_test_dict, feature_cols, scaler, stats
    
    def train_linear(
        self,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        horizon: int = 60,
        run_name: Optional[str] = None,
        scaler: Optional[StandardScaler] = None
    ) -> Tuple[Any, Dict[str, ModelMetrics], float, str]:
        """Train Linear Regression model"""
        start_time = time.time()
        
        with mlflow.start_run(run_name=run_name or f"linear_{horizon}min") as run:
            # Log parameters
            mlflow.log_param("model_type", "linear")
            mlflow.log_param("horizon_minutes", horizon)
            mlflow.log_param("n_features", X_train.shape[1])
            mlflow.log_param("train_samples", len(X_train))
            mlflow.log_param("test_samples", len(X_test))
            
            # Train model
            model = LinearRegression()
            model.fit(X_train, y_train)
            
            # Predictions
            y_train_pred = model.predict(X_train)
            y_test_pred = model.predict(X_test)
            
            # Calculate metrics
            train_metrics = ModelMetrics(
                rmse=float(np.sqrt(mean_squared_error(y_train, y_train_pred))),
                mae=float(mean_absolute_error(y_train, y_train_pred)),
                r2=float(r2_score(y_train, y_train_pred))
            )
            
            test_metrics = ModelMetrics(
                rmse=float(np.sqrt(mean_squared_error(y_test, y_test_pred))),
                mae=float(mean_absolute_error(y_test, y_test_pred)),
                r2=float(r2_score(y_test, y_test_pred))
            )
            
            # Log metrics
            mlflow.log_metric("train_rmse", train_metrics.rmse)
            mlflow.log_metric("train_mae", train_metrics.mae)
            mlflow.log_metric("train_r2", train_metrics.r2)
            mlflow.log_metric("test_rmse", test_metrics.rmse)
            mlflow.log_metric("test_mae", test_metrics.mae)
            mlflow.log_metric("test_r2", test_metrics.r2)
            
            training_time = time.time() - start_time
            mlflow.log_metric("training_time_seconds", training_time)
            
            # Save scaler as artifact if provided
            if scaler is not None:
                import joblib
                import tempfile
                import os
                with tempfile.TemporaryDirectory() as tmp_dir:
                    scaler_path = os.path.join(tmp_dir, "scaler.pkl")
                    joblib.dump(scaler, scaler_path)
                    mlflow.log_artifact(scaler_path, artifact_path="preprocessing")
            
            # Log model artifact (required for model registration)
            mlflow.sklearn.log_model(
                model,
                artifact_path="model"
            )
            
            run_id = run.info.run_id
        
        metrics = {
            'train': train_metrics,
            'test': test_metrics
        }
        
        return model, metrics, training_time, run_id
    
    def train_ridge(
        self,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        alpha: float = 1.0,
        horizon: int = 60,
        run_name: Optional[str] = None,
        scaler: Optional[StandardScaler] = None
    ) -> Tuple[Any, Dict[str, ModelMetrics], float, str]:
        """Train Ridge regression model"""
        start_time = time.time()
        
        with mlflow.start_run(run_name=run_name or f"ridge_{horizon}min") as run:
            # Log parameters
            mlflow.log_param("model_type", "ridge")
            mlflow.log_param("horizon_minutes", horizon)
            mlflow.log_param("alpha", alpha)
            mlflow.log_param("n_features", X_train.shape[1])
            mlflow.log_param("train_samples", len(X_train))
            mlflow.log_param("test_samples", len(X_test))
            
            # Train model
            model = Ridge(alpha=alpha, random_state=42)
            model.fit(X_train, y_train)
            
            # Predictions
            y_train_pred = model.predict(X_train)
            y_test_pred = model.predict(X_test)
            
            # Calculate metrics
            train_metrics = ModelMetrics(
                rmse=float(np.sqrt(mean_squared_error(y_train, y_train_pred))),
                mae=float(mean_absolute_error(y_train, y_train_pred)),
                r2=float(r2_score(y_train, y_train_pred))
            )
            
            test_metrics = ModelMetrics(
                rmse=float(np.sqrt(mean_squared_error(y_test, y_test_pred))),
                mae=float(mean_absolute_error(y_test, y_test_pred)),
                r2=float(r2_score(y_test, y_test_pred))
            )
            
            # Log metrics
            mlflow.log_metric("train_rmse", train_metrics.rmse)
            mlflow.log_metric("train_mae", train_metrics.mae)
            mlflow.log_metric("train_r2", train_metrics.r2)
            mlflow.log_metric("test_rmse", test_metrics.rmse)
            mlflow.log_metric("test_mae", test_metrics.mae)
            mlflow.log_metric("test_r2", test_metrics.r2)
            
            training_time = time.time() - start_time
            mlflow.log_metric("training_time_seconds", training_time)
            
            # Save scaler as artifact if provided
            if scaler is not None:
                import joblib
                import tempfile
                import os
                with tempfile.TemporaryDirectory() as tmp_dir:
                    scaler_path = os.path.join(tmp_dir, "scaler.pkl")
                    joblib.dump(scaler, scaler_path)
                    mlflow.log_artifact(scaler_path, artifact_path="preprocessing")
            
            # Log model artifact (required for model registration)
            mlflow.sklearn.log_model(
                model,
                artifact_path="model"
            )
            
            run_id = run.info.run_id
        
        metrics = {
            'train': train_metrics,
            'test': test_metrics
        }
        
        return model, metrics, training_time, run_id
    
    def train_models(
        self,
        station_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        prediction_horizons: List[int] = [15, 30, 45, 60],
        model_types: List[str] = ["linear", "ridge"],
        test_size: float = 0.2,
        use_time_split: bool = True,
        ridge_alpha: float = 1.0,
        experiment_name: Optional[str] = None,
        register_model: bool = True,
        model_stage: str = "None"
    ) -> Dict[str, Any]:
        """
        Train multiple models for multiple horizons
        
        Args:
            station_id: Station ID (if None, trains unified model on all stations)
        
        Returns:
            Dictionary with training results
        """
        print("="*70)
        print("🚀 STARTING MODEL TRAINING")
        if station_id is None:
            print("📍 Mode: UNIFIED MODEL (all stations)")
        else:
            print(f"📍 Mode: SINGLE STATION (ID: {station_id})")
        print("="*70)
        
        overall_start = time.time()
        
        # Get station info
        if station_id is not None:
            station_info = self.preprocessing_service.supabase.table('stations')\
                .select('*').eq('id', station_id).execute()
            station_name = station_info.data[0]['name'] if station_info.data else f"Station {station_id}"
        else:
            station_name = "All Stations (Unified Model)"
        
        # Setup experiment
        if experiment_name is None:
            if station_id is not None:
                experiment_name = f"swfm-station-{station_id}"
            else:
                experiment_name = "swfm-unified-model"
        
        experiment = mlflow.get_experiment_by_name(experiment_name)
        if experiment is None:
            experiment_id = mlflow.create_experiment(experiment_name)
        else:
            experiment_id = experiment.experiment_id
        
        mlflow.set_experiment(experiment_name)
        
        # Prepare data
        X_train, X_test, y_train_dict, y_test_dict, feature_names, scaler, prep_stats = \
            self.prepare_training_data(
                station_id=station_id,
                start_date=start_date,
                end_date=end_date,
                prediction_horizons=prediction_horizons,
                test_size=test_size,
                use_time_split=use_time_split
            )
        
        # Train models
        all_results = []
        best_models = {}
        
        for horizon in prediction_horizons:
            print(f"\n{'='*70}")
            print(f"🎯 Training for {horizon}-minute horizon")
            print(f"{'='*70}")
            
            y_train = y_train_dict[horizon]
            y_test = y_test_dict[horizon]
            
            # Remove NaN
            train_mask = y_train.notna()
            test_mask = y_test.notna()
            
            X_train_clean = X_train[train_mask]
            y_train_clean = y_train[train_mask]
            X_test_clean = X_test[test_mask]
            y_test_clean = y_test[test_mask]
            
            horizon_models = []
            trained_results = []
            
            # Train Linear Regression
            if "linear" in model_types:
                print(f"\n   🔄 Training Linear Regression...")
                station_tag = f"station{station_id}" if station_id is not None else "unified"
                model, metrics, train_time, run_id = self.train_linear(
                    X_train_clean, X_test_clean,
                    y_train_clean, y_test_clean,
                    horizon=horizon,
                    run_name=f"linear_{station_tag}_{horizon}min",
                    scaler=scaler
                )
                
                result = HorizonModelResult(
                    model_type="linear",
                    horizon_minutes=horizon,
                    train_metrics=metrics['train'],
                    test_metrics=metrics['test'],
                    training_time_seconds=train_time,
                    mlflow_run_id=run_id
                )
                
                trained_results.append(result)
                horizon_models.append(("linear", metrics['test'].rmse, run_id, metrics['test'], result))
                
                print(f"      ✓ RMSE: {metrics['test'].rmse:.4f}, R²: {metrics['test'].r2:.4f} ({train_time:.2f}s)")
            
            # Train Ridge
            if "ridge" in model_types:
                print(f"\n   🔄 Training Ridge Regression...")
                station_tag = f"station{station_id}" if station_id is not None else "unified"
                model, metrics, train_time, run_id = self.train_ridge(
                    X_train_clean, X_test_clean,
                    y_train_clean, y_test_clean,
                    alpha=ridge_alpha,
                    horizon=horizon,
                    run_name=f"ridge_{station_tag}_{horizon}min",
                    scaler=scaler
                )
                
                result = HorizonModelResult(
                    model_type="ridge",
                    horizon_minutes=horizon,
                    train_metrics=metrics['train'],
                    test_metrics=metrics['test'],
                    training_time_seconds=train_time,
                    mlflow_run_id=run_id
                )
                
                trained_results.append(result)
                horizon_models.append(("ridge", metrics['test'].rmse, run_id, metrics['test'], result))
                
                print(f"      ✓ RMSE: {metrics['test'].rmse:.4f}, R²: {metrics['test'].r2:.4f} ({train_time:.2f}s)")
            
            # Find best model for this horizon and only save that one
            if horizon_models:
                best_model_type, best_rmse, best_run_id, best_metrics, best_result = min(horizon_models, key=lambda x: x[1])
                best_models[horizon] = {
                    "model_type": best_model_type,
                    "rmse": best_rmse,
                    "run_id": best_run_id
                }
                
                # Save the best model's performance to database and auto-register to MLflow
                self.save_performance_to_db_and_register(
                    station_id=station_id, 
                    model_type=best_model_type, 
                    test_metrics=best_metrics, 
                    run_id=best_run_id, 
                    horizon_minutes=horizon,
                    register_to_mlflow=register_model  # Use the register_model parameter from train_models()
                )
                
                # Only add best result to all_results
                all_results.append(best_result)
                
                print(f"\n   🏆 Best model: {best_model_type} (RMSE: {best_rmse:.4f}) - Saved to database")
        
        total_time = time.time() - overall_start
        
        print(f"\n{'='*70}")
        print(f"✅ TRAINING COMPLETE")
        print(f"{'='*70}")
        print(f"   Total time: {total_time:.2f}s")
        print(f"   Models trained: {len(all_results)}")
        
        return {
            'success': True,
            'message': f'Successfully trained {len(all_results)} models',
            'station_id': station_id,
            'station_name': station_name,
            'total_samples': prep_stats['total_samples'],
            'train_samples': prep_stats['train_samples'],
            'test_samples': prep_stats['test_samples'],
            'features_count': prep_stats['features_count'],
            'feature_names': feature_names,
            'results': all_results,
            'experiment_id': experiment_id,
            'experiment_name': experiment_name,
            'best_models': best_models,
            'total_training_time_seconds': total_time,
            'preprocessing_time_seconds': prep_stats['preprocessing_time']
        }
