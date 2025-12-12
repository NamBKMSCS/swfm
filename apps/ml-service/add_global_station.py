#!/usr/bin/env python3
"""
Add global station (ID=0) to database for unified models
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.preprocessing_service import PreprocessingService

print("=" * 70)
print("🔧 ADDING GLOBAL STATION FOR UNIFIED MODELS")
print("=" * 70)

try:
    service = PreprocessingService()
    
    # Check if station 0 already exists
    check = service.supabase.table('stations').select('*').eq('id', 0).execute()
    
    if check.data:
        print("\n✅ Global station (ID=0) already exists!")
        print(f"   Name: {check.data[0]['name']}")
    else:
        print("\n📝 Inserting global station (ID=0)...")
        
        # Insert global station
        station_data = {
            'id': 0,
            'name': 'Global Model (All Stations)',
            'latitude': 0.0,
            'longitude': 0.0,
            'country': 'GLOBAL'
        }
        
        response = service.supabase.table('stations').insert(station_data).execute()
        
        if response.data:
            print("✅ Successfully added global station!")
            print(f"   ID: {response.data[0]['id']}")
            print(f"   Name: {response.data[0]['name']}")
        else:
            print("❌ Failed to insert global station")
            
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    
print("\n" + "=" * 70)
print("💡 Now you can train unified models and save to database!")
print("=" * 70)
