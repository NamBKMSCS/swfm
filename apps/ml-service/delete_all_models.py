"""
Script to delete all models from MLflow
"""
import mlflow
from mlflow.tracking import MlflowClient
import os
import sys

# Set MLflow tracking URI
mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
mlflow.set_tracking_uri(mlflow_uri)

def delete_all_models():
    """Delete all registered models from MLflow"""
    client = MlflowClient()
    
    try:
        # Get all registered models
        registered_models = client.search_registered_models()
        
        if not registered_models:
            print("No registered models found in MLflow.")
            return
        
        print(f"Found {len(registered_models)} registered model(s) in MLflow.")
        print("\nDeleting models:")
        
        for rm in registered_models:
            model_name = rm.name
            print(f"  - Deleting model: {model_name}")
            
            try:
                # Delete all versions of the model
                versions = client.search_model_versions(f"name='{model_name}'")
                for version in versions:
                    print(f"    - Deleting version {version.version}")
                    client.delete_model_version(
                        name=model_name,
                        version=version.version
                    )
                
                # Delete the registered model
                client.delete_registered_model(model_name)
                print(f"    ✓ Model {model_name} deleted successfully")
                
            except Exception as e:
                print(f"    ✗ Error deleting model {model_name}: {str(e)}")
        
        print("\n✓ All models deleted successfully!")
        
    except Exception as e:
        print(f"Error accessing MLflow: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 60)
    print("MLflow Model Deletion Script")
    print("=" * 60)
    print(f"MLflow Tracking URI: {mlflow_uri}\n")
    
    # Confirm deletion
    response = input("Are you sure you want to delete ALL models from MLflow? (yes/no): ")
    if response.lower() != "yes":
        print("Deletion cancelled.")
        sys.exit(0)
    
    delete_all_models()
