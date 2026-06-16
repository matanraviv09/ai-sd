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
    assert "Dev Tool Install" in names
    assert "Data Export" in names
    assert "Privileged Access" in names

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


def test_update_session_api(mock_openai, test_client):
    mock_openai.chat.completions.create.side_effect = [
        # start_session -> follow up
        MagicMock(choices=[MagicMock(message=MagicMock(content="What classification?"))]),
        # update_session -> evaluate (complete) -> final response
        MagicMock(choices=[MagicMock(message=MagicMock(content="Approved."))]),
    ]

    # 1. Create active session
    response = test_client.post("/api/sessions", json={
        "workflow_name": "Vendor Approval",
        "form_values": {"vendor_name": "Acme"}
    })
    assert response.status_code == 200
    session_id = response.json()["id"]

    # 2. Update it to be complete
    update_res = test_client.put(f"/api/sessions/{session_id}", json={
        "workflow_name": "Vendor Approval",
        "form_values": {
            "vendor_name": "Acme",
            "business_owner": "owner@acme.com",
            "data_classification": "public",
            "sso_supported": "yes",
            "soc2_available": "yes"
        }
    })
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "completed"
    assert update_res.json()["last_message"] == "Approved."

    # 3. Verify database updated
    get_res = test_client.get(f"/api/sessions/{session_id}")
    assert get_res.json()["extracted_fields"]["soc2_available"] == "yes"


def test_dev_tool_install_auto_accept(mock_openai, test_client):
    mock_openai.chat.completions.create.side_effect = [
        # start_session -> final response (Auto Approved)
        MagicMock(choices=[MagicMock(message=MagicMock(content="Tool install approved."))])
    ]

    # standard requested permissions, no team lead approval needed -> Auto Approved
    response = test_client.post("/api/sessions", json={
        "workflow_name": "Dev Tool Install",
        "form_values": {
            "tool_name": "VS Code",
            "vendor": "Microsoft",
            "requested_permissions": "standard",
            "team_lead_approval": "no",
            "justification": "Code development"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert "approved" in data["last_message"].lower()

    # Check Audit Log
    get_res = test_client.get(f"/api/sessions/{data['id']}")
    assert get_res.json()["audit_log"]["decision"] == "Approved"


def test_dev_tool_install_needs_info_then_fix(mock_openai, test_client):
    mock_openai.chat.completions.create.side_effect = [
        # start_session -> Needs More Info response
        MagicMock(choices=[MagicMock(message=MagicMock(content="Needs More Info: Admin installs require team lead approval."))]),
        # update_session -> Approved response
        MagicMock(choices=[MagicMock(message=MagicMock(content="Approved."))])
    ]

    # admin requested permissions but no team lead approval -> Needs More Info
    response = test_client.post("/api/sessions", json={
        "workflow_name": "Dev Tool Install",
        "form_values": {
            "tool_name": "Docker Desktop",
            "vendor": "Docker",
            "requested_permissions": "admin",
            "team_lead_approval": "no",
            "justification": "Running containers"
        }
    })
    assert response.status_code == 200
    data = response.json()
    session_id = data["id"]
    # Needs More Info is a non-terminal status, so session stays active
    assert data["status"] == "active"
    assert "needs more info" in data["last_message"].lower()

    # Fix: User updates session to say team lead approved
    update_res = test_client.put(f"/api/sessions/{session_id}", json={
        "workflow_name": "Dev Tool Install",
        "form_values": {
            "tool_name": "Docker Desktop",
            "vendor": "Docker",
            "requested_permissions": "admin",
            "team_lead_approval": "yes",
            "justification": "Running containers"
        }
    })
    assert update_res.status_code == 200
    update_data = update_res.json()
    assert update_data["status"] == "completed"
    assert update_data["last_message"] == "Approved."


def test_data_export_auto_reject(mock_openai, test_client):
    mock_openai.chat.completions.create.side_effect = [
        # start_session -> Rejected response
        MagicMock(choices=[MagicMock(message=MagicMock(content="Rejected: Exporting PII to personal email is prohibited."))])
    ]

    # contains PII and personal email destination -> Auto Rejected
    response = test_client.post("/api/sessions", json={
        "workflow_name": "Data Export",
        "form_values": {
            "dataset": "Customer details",
            "destination": "bob.personal@gmail.com",
            "contains_pii": "yes",
            "retention_days": 2,
            "encryption": "both",
            "justification": "Testing"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert "rejected" in data["last_message"].lower()

    # Check Audit Log
    get_res = test_client.get(f"/api/sessions/{data['id']}")
    assert get_res.json()["audit_log"]["decision"] == "Rejected"


def test_privileged_access_needs_info_then_fix(mock_openai, test_client):
    mock_openai.chat.completions.create.side_effect = [
        # start_session -> Needs More Info response
        MagicMock(choices=[MagicMock(message=MagicMock(content="Needs More Info: Requester needs manager approval."))]),
        # update_session -> Approved response
        MagicMock(choices=[MagicMock(message=MagicMock(content="Approved."))])
    ]

    # manager_approval = no -> Needs More Info
    response = test_client.post("/api/sessions", json={
        "workflow_name": "Privileged Access",
        "form_values": {
            "requester": "alice@acme.com",
            "system": "prod-db",
            "role": "admin",
            "duration_days": 5,
            "manager_approval": "no",
            "justification": "DB migration"
        }
    })
    assert response.status_code == 200
    data = response.json()
    session_id = data["id"]
    assert data["status"] == "active"
    assert "needs more info" in data["last_message"].lower()

    # Fix: User updates session to manager_approval = yes
    update_res = test_client.put(f"/api/sessions/{session_id}", json={
        "workflow_name": "Privileged Access",
        "form_values": {
            "requester": "alice@acme.com",
            "system": "prod-db",
            "role": "admin",
            "duration_days": 5,
            "manager_approval": "yes",
            "justification": "DB migration"
        }
    })
    assert update_res.status_code == 200
    update_data = update_res.json()
    assert update_data["status"] == "completed"
    assert update_data["last_message"] == "Approved."


