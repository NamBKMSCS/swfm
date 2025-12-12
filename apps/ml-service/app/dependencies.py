"""
Dependency Injection - Supabase Client
"""
from supabase import create_client, Client
from fastapi import HTTPException
from app.config import get_settings


_supabase_client: Client = None


def get_supabase() -> Client:
    """
    Get Supabase client (lazy initialization)
    
    Returns:
        Supabase Client instance
        
    Raises:
        HTTPException: If Supabase is not configured
    """
    global _supabase_client
    
    settings = get_settings()
    
    # Check if credentials are configured
    if not settings.supabase_url or not settings.supabase_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in .env file."
        )
    
    # Check for placeholder values
    if settings.supabase_url == "your_supabase_url_here" or settings.supabase_key == "your_supabase_key_here":
        raise HTTPException(
            status_code=503,
            detail="Supabase credentials not set. Please update SUPABASE_URL and SUPABASE_KEY in .env file."
        )
    
    # Create client on first use
    if _supabase_client is None:
        try:
            _supabase_client = create_client(settings.supabase_url, settings.supabase_key)
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to connect to Supabase: {str(e)}"
            )
    
    return _supabase_client
