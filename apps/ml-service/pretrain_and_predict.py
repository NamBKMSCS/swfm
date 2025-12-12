#!/usr/bin/env python3
"""
Pretrain models and generate 15-minute predictions for all stations
This script:
1. Trains unified models for 15-minute forecasts
2. Generates predictions for all active stations
3. Saves forecasts to the database
"""

import requests
import json
import time
from datetime import datetime

# Configuration
ML_SERVICE_URL = "http://localhost:8000"
TRAIN_HORIZONS = [15, 30, 45, 60]  # Training horizons in minutes
PREDICT_HORIZONS = [15, 30, 45, 60]  # Prediction horizons
STATIONS_TO_PREDICT = [2, 3, 4, 5, 6, 8, 9]  # Active stations (excluding 1 and 7)
# Dates will be auto-determined from training_data_range config in database

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def train_unified_models():
    """Train unified models for all horizons"""
    print_header("STEP 1: Training Unified Models")
    
    url = f"{ML_SERVICE_URL}/training/train"
    payload = {
        "train_all_stations": True,
        # start_date and end_date will be auto-determined from training_data_range config
        "horizons_minutes": TRAIN_HORIZONS,
        "model_types": ["ridge", "linear"]
    }
    
    print(f"\n🔧 Training Configuration:")
    print(f"   Horizons: {TRAIN_HORIZONS} minutes")
    print(f"   Model types: ridge, linear")
    print(f"   Date range: Auto-determined from training_data_range config")
    print(f"   Training mode: All stations (unified)")
    
    print(f"\n📡 Sending training request to {url}...")
    
    try:
        response = requests.post(url, json=payload, timeout=600)  # 10 min timeout
        response.raise_for_status()
        result = response.json()
        
        print(f"\n✅ Training completed successfully!")
        print(f"   Status: {result.get('status', 'N/A')}")
        print(f"   Message: {result.get('message', 'N/A')}")
        
        if 'models_trained' in result:
            print(f"\n📊 Models trained:")
            for model in result['models_trained']:
                print(f"   - {model['model_name']} (v{model.get('version', 'N/A')})")
                if 'metrics' in model:
                    metrics = model['metrics']
                    print(f"     MAE: {metrics.get('mae', 'N/A'):.4f}, "
                          f"RMSE: {metrics.get('rmse', 'N/A'):.4f}, "
                          f"R²: {metrics.get('r2', 'N/A'):.4f}")
        
        return True
        
    except requests.exceptions.Timeout:
        print(f"\n⚠️  Training request timed out (may still be running in background)")
        print(f"   Check logs for training progress")
        return False
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Training failed: {e}")
        if hasattr(e.response, 'text'):
            print(f"   Error details: {e.response.text}")
        return False

def generate_predictions():
    """Generate predictions for all active stations"""
    print_header("STEP 2: Generating 15-Minute Predictions")
    
    url = f"{ML_SERVICE_URL}/predict/generate-forecasts"
    
    results = []
    for station_id in STATIONS_TO_PREDICT:
        print(f"\n🔮 Generating forecast for station {station_id}...")
        
        payload = {
            "station_id": station_id,
            "horizons_minutes": PREDICT_HORIZONS,
            "save_to_db": True
        }
        
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            result = response.json()
            
            if result.get('success'):
                print(f"   ✅ {result['message']} - {result['forecasts_generated']} forecasts saved")
                results.append({
                    'station_id': station_id,
                    'success': True,
                    'forecasts': result['forecasts_generated']
                })
            else:
                print(f"   ❌ Failed: {result.get('message', 'Unknown error')}")
                results.append({
                    'station_id': station_id,
                    'success': False,
                    'error': result.get('message')
                })
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Request failed: {e}")
            results.append({
                'station_id': station_id,
                'success': False,
                'error': str(e)
            })
    
    return results

def print_summary(results):
    """Print summary of prediction results"""
    print_header("SUMMARY")
    
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    print(f"\n📊 Prediction Results:")
    print(f"   Total stations: {len(results)}")
    print(f"   ✅ Successful: {len(successful)}")
    print(f"   ❌ Failed: {len(failed)}")
    
    if successful:
        total_forecasts = sum(r['forecasts'] for r in successful)
        print(f"\n✅ Successfully generated {total_forecasts} forecasts for {len(successful)} stations:")
        for r in successful:
            print(f"   - Station {r['station_id']}: {r['forecasts']} forecasts")
    
    if failed:
        print(f"\n❌ Failed stations:")
        for r in failed:
            print(f"   - Station {r['station_id']}: {r.get('error', 'Unknown error')}")

def main():
    """Main execution"""
    start_time = time.time()
    
    print("\n" + "🚀 " * 20)
    print(f"  PRETRAIN AND PREDICT - 15 MINUTE FORECASTS")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🚀 " * 20)
    
    # Step 1: Train models
    training_success = train_unified_models()
    
    if not training_success:
        print("\n⚠️  Training may not have completed successfully")
        print("   Continuing with predictions anyway (using existing models if available)...")
    
    # Wait a bit for models to be fully registered
    print("\n⏳ Waiting 5 seconds for models to be registered...")
    time.sleep(5)
    
    # Step 2: Generate predictions
    results = generate_predictions()
    
    # Print summary
    print_summary(results)
    
    # Print execution time
    elapsed_time = time.time() - start_time
    print(f"\n⏱️  Total execution time: {elapsed_time:.2f} seconds")
    print(f"   Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n" + "✨ " * 20 + "\n")

if __name__ == "__main__":
    main()
