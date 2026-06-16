"""
Shared pytest fixtures for the backend test suite.

Every test that needs a database gets a fresh in-memory SQLite instance
via the `db_session` or `test_client` fixtures. This prevents test-order
dependencies caused by shared state.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.main import app


def _make_in_memory_engine():
    """Create a fresh, isolated in-memory SQLite engine."""
    return create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


@pytest.fixture()
def db_session():
    """Provide a clean database session for unit tests (no HTTP layer)."""
    mem_engine = _make_in_memory_engine()
    TestingSessionLocal = sessionmaker(bind=mem_engine)
    Base.metadata.create_all(bind=mem_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=mem_engine)


@pytest.fixture()
def test_client():
    """Provide a FastAPI TestClient wired to a fresh in-memory database."""
    mem_engine = _make_in_memory_engine()
    TestingSessionLocal = sessionmaker(bind=mem_engine)
    Base.metadata.create_all(bind=mem_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=mem_engine)
