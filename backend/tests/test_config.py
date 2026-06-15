import os
from backend.app.config import settings, Settings

def test_settings_default(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    default_settings = Settings(_env_file=None)
    assert default_settings.DATABASE_URL == "sqlite:///./security_assistant.db"
    assert default_settings.OPENAI_API_KEY == "mock-key"

def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-api-key")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    custom_settings = Settings(_env_file=None)
    assert custom_settings.OPENAI_API_KEY == "test-api-key"
    assert custom_settings.DATABASE_URL == "sqlite:///./test.db"
