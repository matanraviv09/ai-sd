"""
Engine integration tests.

The `db_session` fixture is provided by conftest.py — each test gets a fresh
in-memory database so there is no shared state between tests.
"""
import pytest
from unittest.mock import MagicMock, patch
from backend.app.models import Session, Message, AuditLog
from backend.app.engine import Engine


@patch("backend.app.openai_client.OpenAI")
def test_engine_incomplete_flow(mock_openai_class, db_session):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client

    mock_client.chat.completions.create.side_effect = [
        # start_session → generate follow-up question (missing fields)
        MagicMock(choices=[MagicMock(message=MagicMock(content="Who is the business owner?"))])
    ]

    engine = Engine()
    session_id, session_obj, reply = engine.start_session(
        db=db_session,
        workflow_name="Vendor Approval",
        initial_fields={"vendor_name": "Slack"},
    )

    assert reply == "Who is the business owner?"

    sess = db_session.query(Session).filter_by(id=session_id).first()
    assert sess.status == "active"
    assert sess.extracted_fields == {"vendor_name": "Slack"}


@patch("backend.app.openai_client.OpenAI")
def test_engine_complete_flow(mock_openai_class, db_session):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client

    mock_client.chat.completions.create.side_effect = [
        # start_session → follow-up question
        MagicMock(choices=[MagicMock(message=MagicMock(content="Who is the business owner?"))]),
        # process_message → extract all remaining fields
        MagicMock(choices=[MagicMock(message=MagicMock(
            content='{"business_owner": "bob@acme.com", "data_classification": "public", "sso_supported": "yes", "soc2_available": "yes"}'
        ))]),
        # process_message → generate final response
        MagicMock(choices=[MagicMock(message=MagicMock(content="Your vendor request for Slack has been approved!"))]),
    ]

    engine = Engine()
    session_id, _, _ = engine.start_session(
        db=db_session,
        workflow_name="Vendor Approval",
        initial_fields={"vendor_name": "Slack"},
    )

    sess_id, _, reply2 = engine.process_message(
        db=db_session,
        session_id=session_id,
        message="I am the owner and we have SSO/SOC2.",
    )

    assert "approved" in reply2.lower()

    sess = db_session.query(Session).filter_by(id=session_id).first()
    assert sess.status == "completed"

    audit = db_session.query(AuditLog).filter_by(session_id=session_id).first()
    assert audit is not None
    assert audit.decision == "Approved"


@patch("backend.app.openai_client.OpenAI")
def test_engine_firewall_change_needs_more_info(mock_openai_class, db_session):
    """
    'Needs More Info' is a non-terminal decision — the session must stay
    active so the user can correct their request and re-submit.
    """
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client

    mock_client.chat.completions.create.side_effect = [
        # start_session → follow-up question
        MagicMock(choices=[MagicMock(message=MagicMock(content="What is the destination IP or DNS?"))]),
        # process_message → extract all fields
        MagicMock(choices=[MagicMock(message=MagicMock(
            content='{"source": "VPC-1", "destination": "10.0.0.1", "port": 80, "environment": "prod", "justification": "Required for API", "expiry": "permanent"}'
        ))]),
        # process_message → final response (Needs More Info decision)
        MagicMock(choices=[MagicMock(message=MagicMock(content="Needs More Info: Production firewall changes cannot be permanent."))]),
    ]

    engine = Engine()
    session_id, _, _ = engine.start_session(
        db=db_session,
        workflow_name="Firewall Change",
        initial_fields={"source": "VPC-1"},
    )

    sess_id, _, reply2 = engine.process_message(
        db=db_session,
        session_id=session_id,
        message="prod, permanent, 10.0.0.1, port 80",
    )

    assert "needs more info" in reply2.lower()

    sess = db_session.query(Session).filter_by(id=session_id).first()
    # Session must remain active — the user should be able to respond.
    assert sess.status == "active"

    audit = db_session.query(AuditLog).filter_by(session_id=session_id).first()
    assert audit is not None
    assert audit.decision == "Needs More Info"


@patch("backend.app.openai_client.OpenAI")
def test_engine_firewall_change_rejected(mock_openai_class, db_session):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client

    mock_client.chat.completions.create.side_effect = [
        MagicMock(choices=[MagicMock(message=MagicMock(content="What is the destination IP or DNS?"))]),
        MagicMock(choices=[MagicMock(message=MagicMock(
            content='{"source": "VPC-1", "destination": "0.0.0.0/0", "port": 22, "environment": "prod", "justification": "Required for SSH", "expiry": "2026-06-30"}'
        ))]),
        MagicMock(choices=[MagicMock(message=MagicMock(content="Rejected: Opening SSH to the internet is prohibited."))]),
    ]

    engine = Engine()
    session_id, _, _ = engine.start_session(
        db=db_session,
        workflow_name="Firewall Change",
        initial_fields={"source": "VPC-1"},
    )

    sess_id, _, reply2 = engine.process_message(
        db=db_session,
        session_id=session_id,
        message="VPC-1 to 0.0.0.0/0 on port 22 in prod till 2026-06-30",
    )

    assert "rejected" in reply2.lower()

    sess = db_session.query(Session).filter_by(id=session_id).first()
    assert sess.status == "completed"

    audit = db_session.query(AuditLog).filter_by(session_id=session_id).first()
    assert audit is not None
    assert audit.decision == "Rejected"
