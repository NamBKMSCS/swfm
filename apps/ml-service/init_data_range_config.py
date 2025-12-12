#!/usr/bin/env python3
"""
Initialize data_range configuration in the database
Run this script once to add the data_range configuration option
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.preprocessing_service import PreprocessingService

def main():
    service = PreprocessingService()
    
    # Check if data_range config already exists
    existing = service.supabase.table('preprocessing_configs')\
        .select('*')\
        .eq('method_id', 'data_range')\
        .execute()
    
    if existing.data:
        print("✓ data_range configuration already exists")
        print(f"  Current config: {existing.data[0]['config']}")
        return
    
    # Insert data_range configuration
    result = service.supabase.table('preprocessing_configs').insert({
        'method_id': 'data_range',
        'enabled': True,
        'config': {
            'description': 'Define the date range for training data',
            'start_date': '2025-11-01',
            'end_date': '2025-12-01'
        }
    }).execute()
    
    if result.data:
        print("✓ Successfully created data_range configuration")
        print(f"  Config: {result.data[0]['config']}")
    else:
        print("✗ Failed to create configuration")
        sys.exit(1)

if __name__ == '__main__':
    main()
