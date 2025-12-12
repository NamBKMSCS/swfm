"""
ML Service Configuration
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    # Application
    app_name: str = "SWFM ML Service"
    debug: bool = False
    
    # MLflow Settings
    mlflow_tracking_uri: str = "sqlite:///mlflow.db"
    mlflow_artifact_root: str = "./mlartifacts"
    
    # Model Settings
    models_dir: str = "./models"
    allowed_model_formats: list[str] = ["pkl", "pickle"]
    max_model_size_mb: int = 500
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Weather API - Using Open-Meteo (free, no API key required)
    # No configuration needed for Open-Meteo
    
    # Supabase Settings - supports both formats
    supabase_url: str = ""
    supabase_key: str = ""
    next_public_supabase_url: str = ""
    next_public_supabase_publishable_or_anon_key: str = ""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Use NEXT_PUBLIC vars if supabase vars are not set
        if not self.supabase_url and self.next_public_supabase_url:
            self.supabase_url = self.next_public_supabase_url
        if not self.supabase_key and self.next_public_supabase_publishable_or_anon_key:
            self.supabase_key = self.next_public_supabase_publishable_or_anon_key

    model_config = SettingsConfigDict(
        env_file=[
            "../.env",  # Root .env
            ".env",     # Local .env (overrides root)
        ],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
