import os
import pytest
from backend.app.config import Settings


def test_settings_default_dev(monkeypatch):
    """In development, OPENAI_API_KEY can remain unset (mock-key default is accepted)."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    settings = Settings(_env_file=None)
    assert settings.DATABASE_URL == "sqlite:///./security_assistant.db"
    assert settings.OPENAI_API_KEY == "mock-key"
    assert settings.ENVIRONMENT == "development"
    assert settings.ALLOWED_ORIGINS == ["http://localhost:3000", "http://localhost:5173"]


def test_settings_env_override(monkeypatch):
    """Env vars override all defaults."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-real-key")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./prod.db")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.acme.com,https://admin.acme.com")
    settings = Settings(_env_file=None)
    assert settings.OPENAI_API_KEY == "sk-real-key"
    assert settings.DATABASE_URL == "sqlite:///./prod.db"
    assert settings.ENVIRONMENT == "production"
    assert settings.ALLOWED_ORIGINS == ["https://app.acme.com", "https://admin.acme.com"]


def test_production_requires_real_openai_key(monkeypatch):
    """In production mode, OPENAI_API_KEY must not be the default mock value."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("OPENAI_API_KEY", "mock-key")
    with pytest.raises(ValueError, match="OPENAI_API_KEY must be set"):
        Settings(_env_file=None).validate_production()


def test_production_passes_with_real_key(monkeypatch):
    """In production mode, a real key passes validation."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-real-production-key")
    settings = Settings(_env_file=None)
    settings.validate_production()  # Should not raise


def test_is_production_flag(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    settings = Settings(_env_file=None)
    assert settings.is_production is True

    monkeypatch.setenv("ENVIRONMENT", "development")
    settings = Settings(_env_file=None)
    assert settings.is_production is False


def test_docs_disabled_in_production(monkeypatch):
    """OpenAPI docs URL should be None in production."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    settings = Settings(_env_file=None)
    assert settings.docs_url is None
    assert settings.redoc_url is None


def test_docs_enabled_in_development(monkeypatch):
    """OpenAPI docs should be available in development."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    settings = Settings(_env_file=None)
    assert settings.docs_url == "/docs"
    assert settings.redoc_url == "/redoc"
