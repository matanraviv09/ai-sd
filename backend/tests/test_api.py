import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.models import Session, Message, AuditLog
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup in-memory SQLite database with StaticPool for persistence
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_get_workflows():
    response = client.get("/api/workflows")
    assert response.status_code == 200
    data = response.json()
    # Should contain both Vendor Approval and Firewall Change
    names = [w["name"] for w in data]
    assert "Vendor Approval" in names
    assert "Firewall Change" in names
    
    # Check details of Firewall Change fields
    fw_wf = next(w for w in data if w["name"] == "Firewall Change")
    field_names = [f["name"] for f in fw_wf["fields"]]
    assert "source" in field_names
    assert "expiry" in field_names
    assert "environment" in field_names

@patch("backend.app.main.engine_instance.openai_client.client.chat.completions.create")
def test_session_lifecycle_api(mock_create):
    # Mock responses for Vendor Approval
    mock_create.side_effect = [
        # Creation: start_session -> generate follow-up question
        MagicMock(choices=[MagicMock(message=MagicMock(content='What is the vendor name?'))]),
        # process_message -> extract fields (completing all fields)
        MagicMock(choices=[MagicMock(message=MagicMock(content='{"vendor_name": "Slack", "business_owner": "bob@acme.com", "data_classification": "public", "sso_supported": "yes", "soc2_available": "yes"}'))]),
        # process_message -> generate final response
        MagicMock(choices=[MagicMock(message=MagicMock(content='Approved.'))])
    ]

    # Post new session
    response = client.post("/api/sessions", json={
        "workflow_name": "Vendor Approval",
        "form_values": {
            "vendor_name": "Slack"
        }
    })
    assert response.status_code == 200
    data = response.json()
    session_id = data["id"]
    assert data["status"] == "active"
    assert data["last_message"] == "What is the vendor name?"

    # Fetch session details
    response = client.get(f"/api/sessions/{session_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "active"

    # Post message resolving the missing fields
    response = client.post(f"/api/sessions/{session_id}/messages", json={
        "message": "It is Slack, Bob is owner, public, SSO yes, SOC2 yes"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["last_message"] == "Approved."

    # Fetch completed audit log
    response = client.get(f"/api/sessions/{session_id}")
    assert response.json()["audit_log"]["decision"] == "Approved"

@patch("backend.app.main.engine_instance.openai_client.client.chat.completions.create")
def test_delete_session_api(mock_create):
    mock_create.return_value = MagicMock(choices=[MagicMock(message=MagicMock(content='What is vendor?'))])
    
    # Create session
    response = client.post("/api/sessions", json={
        "workflow_name": "Vendor Approval",
        "form_values": { "vendor_name": "To Delete" }
    })
    session_id = response.json()["id"]

    # Delete session
    del_response = client.delete(f"/api/sessions/{session_id}")
    assert del_response.status_code == 200
    assert del_response.json() == {"detail": "Session deleted"}

    # Fetch deleted session should return 404
    get_response = client.get(f"/api/sessions/{session_id}")
    assert get_response.status_code == 404
