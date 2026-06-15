import os
from app.config import settings, Settings

def test_settings_default():
    assert settings.DATABASE_URL == "sqlite:///./security_assistant.db"
    if "OPENAI_API_KEY" not in os.environ:
        assert settings.OPENAI_API_KEY == "mock-key"

def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-api-key")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    custom_settings = Settings()
    assert custom_settings.OPENAI_API_KEY == "test-api-key"
    assert custom_settings.DATABASE_URL == "sqlite:///./test.db"
