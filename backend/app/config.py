"""Pydantic settings & env loading."""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_URL_SYNC: str
    APP_SECRET_KEY: str = "change-me"
    APP_ID: str = "nexus-realty-local"
    CORS_ORIGINS: str = "*"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
