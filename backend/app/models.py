from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database import Base

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, index=True)
    status = Column(String, default="active") # active, completed
    workflow_name = Column(String, nullable=False)
    extracted_fields = Column(JSON, default=dict)
    refitted_from = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="session", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), index=True)
    role = Column(String, nullable=False) # user, assistant
    content = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="messages")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # ForeignKey ensures referential integrity — audit records cannot outlive their session.
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    workflow_name = Column(String, nullable=False)
    extracted_fields = Column(JSON, default=dict)
    decision = Column(String, nullable=False)  # Approved, Rejected, Needs More Info
    rationale = Column(String, nullable=False)
    final_response = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="audit_logs")

