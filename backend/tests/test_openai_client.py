import pytest
from unittest.mock import MagicMock, patch
from backend.app.openai_client import OpenAIClient
from backend.app.workflows.vendor_approval import VendorApprovalInput

@patch("backend.app.openai_client.OpenAI")
def test_extract_fields(mock_openai_class):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    
    # Mock the chat.completions.create response for structured field extraction
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content='{"vendor_name": "Slack", "sso_supported": "yes"}'))
    ]
    mock_client.chat.completions.create.return_value = mock_response

    client = OpenAIClient()
    extracted = client.extract_fields(
        model=VendorApprovalInput,
        current_fields={"business_owner": "bob@acme.com"},
        messages=[{"role": "user", "content": "Slack is great, and yes we support SSO."}]
    )
    assert extracted == {"vendor_name": "Slack", "sso_supported": "yes"}

@patch("backend.app.openai_client.OpenAI")
def test_generate_follow_up(mock_openai_class):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content='Could you please tell me if SOC2 is available?'))
    ]
    mock_client.chat.completions.create.return_value = mock_response

    client = OpenAIClient()
    text = client.generate_follow_up(
        missing_field="soc2_available",
        field_description="Whether a SOC2 report is available",
        messages=[{"role": "user", "content": "I need vendor approval for Slack"}]
    )
    assert "SOC2" in text

@patch("backend.app.openai_client.OpenAI")
def test_generate_final_response(mock_openai_class):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content='Your request has been approved because SOC2 is available.'))
    ]
    mock_client.chat.completions.create.return_value = mock_response

    client = OpenAIClient()
    text = client.generate_final_response(
        workflow_name="Vendor Approval",
        status="Approved",
        rationale="SOC2 is available.",
        metadata={"risk_level": "Medium"},
        messages=[{"role": "user", "content": "Here is the SOC2"}]
    )
    assert "approved" in text


@patch("backend.app.openai_client.OpenAI")
def test_extract_fields_error(mock_openai_class):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = Exception("API Error")

    client = OpenAIClient()
    extracted = client.extract_fields(
        model=VendorApprovalInput,
        current_fields={"business_owner": "bob@acme.com"},
        messages=[{"role": "user", "content": "Slack is great, and yes we support SSO."}]
    )
    assert extracted == {}


@patch("backend.app.openai_client.OpenAI")
def test_generate_follow_up_error(mock_openai_class):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = Exception("API Error")

    client = OpenAIClient()
    text = client.generate_follow_up(
        missing_field="soc2_available",
        field_description="Whether a SOC2 report is available",
        messages=[{"role": "user", "content": "I need vendor approval for Slack"}]
    )
    assert "Whether a SOC2 report is available" in text


@patch("backend.app.openai_client.OpenAI")
def test_generate_final_response_error(mock_openai_class):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = Exception("API Error")

    client = OpenAIClient()
    text = client.generate_final_response(
        workflow_name="Vendor Approval",
        status="Approved",
        rationale="SOC2 is available.",
        metadata={"risk_level": "Medium"},
        messages=[{"role": "user", "content": "Here is the SOC2"}]
    )
    assert "Approved" in text
    assert "SOC2 is available." in text
