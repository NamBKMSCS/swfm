"""
Prediction Router - Load models and make predictions
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import mlflow
from mlflow.tracking import MlflowClient
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client

from app.config import get_settings
from app.services.preprocessing_service import PreprocessingService

router = APIRouter()
settings = get_settings()

# Initialize Supabase client
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)


class GenerateForecastRequest(BaseModel):
    """Request to generate forecasts for a station"""

    station_id: Optional[int] = None  # None = unified model (all stations)
    horizons_minutes: List[int] = [15, 30, 45, 60]  # Prediction horizons
    save_to_db: bool = True  # Save forecasts to database


class GenerateForecastResponse(BaseModel):
    """Response from forecast generation"""

    success: bool
    message: str
    station_id: Optional[int]
    forecasts_generated: int
    forecasts: List[dict]


class PredictionRequest(BaseModel):
    station_id: int
    horizon_hours: int = 24  # 6-24 hours short-term, 72-168 hours medium-term
    input_data: Optional[list[float]] = None  # Historical water levels

    class Config:
        json_schema_extra = {
            "example": {
                "station_id": 1,
                "horizon_hours": 24,
                "input_data": [5.2, 5.3, 5.1, 5.4, 5.5, 5.3, 5.2],
            }
        }


class ForecastPoint(BaseModel):
    timestamp: str
    value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class PredictionResponse(BaseModel):
    success: bool
    model_name: str
    model_version: str
    station_id: int
    generated_at: str
    horizon_hours: int
    forecasts: list[ForecastPoint]


@router.post("/generate-forecasts", response_model=GenerateForecastResponse)
async def generate_forecasts_endpoint(request: GenerateForecastRequest):
    """
    Generate forecasts using trained models and save to database

    This endpoint:
    1. Fetches the latest data for the station(s)
    2. Preprocesses the data (creates features)
    3. Loads the best model for each horizon
    4. Generates predictions
    5. Saves forecasts to the 'forecasts' table in Supabase

    Example:
    ```json
    {
        "station_id": 1,
        "horizons_minutes": [15, 30, 45, 60],
        "save_to_db": true
    }
    ```
    """
    try:
        preprocessing_service = PreprocessingService()
        client = MlflowClient()

        # Get station info if specific station requested
        if request.station_id is not None:
            # Check if station is excluded
            if request.station_id in [1, 7]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Station {request.station_id} is excluded from predictions due to data quality issues",
                )

            station_info = (
                supabase.table("stations")
                .select("*")
                .eq("id", request.station_id)
                .execute()
            )
            if not station_info.data:
                raise HTTPException(
                    status_code=404, detail=f"Station {request.station_id} not found"
                )
            station_name = station_info.data[0]["name"]
        else:
            station_name = "All Stations (excluding stations 1 & 7)"

        print(f"\n{'=' * 70}")
        print(f"🔮 GENERATING FORECASTS")
        print(f"📍 Station: {station_name}")
        print(f"⏱️  Horizons: {request.horizons_minutes} minutes")
        print(f"🎯 Using unified models (station_id as feature)")
        print(f"{'=' * 70}\n")

        # For unified model, always fetch data for the specific station (or all if None)
        # but prepare features including station_id
        print("📊 Fetching and preprocessing latest data...")
        X_latest, feature_names, scaler_info = (
            preprocessing_service.prepare_latest_data_for_prediction(
                station_id=request.station_id
            )
        )

        if X_latest is None or len(X_latest) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No recent data available for {'station ' + str(request.station_id) if request.station_id else 'prediction'}. Please ensure there is data from the last 24 hours.",
            )

        print(
            f"   ✓ Features prepared: {len(feature_names)} features, {len(X_latest)} samples"
        )

        all_forecasts = []
        forecast_date = datetime.utcnow()

        # RECURSIVE PREDICTION: Use each prediction as input for the next horizon
        # This implements the ideal approach: predict 15min → use it to predict 30min → use that for 45min, etc.
        print(
            f"\n🔮 Starting RECURSIVE prediction for horizons: {request.horizons_minutes}"
        )
        print(f"   💡 Each prediction will be used as input for the next horizon")

        # Keep track of the current state (updated after each prediction)
        X_current = X_latest.copy()
        previous_prediction = None

        # Generate forecasts for each horizon using UNIFIED models
        for horizon_idx, horizon in enumerate(request.horizons_minutes):
            print(
                f"\n🎯 Generating forecast for {horizon}-minute horizon (step {horizon_idx + 1}/{len(request.horizons_minutes)})..."
            )

            # RECURSIVE UPDATE: If we have a previous prediction, update features
            if previous_prediction is not None:
                print(
                    f"   🔄 Updating features with previous prediction: {previous_prediction:.2f}cm"
                )

                # Update water_level with the predicted value (this becomes the "current" water level for next prediction)
                if "water_level" in X_current.columns:
                    old_value = X_current["water_level"].values[0]
                    X_current["water_level"] = previous_prediction
                    print(
                        f"      • water_level: {old_value:.2f} → {previous_prediction:.2f}cm"
                    )

                # Shift lag features (simplified approach - in production you'd need proper time-series lag handling)
                # water_level_lag_1h should become the previous water_level
                if "water_level_lag_1h" in X_current.columns:
                    X_current["water_level_lag_1h"] = previous_prediction
                    print(
                        f"      • water_level_lag_1h updated to {previous_prediction:.2f}cm"
                    )

            # Use unified models (trained on all stations with station_id as feature)
            # Try ridge first, then linear
            model_name = None
            for model_type in ["ridge", "linear"]:
                candidate_name = f"swfm-{model_type}-unified-{horizon}min"
                try:
                    versions = client.search_registered_models(
                        f"name='{candidate_name}'"
                    )
                    if versions:
                        model_name = candidate_name
                        break
                except:
                    continue

            if not model_name:
                print(f"   ⚠️  No unified model found for {horizon}-min horizon")
                print(f"   💡 Please train models first at /models page")
                continue

            # Load the model and scaler
            try:
                model_versions = client.search_model_versions(f"name='{model_name}'")
                if not model_versions:
                    print(f"   ⚠️  Model {model_name} has no versions, skipping...")
                    continue

                # Get latest version
                latest_version = max(model_versions, key=lambda x: int(x.version))
                model_uri = f"models:/{model_name}/{latest_version.version}"
                model = mlflow.sklearn.load_model(model_uri)

                print(f"   ✓ Loaded model: {model_name} v{latest_version.version}")

                # Load scaler from run artifacts
                run_id = latest_version.run_id
                scaler = None
                try:
                    import joblib
                    import tempfile
                    import os

                    scaler_path = client.download_artifacts(
                        run_id, "preprocessing/scaler.pkl"
                    )
                    scaler = joblib.load(scaler_path)
                    print(f"   ✓ Loaded scaler from run {run_id[:8]}")
                except Exception as e:
                    print(f"   ⚠️  No scaler found for this model (older model?): {e}")

                # Match features to what the model expects
                if hasattr(model, "feature_names_in_"):
                    expected_features = list(model.feature_names_in_)
                    # Filter X_current to only include features the model was trained with
                    missing_features = [
                        f for f in expected_features if f not in X_current.columns
                    ]
                    extra_features = [
                        f for f in X_current.columns if f not in expected_features
                    ]

                    if missing_features:
                        print(
                            f"   ⚠️  WARNING: Missing {len(missing_features)} features: {missing_features[:5]}"
                        )
                        print(
                            f"   🔧 Adding missing features with mean value from scaler"
                        )
                        # Add missing features with scaler's mean (not 0!)
                        # This is critical: filling with 0 before scaling causes extreme values
                        for i, feat in enumerate(missing_features):
                            if scaler is not None and hasattr(scaler, "mean_"):
                                # Find the index of this feature in the scaler
                                if feat in feature_names:
                                    feat_idx = feature_names.index(feat)
                                    if feat_idx < len(scaler.mean_):
                                        # Use the training mean for this feature
                                        X_current[feat] = scaler.mean_[feat_idx]
                                        print(
                                            f"      • {feat}: using training mean={scaler.mean_[feat_idx]:.2f}"
                                        )
                                    else:
                                        X_current[feat] = 0
                                else:
                                    X_current[feat] = 0
                            else:
                                X_current[feat] = 0

                    if extra_features:
                        print(
                            f"   ℹ️  Removing {len(extra_features)} extra features: {extra_features[:5]}"
                        )

                    # Reorder columns to match model's expected feature order
                    X_current = X_current[expected_features]

                # Apply scaler to features (CRITICAL: model was trained on scaled features)
                if scaler is not None:
                    # Store original values for debugging
                    X_original = X_current.copy()

                    X_scaled = scaler.transform(X_current)
                    X_scaled_df = pd.DataFrame(
                        X_scaled, columns=X_current.columns, index=X_current.index
                    )
                    print(f"   ✓ Applied StandardScaler to features")

                    # Check for extreme scaled values (which indicate data issues)
                    extreme_threshold = 10  # More than 10 std deviations is suspicious
                    extreme_features = []
                    for col in X_scaled_df.columns:
                        val = X_scaled_df[col].values[0]
                        if abs(val) > extreme_threshold:
                            orig_val = X_original[col].values[0]
                            extreme_features.append((col, orig_val, val))

                    if extreme_features:
                        print(
                            f"   ⚠️  WARNING: Found {len(extreme_features)} features with extreme scaled values:"
                        )
                        for col, orig, scaled in extreme_features[:5]:
                            print(
                                f"      • {col}: original={orig:.2f}, scaled={scaled:.2f} ({scaled:.1f} std)"
                            )
                        print(
                            f"   💡 This may indicate missing/incorrect data that was filled with defaults"
                        )
                else:
                    print(
                        f"   ⚠️  WARNING: No scaler available, using unscaled features (may cause poor predictions)"
                    )
                    X_scaled_df = X_current

                # Calculate target datetime
                target_date = forecast_date + timedelta(minutes=horizon)

                # Make predictions (unified model predicts for all rows in X_scaled_df)
                predictions = model.predict(X_scaled_df)

                # Single station forecast (unified model with station_id as feature)
                predicted_value = float(np.mean(predictions))

                # Store this prediction for the next iteration (RECURSIVE KEY STEP)
                previous_prediction = predicted_value

                forecast_record = {
                    "station_id": request.station_id,
                    "forecast_date": forecast_date.isoformat(),
                    "target_date": target_date.isoformat(),
                    "water_level": round(predicted_value, 3),
                }
                all_forecasts.append(forecast_record)

                print(
                    f"   ✓ Forecast generated: {predicted_value:.2f}cm ({predicted_value / 100:.2f}m) at {target_date.strftime('%Y-%m-%d %H:%M')}"
                )
                if horizon_idx < len(request.horizons_minutes) - 1:
                    print(
                        f"   📊 This prediction will be used as input for the next {request.horizons_minutes[horizon_idx + 1]}-min forecast"
                    )

            except Exception as e:
                print(f"   ⚠️  Error loading/using model: {str(e)}")
                continue

        # Check if any forecasts were generated
        if len(all_forecasts) == 0:
            raise HTTPException(
                status_code=400,
                detail="No forecasts generated. Please train unified models first at /models page.",
            )

        # Save to database
        if request.save_to_db and len(all_forecasts) > 0:
            print(f"\n💾 Saving {len(all_forecasts)} forecasts to database...")
            try:
                # Delete old forecasts for this station (keep last 7 days)
                cutoff_date = (datetime.utcnow() - timedelta(days=7)).isoformat()

                # Clear old forecasts for this specific station
                supabase.table("forecasts").delete().eq(
                    "station_id", request.station_id
                ).lt("forecast_date", cutoff_date).execute()

                # Insert new forecasts
                response = supabase.table("forecasts").insert(all_forecasts).execute()

                if response.data:
                    print(f"   ✓ Forecasts saved successfully")
                else:
                    print(f"   ⚠️  Warning: No data returned from insert")

            except Exception as e:
                print(f"   ⚠️  Error saving forecasts: {str(e)}")
                # Don't fail the request if save fails

        print(f"\n{'=' * 70}")
        print(f"✅ FORECAST GENERATION COMPLETE")
        print(f"{'=' * 70}\n")

        return GenerateForecastResponse(
            success=True,
            message=f"Generated {len(all_forecasts)} forecasts for {station_name}",
            station_id=request.station_id,
            forecasts_generated=len(all_forecasts),
            forecasts=all_forecasts,
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        error_trace = traceback.format_exc()
        print(f"\n❌ Forecast Generation Error:\n{error_trace}")
        raise HTTPException(
            status_code=500, detail=f"Forecast generation failed: {str(e)}"
        )


@router.post("/{model_name}", response_model=PredictionResponse)
async def predict(model_name: str, request: PredictionRequest):
    """
    Generate predictions using a registered model.

    - **model_name**: Name of the registered model
    - **request**: Prediction request with station_id and optional input data
    """
    client = MlflowClient()

    try:
        # Find the production version of the model
        versions = client.search_model_versions(f"name='{model_name}'")

        if not versions:
            raise HTTPException(
                status_code=404, detail=f"Model '{model_name}' not found"
            )

        # Prefer production stage, then latest version
        production_versions = [v for v in versions if v.current_stage == "Production"]
        if production_versions:
            model_version = production_versions[0]
        else:
            model_version = max(versions, key=lambda x: int(x.version))

        # Load the model
        model_uri = f"models:/{model_name}/{model_version.version}"

        try:
            model = mlflow.sklearn.load_model(model_uri)
        except Exception:
            try:
                model = mlflow.pyfunc.load_model(model_uri)
            except Exception as e:
                raise HTTPException(
                    status_code=500, detail=f"Failed to load model: {str(e)}"
                )

        # Prepare input data
        if request.input_data:
            input_array = np.array(request.input_data).reshape(-1, 1)
        else:
            # Generate mock input for demo purposes
            # In production, this should fetch from database
            input_array = np.random.uniform(4.0, 6.0, size=(7, 1))

        # Generate predictions
        forecasts = []
        current_time = datetime.utcnow()

        # Calculate number of forecast points (hourly)
        num_points = request.horizon_hours

        try:
            # Try to predict
            if hasattr(model, "forecast"):
                # ARIMA-style models
                predictions = model.forecast(steps=num_points)
            elif hasattr(model, "predict"):
                # Sklearn-style models
                # For time series, we might need to do iterative prediction
                predictions = []
                current_input = (
                    input_array[-1:] if len(input_array) > 0 else np.array([[5.0]])
                )

                for _ in range(num_points):
                    pred = model.predict(current_input)
                    predictions.append(
                        float(pred[0]) if hasattr(pred, "__iter__") else float(pred)
                    )
                    current_input = np.array([[predictions[-1]]])

                predictions = np.array(predictions)
            else:
                # Fallback: generate mock predictions
                base_value = float(input_array[-1]) if len(input_array) > 0 else 5.0
                predictions = base_value + np.cumsum(
                    np.random.normal(0, 0.1, num_points)
                )

        except Exception as e:
            # Fallback to mock predictions if model fails
            base_value = float(input_array[-1]) if len(input_array) > 0 else 5.0
            predictions = base_value + np.cumsum(np.random.normal(0, 0.1, num_points))

        # Build forecast response
        for i, pred in enumerate(predictions):
            forecast_time = current_time + timedelta(hours=i + 1)
            # Add confidence intervals (mock for now)
            std = 0.2 + 0.01 * i  # Uncertainty grows with horizon

            forecasts.append(
                ForecastPoint(
                    timestamp=forecast_time.isoformat(),
                    value=round(float(pred), 3),
                    lower_bound=round(float(pred) - 1.96 * std, 3),
                    upper_bound=round(float(pred) + 1.96 * std, 3),
                )
            )

        return PredictionResponse(
            success=True,
            model_name=model_name,
            model_version=model_version.version,
            station_id=request.station_id,
            generated_at=current_time.isoformat(),
            horizon_hours=request.horizon_hours,
            forecasts=forecasts,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/{model_name}/info")
async def get_model_info(model_name: str):
    """Get information about the model used for predictions"""
    client = MlflowClient()

    try:
        versions = client.search_model_versions(f"name='{model_name}'")

        if not versions:
            raise HTTPException(
                status_code=404, detail=f"Model '{model_name}' not found"
            )

        # Get production version info
        production_versions = [v for v in versions if v.current_stage == "Production"]
        active_version = (
            production_versions[0]
            if production_versions
            else max(versions, key=lambda x: int(x.version))
        )

        # Get run info for additional metadata
        run = client.get_run(active_version.run_id)

        return {
            "model_name": model_name,
            "active_version": active_version.version,
            "stage": active_version.current_stage,
            "created_at": str(active_version.creation_timestamp),
            "parameters": run.data.params,
            "metrics": run.data.metrics,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get model info: {str(e)}"
        )


@router.delete("/forecasts/cleanup")
async def cleanup_old_forecasts(hours_old: int = 2):
    """
    Clean up old forecasts from the database

    Args:
        hours_old: Delete forecasts older than this many hours (default: 2)

    Returns:
        Number of forecasts deleted
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(hours=hours_old)

        # Delete old forecasts
        result = (
            supabase.table("forecasts")
            .delete()
            .lt("forecast_date", cutoff_date.isoformat())
            .execute()
        )

        deleted_count = len(result.data) if result.data else 0

        return {
            "success": True,
            "message": f"Deleted {deleted_count} forecasts older than {hours_old} hours",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to cleanup forecasts: {str(e)}"
        )
