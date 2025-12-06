"""
ML Service Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API Settings
    app_name: str = "SWFM ML Service"
    debug: bool = False
    api_prefix: str = "/api/v1"
    
    # MLflow Settings
    mlflow_tracking_uri: str = "sqlite:///mlflow.db"
    mlflow_artifact_root: str = "./mlartifacts"
    
    # Model Settings
    models_dir: str = "./models"
    allowed_model_formats: list[str] = ["pkl", "pickle"]
    max_model_size_mb: int = 500
    
    # Supabase (optional)
    supabase_url: str = ""
    supabase_key: str = ""
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
