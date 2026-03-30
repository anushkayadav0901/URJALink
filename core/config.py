import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")
    
    # API Keys
    GOOGLE_MAPS_API_KEY: str
    DEDALUS_API_KEY: str
    GEMINI_API_KEY: str = ""
    
    # Optional (Phase 2)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    DO_GRADIENT_API_KEY: str = ""
    DO_GRADIENT_ENDPOINT: str = ""
    
    # Infrastructure
    DATABASE_URL: str = ""  # Optional
    REDIS_URL: str = ""
    
    # External economic data services
    EIA_API_KEY: str = ""
    
    # App Config
    DEBUG: bool = True
    
    # Dedalus Agent Settings
    DEDALUS_MODEL: str = "openai/gpt-4o-mini"
    DEDALUS_TIMEOUT: int = 60
    INSTALLER_SEARCH_RADIUS_MILES: int = 50
    MAX_INSTALLERS_RETURNED: int = 5
    AGENT_ENABLE_STREAMING: bool = True


settings = Settings()
