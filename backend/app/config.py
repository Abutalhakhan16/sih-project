import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "Co-opServe API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    # Database
    # Default to SQLite for immediate local execution; overrides with PostgreSQL if set
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./coopserve.db",
        description="Async SQLAlchemy database URL"
    )
    DATABASE_URL_SYNC: str = Field(
        default="sqlite:///./coopserve.db",
        description="Sync database URL for migrations"
    )

    # JWT Authentication
    JWT_SECRET_KEY: str = "coopserve-secure-jwt-secret-key-2026-sih"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # Demo credentials
    DEMO_CUSTOMER_PASSWORD: str = "demo123"
    DEMO_WORKER_PASSWORD: str = "demo123"
    DEMO_ADMIN_PASSWORD: str = "admin123"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
