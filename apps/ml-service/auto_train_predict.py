#!/usr/bin/env python3
"""
Automated Training and Prediction System
- Trains models using the most recent 1 month of data
- Generates predictions for all active stations
- Runs automatically every 60 minutes
- Uses dynamic date range (always latest data)
"""

import requests
import json
import time
import schedule
from datetime import datetime, timedelta

# Configuration
ML_SERVICE_URL = "http://localhost:8000"
TRAIN_HORIZONS = [15, 30, 45, 60]  # Training horizons in minutes
PREDICT_HORIZONS = [15, 30, 45, 60]  # Prediction horizons
STATIONS_TO_PREDICT = [2, 3, 4, 5, 6, 8, 9]  # Active stations (excluding 1 and 7)
TRAINING_PERIOD_DAYS = 30  # Use last 30 days of data
RUN_INTERVAL_MINUTES = 60  # Run every 60 minutes

def get_date_range():
    """Get dynamic date range (most recent 1 month)"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=TRAINING_PERIOD_DAYS)
    
    return {
        'start_date': start_date.strftime('%Y-%m-%d'),
        'end_date': end_date.strftime('%Y-%m-%d'),
        'start_datetime': start_date,
        'end_datetime': end_date
    }

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def train_unified_models():
    """Train unified models using recent data"""
    print_header("TRAINING: Unified Models with Latest Data")
    
    # Get dynamic date range
    date_range = get_date_range()
    
    url = f"{ML_SERVICE_URL}/training/train"
    payload = {
        "train_all_stations": True,
        "start_date": date_range['start_date'],
        "end_date": date_range['end_date'],
        "horizons_minutes": TRAIN_HORIZONS,
        "model_types": ["ridge", "linear"]
    }
    
    print(f"\n🔧 Training Configuration:")
    print(f"   Horizons: {TRAIN_HORIZONS} minutes")
    print(f"   Model types: ridge, linear")
    print(f"   Date range: {date_range['start_date']} to {date_range['end_date']}")
    print(f"   Training period: {TRAINING_PERIOD_DAYS} days (most recent)")
    print(f"   Training mode: All stations (unified)")
    
    print(f"\n📡 Sending training request...")
    
    try:
        response = requests.post(url, json=payload, timeout=600)
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
        print(f"\n⚠️  Training request timed out (may still be running)")
        return False
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Training failed: {e}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"   Error details: {e.response.text}")
        return False

def generate_predictions():
    """Generate predictions for all active stations"""
    print_header("PREDICTION: Generating Forecasts for All Stations")
    
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

def print_summary(results, elapsed_time):
    """Print summary of execution"""
    print_header("EXECUTION SUMMARY")
    
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    print(f"\n📊 Prediction Results:")
    print(f"   Total stations: {len(results)}")
    print(f"   ✅ Successful: {len(successful)}")
    print(f"   ❌ Failed: {len(failed)}")
    
    if successful:
        total_forecasts = sum(r['forecasts'] for r in successful)
        print(f"\n✅ Successfully generated {total_forecasts} forecasts for {len(successful)} stations")
    
    if failed:
        print(f"\n❌ Failed stations:")
        for r in failed:
            print(f"   - Station {r['station_id']}: {r.get('error', 'Unknown error')}")
    
    print(f"\n⏱️  Total execution time: {elapsed_time:.2f} seconds")

def run_training_and_prediction():
    """Execute one cycle of training and prediction"""
    start_time = time.time()
    
    print("\n" + "🚀 " * 20)
    print(f"  AUTO TRAIN & PREDICT - CYCLE START")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🚀 " * 20)
    
    # Step 1: Train models with latest data
    training_success = train_unified_models()
    
    if not training_success:
        print("\n⚠️  Training may not have completed successfully")
        print("   Continuing with predictions using existing models...")
    
    # Wait for models to be registered
    print("\n⏳ Waiting 5 seconds for models to be registered...")
    time.sleep(5)
    
    # Step 2: Generate predictions
    results = generate_predictions()
    
    # Print summary
    elapsed_time = time.time() - start_time
    print_summary(results, elapsed_time)
    
    print(f"\n⏰ Next cycle will run in {RUN_INTERVAL_MINUTES} minutes")
    print("✨ " * 20 + "\n")

def main():
    """Main execution with scheduling"""
    print("\n" + "⚡ " * 20)
    print(f"  AUTOMATED TRAINING & PREDICTION SYSTEM")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Training period: {TRAINING_PERIOD_DAYS} days (rolling window)")
    print(f"  Run interval: Every {RUN_INTERVAL_MINUTES} minutes")
    print("⚡ " * 20)
    
    # Run immediately on startup
    print("\n🎬 Running initial cycle...")
    run_training_and_prediction()
    
    # Schedule to run every 60 minutes
    schedule.every(RUN_INTERVAL_MINUTES).minutes.do(run_training_and_prediction)
    
    print(f"\n🔄 Scheduler active - will run every {RUN_INTERVAL_MINUTES} minutes")
    print("   Press Ctrl+C to stop")
    
    # Keep running
    try:
        while True:
            schedule.run_pending()
            time.sleep(30)  # Check every 30 seconds
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping automated system...")
        print(f"   Stopped at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("\n👋 Goodbye!\n")

if __name__ == "__main__":
    main()
