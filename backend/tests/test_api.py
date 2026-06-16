"""
API integration tests.

Uses the `test_client` fixture from conftest.py which provides a fresh
in-memory database per test — no shared state, no order dependencies.
"""
import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture(autouse=True)
def mock_openai():
    with patch("backend.app.openai_client.OpenAI") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client



def test_get_workflows(test_client):
    response = test_client.get("/api/workflows")
    assert response.status_code == 200
    data = response.json()

    names = [w["name"] for w in data]
    assert "Vendor Approval" in names
    assert "Firewall Change" in names

    fw_wf = next(w for w in data if w["name"] == "Firewall Change")
    field_names = [f["name"] for f in fw_wf["fields"]]
    assert "source" in field_names
    assert "expiry" in field_names
    assert "environment" in field_names

    # Every field must expose whether it is required
    for field in fw_wf["fields"]:
        assert "required" in field


def test_session_lifecycle_api(mock_openai, test_client):
    mock_openai.chat.completions.create.side_effect = [
        # start_session → follow-up question
        MagicMock(choices=[MagicMock(message=MagicMock(content="What is the vendor name?"))]),
        # process_message → extract all fields
        MagicMock(choices=[MagicMock(message=MagicMock(
            content='{"vendor_name": "Slack", "business_owner": "bob@acme.com", "data_classification": "public", "sso_supported": "yes", "soc2_available": "yes"}'
        ))]),
        # process_message → final response
        MagicMock(choices=[MagicMock(message=MagicMock(content="Approved."))]),
    ]

    # Create session
    response = test_client.post("/api/sessions", json={
        "workflow_name": "Vendor Approval",
        "form_values": {"vendor_name": "Slack"},
    })
    assert response.status_code == 200
    data = response.json()
    session_id = data["id"]
    assert data["status"] == "active"
    assert data["last_message"] == "What is the vendor name?"

    # Fetch session detail
    response = test_client.get(f"/api/sessions/{session_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "active"

    # Complete the session
    response = test_client.post(f"/api/sessions/{session_id}/messages", json={
        "message": "It is Slack, Bob is owner, public, SSO yes, SOC2 yes"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["last_message"] == "Approved."

    # Audit log must be written
    response = test_client.get(f"/api/sessions/{session_id}")
    assert response.json()["audit_log"]["decision"] == "Approved"


def test_send_empty_message_rejected(test_client):
    """Sending a blank message must return 422 Unprocessable Entity."""
    response = test_client.post("/api/sessions/fake-id/messages", json={"message": "   "})
    assert response.status_code == 422


def test_get_session_not_found(test_client):
    response = test_client.get("/api/sessions/does-not-exist")
    assert response.status_code == 404


def test_delete_session_api(mock_openai, test_client):
    mock_openai.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="What is vendor?"))]
    )

    # Create session
    response = test_client.post("/api/sessions", json={
        "workflow_name": "Vendor Approval",
        "form_values": {"vendor_name": "To Delete"},
    })
    assert response.status_code == 200
    session_id = response.json()["id"]

    # Delete it
    del_response = test_client.delete(f"/api/sessions/{session_id}")
    assert del_response.status_code == 200
    assert del_response.json() == {"detail": "Session deleted"}

    # Confirm it's gone
    get_response = test_client.get(f"/api/sessions/{session_id}")
    assert get_response.status_code == 404


def test_create_session_with_refitted_from(mock_openai, test_client):
    mock_openai.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="Question?"))]
    )

    # 1. Create a parent session
    response1 = test_client.post("/api/sessions", json={
        "workflow_name": "Vendor Approval",
        "form_values": {"vendor_name": "Rejected Vendor"}
    })
    parent_id = response1.json()["id"]

    # 2. Create a refitted session linking back to parent_id
    response2 = test_client.post("/api/sessions", json={
        "workflow_name": "Vendor Approval",
        "form_values": {"vendor_name": "Refitted Vendor"},
        "refitted_from": parent_id
    })
    assert response2.status_code == 200
    refitted_id = response2.json()["id"]

    # 3. Retrieve refitted session details and assert refitted_from is returned
    get_res = test_client.get(f"/api/sessions/{refitted_id}")
    assert get_res.status_code == 200
    assert get_res.json()["refitted_from"] == parent_id
