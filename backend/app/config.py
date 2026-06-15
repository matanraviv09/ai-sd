from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    OPENAI_API_KEY: str = "mock-key"
    DATABASE_URL: str = "sqlite:///./security_assistant.db"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
