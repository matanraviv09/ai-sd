from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # LLM
    OPENAI_API_KEY: str = "mock-key"
    OPENAI_MODEL: str = "gpt-4o"

    # Database
    DATABASE_URL: str = "sqlite:///./security_assistant.db"

    # Deployment environment: "development" | "staging" | "production"
    ENVIRONMENT: str = "development"

    # Comma-separated list of allowed CORS origins.
    # Accepts a CSV string from env vars or a list from code / tests.
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    model_config = SettingsConfigDict(env_file=".env")

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: object) -> List[str]:
        """Allow ALLOWED_ORIGINS to be supplied as a comma-separated string."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return list(value)  # already a list

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def docs_url(self) -> Optional[str]:
        """Disable interactive docs in production."""
        return None if self.is_production else "/docs"

    @property
    def redoc_url(self) -> Optional[str]:
        """Disable ReDoc in production."""
        return None if self.is_production else "/redoc"

    def validate_production(self) -> None:
        """
        Call on startup. Raises ValueError if mandatory production settings
        are missing or still at their insecure default values.
        """
        if self.is_production and self.OPENAI_API_KEY == "mock-key":
            raise ValueError(
                "OPENAI_API_KEY must be set to a real value in production. "
                "Set the OPENAI_API_KEY environment variable before starting the server."
            )


settings = Settings()
