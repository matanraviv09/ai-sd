import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "mock-key")
    DATABASE_URL: str = "sqlite:///./security_assistant.db"

    class Config:
        env_file = ".env"

settings = Settings()
