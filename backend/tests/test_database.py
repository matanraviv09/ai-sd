import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models import Session, Message, AuditLog
from datetime import datetime

def test_db_models():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Test Session creation
    session = Session(id="test-session-id", status="active", workflow_name="Vendor Approval", extracted_fields={})
    db.add(session)
    db.commit()

    db_session = db.query(Session).filter_by(id="test-session-id").first()
    assert db_session is not None
    assert db_session.status == "active"
    assert db_session.extracted_fields == {}

    # Test Message creation
    msg = Message(session_id="test-session-id", role="user", content="Hello")
    db.add(msg)
    db.commit()

    db_msg = db.query(Message).filter_by(session_id="test-session-id").first()
    assert db_msg.content == "Hello"

    # Test AuditLog creation
    log = AuditLog(session_id="test-session-id", workflow_name="Vendor Approval", extracted_fields={"vendor_name": "Slack"}, decision="Approved", rationale="SSO OK", final_response="Friendly message")
    db.add(log)
    db.commit()

    db_log = db.query(AuditLog).filter_by(session_id="test-session-id").first()
    assert db_log.decision == "Approved"
    db.close()
