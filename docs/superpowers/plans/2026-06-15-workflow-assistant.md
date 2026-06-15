# Security Workflow Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pluggable, hybrid security workflow assistant using FastAPI, SQLite, React (Vite, styled-components), and OpenAI API, using TDD to verify the backend behavior.

**Architecture:** A FastAPI backend stores session states and audit logs in an SQLite database. It loads a pluggable `Workflow` class defining a Pydantic schema for inputs and returning a Pydantic `WorkflowDecision`. If inputs are complete, the decision is evaluated; if incomplete, an OpenAI-driven chat loop collects missing fields. A React frontend renders the forms dynamically and provides a chat UI.

**Tech Stack:** FastAPI, SQLite, SQLAlchemy, Pydantic, pytest, OpenAI API, React, Vite, styled-components.

---

### Task 1: Backend Initialization and Dependencies

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/config.py`
- Create: `backend/tests/test_config.py`

- [ ] **Step 1: Write requirements.txt**
  Create `backend/requirements.txt` with:
  ```text
  fastapi==0.111.0
  uvicorn==0.30.1
  openai==1.34.0
  sqlalchemy==2.0.30
  pydantic==2.7.4
  pydantic-settings==2.3.3
  pytest==8.2.2
  httpx==0.27.0
  python-dotenv==1.0.1
  ```

- [ ] **Step 2: Create config.py with environment variables**
  Create `backend/app/config.py` with:
  ```python
  import os
  from pydantic_settings import BaseSettings

  class Settings(BaseSettings):
      OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "mock-key")
      DATABASE_URL: str = "sqlite:///./security_assistant.db"

      class Config:
          env_file = ".env"

  settings = Settings()
  ```

- [ ] **Step 3: Run pip install and verify**
  Run: `pip install -r backend/requirements.txt`
  Expected: Installation finishes successfully.

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add backend/requirements.txt backend/app/config.py backend/tests/test_config.py
  git commit -m "chore: initialize backend dependencies and config"
  ```

---

### Task 2: Database Setup and Models

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models.py`
- Create: `backend/tests/test_database.py`

- [ ] **Step 1: Write database test**
  Create `backend/tests/test_database.py`:
  ```python
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
  ```

- [ ] **Step 2: Run test and verify it fails**
  Run: `pytest backend/tests/test_database.py -v`
  Expected: FAIL (database/models module not found)

- [ ] **Step 3: Implement database.py and models.py**
  Create `backend/app/database.py`:
  ```python
  from sqlalchemy import create_engine
  from sqlalchemy.orm import declarative_base, sessionmaker
  from backend.app.config import settings

  engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
  SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
  Base = declarative_base()

  def get_db():
      db = SessionLocal()
      try:
          yield db
      finally:
          db.close()
  ```

  Create `backend/app/models.py`:
  ```python
  from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
  from sqlalchemy.sql import func
  from backend.app.database import Base

  class Session(Base):
      __tablename__ = "sessions"
      id = Column(String, primary_key=True, index=True)
      status = Column(String, default="active") # active, completed
      workflow_name = Column(String, nullable=False)
      extracted_fields = Column(JSON, default=dict)
      created_at = Column(DateTime(timezone=True), server_default=func.now())
      updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

  class Message(Base):
      __tablename__ = "messages"
      id = Column(Integer, primary_key=True, index=True, autoincrement=True)
      session_id = Column(String, ForeignKey("sessions.id"))
      role = Column(String, nullable=False) # user, assistant
      content = Column(String, nullable=False)
      timestamp = Column(DateTime(timezone=True), server_default=func.now())

  class AuditLog(Base):
      __tablename__ = "audit_logs"
      id = Column(Integer, primary_key=True, index=True, autoincrement=True)
      session_id = Column(String, nullable=False)
      workflow_name = Column(String, nullable=False)
      extracted_fields = Column(JSON, default=dict)
      decision = Column(String, nullable=False) # Approved, Rejected, Needs More Info
      rationale = Column(String, nullable=False)
      final_response = Column(String, nullable=False)
      timestamp = Column(DateTime(timezone=True), server_default=func.now())
  ```

- [ ] **Step 4: Run test and verify it passes**
  Run: `pytest backend/tests/test_database.py -v`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add backend/app/database.py backend/app/models.py backend/tests/test_database.py
  git commit -m "feat: implement database connection and SQLAlchemy models with tests"
  ```

---

### Task 3: Workflow Base and Vendor Approval implementation

**Files:**
- Create: `backend/app/workflows/base.py`
- Create: `backend/app/workflows/vendor_approval.py`
- Create: `backend/tests/test_workflows.py`

- [ ] **Step 1: Write workflows test**
  Create `backend/tests/test_workflows.py`:
  ```python
  import pytest
  from backend.app.workflows.vendor_approval import VendorApprovalWorkflow

  def test_vendor_approval_validation():
      wf = VendorApprovalWorkflow()
      assert wf.name == "Vendor Approval"
      assert "vendor_name" in wf.required_fields
      assert len(wf.required_fields) == 5

      # Test Rejected decision (PII classification and no SOC2)
      dec_rejected = wf.evaluate_decision({
          "vendor_name": "Acme",
          "business_owner": "owner@acme.com",
          "data_classification": "PII",
          "sso_supported": "yes",
          "soc2_available": "no"
      })
      assert dec_rejected.status == "Rejected"
      assert "SOC2" in dec_rejected.rationale
      assert dec_rejected.metadata["risk_level"] == "High"
      assert dec_rejected.input_data["vendor_name"] == "Acme"

      # Test Approved decision (PII and SOC2 available)
      dec_approved = wf.evaluate_decision({
          "vendor_name": "Acme",
          "business_owner": "owner@acme.com",
          "data_classification": "PII",
          "sso_supported": "yes",
          "soc2_available": "yes"
      })
      assert dec_approved.status == "Approved"
      assert dec_approved.metadata["risk_level"] == "Medium"
      assert dec_approved.input_data["soc2_available"] == "yes"
  ```

- [ ] **Step 2: Run test and verify it fails**
  Run: `pytest backend/tests/test_workflows.py -v`
  Expected: FAIL (workflows module not found)

- [ ] **Step 3: Implement base.py and vendor_approval.py**
  Create `backend/app/workflows/base.py`:
  ```python
  from abc import ABC, abstractmethod
  from typing import Dict, Any, List
  from pydantic import BaseModel

  class WorkflowDecision(BaseModel):
      status: str  # Approved or Rejected
      rationale: str
      metadata: Dict[str, Any]
      input_data: Dict[str, Any]

  class Workflow(ABC):
      @property
      @abstractmethod
      def name(self) -> str:
          pass

      @property
      @abstractmethod
      def description(self) -> str:
          pass

      @property
      @abstractmethod
      def input_model(self) -> type[BaseModel]:
          pass

      @property
      def required_fields(self) -> List[str]:
          return list(self.input_model.model_fields.keys())

      @abstractmethod
      def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
          pass
  ```

  Create `backend/app/workflows/vendor_approval.py`:
  ```python
  from pydantic import BaseModel, Field
  from typing import Literal, Dict, Any
  from backend.app.workflows.base import Workflow, WorkflowDecision

  class VendorApprovalInput(BaseModel):
      vendor_name: str = Field(description="The name of the vendor.")
      business_owner: str = Field(description="The email or name of the internal business owner.")
      data_classification: Literal["public", "internal", "PII"] = Field(description="The classification of data processed by the vendor.")
      sso_supported: Literal["yes", "no"] = Field(description="Whether the vendor supports single sign-on (SSO).")
      soc2_available: Literal["yes", "no"] = Field(description="Whether a SOC2 report is available for the vendor.")

  class VendorApprovalWorkflow(Workflow):
      @property
      def name(self) -> str:
          return "Vendor Approval"

      @property
      def description(self) -> str:
          return "Process requests for reviewing and approving a new third-party software vendor."

      @property
      def input_model(self) -> type[BaseModel]:
          return VendorApprovalInput

      def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
          data = self.input_model(**extracted_fields)
          if data.data_classification == "PII" and data.soc2_available == "no":
              return WorkflowDecision(
                  status="Rejected",
                  rationale="SOC2 certification is required for PII data classification.",
                  metadata={
                      "risk_level": "High",
                      "requires_soc2": True,
                      "sso_compliant": data.sso_supported == "yes"
                  },
                  input_data=data.model_dump()
              )
          return WorkflowDecision(
              status="Approved",
              rationale="All security criteria met successfully.",
              metadata={
                  "risk_level": "Low" if data.data_classification == "public" else "Medium",
                  "requires_soc2": data.data_classification == "PII",
                  "sso_compliant": data.sso_supported == "yes"
              },
              input_data=data.model_dump()
          )
  ```

- [ ] **Step 4: Run test and verify it passes**
  Run: `pytest backend/tests/test_workflows.py -v`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add backend/app/workflows/base.py backend/app/workflows/vendor_approval.py backend/tests/test_workflows.py
  git commit -m "feat: implement pluggable workflow interface and Vendor Approval workflow with tests"
  ```

---

### Task 4: OpenAI client wrapper implementation

**Files:**
- Create: `backend/app/openai_client.py`
- Create: `backend/tests/test_openai_client.py`

- [ ] **Step 1: Write test for openai_client**
  Create `backend/tests/test_openai_client.py`:
  ```python
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
  ```

- [ ] **Step 2: Run test and verify it fails**
  Run: `pytest backend/tests/test_openai_client.py -v`
  Expected: FAIL (openai_client module not found)

- [ ] **Step 3: Implement openai_client.py**
  Create `backend/app/openai_client.py`:
  ```python
  from openai import OpenAI
  import json
  from typing import Dict, Any, List
  from pydantic import BaseModel
  from backend.app.config import settings

  class OpenAIClient:
      def __init__(self):
          self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

      def extract_fields(self, model: type[BaseModel], current_fields: Dict[str, Any], messages: List[Dict[str, str]]) -> Dict[str, Any]:
          # Generate structured extraction schema
          schema = model.model_json_schema()
          system_prompt = (
              f"You are a security data extraction assistant. Your job is to analyze the conversation history "
              f"and extract inputs matching this JSON Schema:\n{json.dumps(schema)}\n\n"
              f"Current extracted values so far: {json.dumps(current_fields)}.\n"
              f"Only extract field values if they are explicitly mentioned and clear. Do not invent or assume values. "
              f"Output ONLY a raw JSON object containing the new or updated field values."
          )
          
          # Format conversation for LLM
          chat_messages = [{"role": "system", "content": system_prompt}]
          for msg in messages:
              chat_messages.append({"role": msg["role"], "content": msg["content"]})
              
          try:
              response = self.client.chat.completions.create(
                  model="gpt-4o",
                  messages=chat_messages,
                  response_format={"type": "json_object"},
                  temperature=0.0
              )
              content = response.choices[0].message.content
              return json.loads(content) if content else {}
          except Exception as e:
              # Fallback to current fields on error
              return {}

      def generate_follow_up(self, missing_field: str, field_description: str, messages: List[Dict[str, str]]) -> str:
          system_prompt = (
              f"You are a friendly, helpful security team assistant. We are collecting information for a security review.\n"
              f"The field '{missing_field}' (described as: '{field_description}') is missing.\n"
              f"Ask the user one polite, conversational question to gather ONLY this missing field. "
              f"Do not ask for any other information. Keep it short."
          )
          
          chat_messages = [{"role": "system", "content": system_prompt}]
          for msg in messages:
              chat_messages.append({"role": msg["role"], "content": msg["content"]})
              
          try:
              response = self.client.chat.completions.create(
                  model="gpt-4o",
                  messages=chat_messages,
                  temperature=0.7
              )
              return response.choices[0].message.content.strip()
          except Exception as e:
              return f"Please provide the required information for: {field_description}."

      def generate_final_response(self, workflow_name: str, status: str, rationale: str, metadata: Dict[str, Any], messages: List[Dict[str, str]]) -> str:
          system_prompt = (
              f"You are a friendly security team assistant. A security request under workflow '{workflow_name}' has been evaluated.\n"
              f"Status: {status}\n"
              f"Rationale: {rationale}\n"
              f"In-depth security metadata: {json.dumps(metadata)}\n\n"
              f"Write a friendly, professional response informing the user of the final decision and explaining the rationale in detail."
          )
          
          chat_messages = [{"role": "system", "content": system_prompt}]
          for msg in messages:
              chat_messages.append({"role": msg["role"], "content": msg["content"]})
              
          try:
              response = self.client.chat.completions.create(
                  model="gpt-4o",
                  messages=chat_messages,
                  temperature=0.7
              )
              return response.choices[0].message.content.strip()
          except Exception as e:
              return f"Your request has been {status}. Rationale: {rationale}."
  ```

- [ ] **Step 4: Run test and verify it passes**
  Run: `pytest backend/tests/test_openai_client.py -v`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add backend/app/openai_client.py backend/tests/test_openai_client.py
  git commit -m "feat: implement OpenAI Client wrapper with tests"
  ```

---

### Task 5: Engine Orchestrator

**Files:**
- Create: `backend/app/engine.py`
- Create: `backend/tests/test_engine.py`

- [ ] **Step 1: Write integration tests for engine**
  Create `backend/tests/test_engine.py`:
  ```python
  import pytest
  from unittest.mock import MagicMock, patch
  from sqlalchemy import create_engine
  from sqlalchemy.orm import sessionmaker
  from backend.app.database import Base
  from backend.app.models import Session, Message, AuditLog
  from backend.app.engine import Engine
  from backend.app.workflows.vendor_approval import VendorApprovalWorkflow

  @pytest.fixture
  def db_session():
      engine = create_engine("sqlite:///:memory:")
      TestingSessionLocal = sessionmaker(bind=engine)
      Base.metadata.create_all(bind=engine)
      db = TestingSessionLocal()
      yield db
      db.close()

  @patch("backend.app.openai_client.OpenAI")
  def test_engine_incomplete_flow(mock_openai_class, db_session):
      mock_client = MagicMock()
      mock_openai_class.return_value = mock_client
      
      # Mock LLM field extractor (no fields extracted) and follow-up generator
      mock_client.chat.completions.create.side_effect = [
          # first call: extract fields (returns empty object)
          MagicMock(choices=[MagicMock(message=MagicMock(content='{}'))]),
          # second call: generate follow-up question
          MagicMock(choices=[MagicMock(message=MagicMock(content='Who is the business owner?'))])
      ]

      engine = Engine()
      # Start session with some fields missing
      session_id, reply = engine.start_session(
          db=db_session,
          workflow_name="Vendor Approval",
          initial_fields={"vendor_name": "Slack"}
      )
      
      assert reply == "Who is the business owner?"
      
      # Verify session is saved as active in DB
      sess = db_session.query(Session).filter_by(id=session_id).first()
      assert sess.status == "active"
      assert sess.extracted_fields == {"vendor_name": "Slack"}

  @patch("backend.app.openai_client.OpenAI")
  def test_engine_complete_flow(mock_openai_class, db_session):
      mock_client = MagicMock()
      mock_openai_class.return_value = mock_client
      
      # Mock LLM extract (complete fields) and final response
      mock_client.chat.completions.create.side_effect = [
          # extract fields
          MagicMock(choices=[MagicMock(message=MagicMock(content='{"business_owner": "bob@acme.com", "data_classification": "public", "sso_supported": "yes", "soc2_available": "yes"}'))]),
          # generate final response
          MagicMock(choices=[MagicMock(message=MagicMock(content='Your vendor request for Slack has been approved!'))])
      ]

      engine = Engine()
      # Start session with incomplete fields
      session_id, reply = engine.start_session(
          db=db_session,
          workflow_name="Vendor Approval",
          initial_fields={"vendor_name": "Slack"}
      )
      
      # Process next message that completes fields
      sess_id, reply2 = engine.process_message(
          db=db_session,
          session_id=session_id,
          message="I am the owner and we have SSO/SOC2."
      )

      assert "approved" in reply2.lower()
      
      # Verify session completed & audit log written
      sess = db_session.query(Session).filter_by(id=session_id).first()
      assert sess.status == "completed"
      
      audit = db_session.query(AuditLog).filter_by(session_id=session_id).first()
      assert audit is not None
      assert audit.decision == "Approved"
  ```

- [ ] **Step 2: Run test and verify it fails**
  Run: `pytest backend/tests/test_engine.py -v`
  Expected: FAIL (engine module not found)

- [ ] **Step 3: Implement engine.py**
  Create `backend/app/engine.py`:
  ```python
  import uuid
  from typing import Dict, Any, List, Optional
  from sqlalchemy.orm import Session as DBSession
  from backend.app.models import Session as SessionModel, Message as MessageModel, AuditLog as AuditLogModel
  from backend.app.openai_client import OpenAIClient
  from backend.app.workflows.vendor_approval import VendorApprovalWorkflow

  class Engine:
      def __init__(self):
          self.openai_client = OpenAIClient()
          # Registry of pluggable workflows
          self.workflows = {
              "Vendor Approval": VendorApprovalWorkflow()
          }

      def get_workflow(self, name: str):
          if name not in self.workflows:
              raise ValueError(f"Unknown workflow: {name}")
          return self.workflows[name]

      def start_session(self, db: DBSession, workflow_name: str, initial_fields: Dict[str, Any]) -> tuple[str, str]:
          session_id = str(uuid.uuid4())
          wf = self.get_workflow(workflow_name)
          
          # Clean initial_fields: filter out None or empty strings
          cleaned_fields = {k: v for k, v in initial_fields.items() if v is not None and v != ""}
          
          session = SessionModel(
              id=session_id,
              status="active",
              workflow_name=workflow_name,
              extracted_fields=cleaned_fields
          )
          db.add(session)
          
          # Add initial message summarizing the request
          summary = f"Started workflow '{workflow_name}' with fields: " + ", ".join([f"{k}={v}" for k, v in cleaned_fields.items()])
          msg = MessageModel(session_id=session_id, role="user", content=summary)
          db.add(msg)
          db.commit()

          return session_id, self._evaluate_and_respond(db, session)

      def process_message(self, db: DBSession, session_id: str, message: str) -> tuple[str, str]:
          session = db.query(SessionModel).filter_by(id=session_id).first()
          if not session:
              raise ValueError("Session not found")
          if session.status == "completed":
              raise ValueError("Session is already completed")

          # Save user message
          user_msg = MessageModel(session_id=session_id, role="user", content=message)
          db.add(user_msg)
          db.commit()

          # Retrieve messages
          db_messages = db.query(MessageModel).filter_by(session_id=session_id).order_index = MessageModel.id.asc()
          messages_list = [{"role": m.role, "content": m.content} for m in db_messages]

          # Extract new fields using LLM
          wf = self.get_workflow(session.workflow_name)
          new_fields = self.openai_client.extract_fields(
              model=wf.input_model,
              current_fields=session.extracted_fields,
              messages=messages_list
          )
          
          # Update session with new fields
          updated_fields = {**session.extracted_fields}
          for k, v in new_fields.items():
              if v is not None and v != "":
                  updated_fields[k] = v
          
          session.extracted_fields = updated_fields
          db.commit()

          return session_id, self._evaluate_and_respond(db, session)

      def _evaluate_and_respond(self, db: DBSession, session: SessionModel) -> str:
          wf = self.get_workflow(session.workflow_name)
          extracted = session.extracted_fields or {}

          # Check missing fields
          missing_fields = []
          for field in wf.required_fields:
              if field not in extracted or extracted[field] is None or extracted[field] == "":
                  missing_fields.append(field)

          db_messages = db.query(MessageModel).filter_by(session_id=session.id).order_index = MessageModel.id.asc()
          messages_list = [{"role": m.role, "content": m.content} for m in db_messages]

          if missing_fields:
              # Get first missing field to query
              next_field = missing_fields[0]
              field_description = wf.input_model.model_fields[next_field].description or next_field
              
              # Generate follow up question
              follow_up = self.openai_client.generate_follow_up(
                  missing_field=next_field,
                  field_description=field_description,
                  messages=messages_list
              )
              
              # Save assistant follow up
              assistant_msg = MessageModel(session_id=session.id, role="assistant", content=follow_up)
              db.add(assistant_msg)
              db.commit()
              return follow_up

          # All fields complete, evaluate decision!
          decision_obj = wf.evaluate_decision(extracted)
          
          # Generate final wording response
          final_response = self.openai_client.generate_final_response(
              workflow_name=session.workflow_name,
              status=decision_obj.status,
              rationale=decision_obj.rationale,
              metadata=decision_obj.metadata,
              messages=messages_list
          )

          # Update session status
          session.status = "completed"
          
          # Save assistant final response
          assistant_msg = MessageModel(session_id=session.id, role="assistant", content=final_response)
          db.add(assistant_msg)

          # Write Audit Log
          audit_log = AuditLogModel(
              session_id=session.id,
              workflow_name=session.workflow_name,
              extracted_fields=extracted,
              decision=decision_obj.status,
              rationale=decision_obj.rationale,
              final_response=final_response
          )
          db.add(audit_log)
          db.commit()

          return final_response
  ```

- [ ] **Step 4: Run test and verify it passes**
  Run: `pytest backend/tests/test_engine.py -v`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add backend/app/engine.py backend/tests/test_engine.py
  git commit -m "feat: implement Core Engine orchestrator with tests"
  ```

---

### Task 6: API Routes and FastAPI Setup

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/tests/test_api.py`

- [ ] **Step 1: Write API endpoint tests**
  Create `backend/tests/test_api.py`:
  ```python
  import pytest
  from fastapi.testclient import TestClient
  from unittest.mock import MagicMock, patch
  from backend.app.main import app
  from backend.app.database import Base, get_db
  from sqlalchemy import create_engine
  from sqlalchemy.orm import sessionmaker

  # Setup in-memory SQLite database for test client
  engine = create_engine("sqlite:///:memory:")
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
      assert len(data) == 1
      assert data[0]["name"] == "Vendor Approval"

  @patch("backend.app.openai_client.OpenAI")
  def test_session_lifecycle_api(mock_openai_class):
      mock_client = MagicMock()
      mock_openai_class.return_value = mock_client
      
      # Mock responses: 1) extract fields empty, 2) ask follow-up, 3) extract full, 4) final decision
      mock_client.chat.completions.create.side_effect = [
          # Creation extraction (empty)
          MagicMock(choices=[MagicMock(message=MagicMock(content='{}'))]),
          # Creation follow-up question
          MagicMock(choices=[MagicMock(message=MagicMock(content='What is the vendor name?'))]),
          # Second message extraction (completing all fields)
          MagicMock(choices=[MagicMock(message=MagicMock(content='{"vendor_name": "Slack", "business_owner": "bob@acme.com", "data_classification": "public", "sso_supported": "yes", "soc2_available": "yes"}'))]),
          # Final decision message
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
  ```

- [ ] **Step 2: Run test and verify it fails**
  Run: `pytest backend/tests/test_api.py -v`
  Expected: FAIL (routes not found / main.py missing)

- [ ] **Step 3: Implement main.py and database creation on start**
  Create `backend/app/main.py`:
  ```python
  from fastapi import FastAPI, Depends, HTTPException
  from fastapi.middleware.cors import CORSMiddleware
  from sqlalchemy.orm import Session
  from pydantic import BaseModel
  from typing import Dict, Any, List, Optional
  
  from backend.app.database import engine, Base, get_db
  from backend.app.models import Session as SessionModel, Message as MessageModel, AuditLog as AuditLogModel
  from backend.app.engine import Engine

  # Create tables
  Base.metadata.create_all(bind=engine)

  app = FastAPI(title="Security Workflow Assistant API")
  engine_instance = Engine()

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )

  class SessionCreate(BaseModel):
      workflow_name: str
      form_values: Dict[str, Any]

  class MessageCreate(BaseModel):
      message: str

  @app.get("/api/workflows")
  def get_workflows():
      result = []
      for name, wf in engine_instance.workflows.items():
          # Extract field metadata dynamically from Pydantic input_model
          fields = []
          for field_name, field_info in wf.input_model.model_fields.items():
              fields.append({
                  "name": field_name,
                  "description": field_info.description or field_name,
                  "type": getattr(field_info.annotation, "__name__", str(field_info.annotation)),
                  "choices": list(field_info.annotation.__args__) if hasattr(field_info.annotation, "__args__") else None
              })
          result.append({
              "name": wf.name,
              "description": wf.description,
              "fields": fields
          })
      return result

  @app.get("/api/sessions")
  def get_sessions(db: Session = Depends(get_db)):
      sessions = db.query(SessionModel).order_by(SessionModel.updated_at.desc()).all()
      return [{
          "id": s.id,
          "status": s.status,
          "workflow_name": s.workflow_name,
          "extracted_fields": s.extracted_fields,
          "updated_at": s.updated_at
      } for s in sessions]

  @app.post("/api/sessions")
  def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
      try:
          session_id, assistant_reply = engine_instance.start_session(
              db=db,
              workflow_name=payload.workflow_name,
              initial_fields=payload.form_values
          )
          
          session = db.query(SessionModel).filter_by(id=session_id).first()
          return {
              "id": session_id,
              "status": session.status,
              "last_message": assistant_reply
          }
      except ValueError as e:
          raise HTTPException(status_code=400, detail=str(e))

  @app.get("/api/sessions/{session_id}")
  def get_session(session_id: str, db: Session = Depends(get_db)):
      session = db.query(SessionModel).filter_by(id=session_id).first()
      if not session:
          raise HTTPException(status_code=404, detail="Session not found")
          
      messages = db.query(MessageModel).filter_by(session_id=session_id).order_by(MessageModel.id.asc()).all()
      audit_log = db.query(AuditLogModel).filter_by(session_id=session_id).first()
      
      return {
          "id": session.id,
          "status": session.status,
          "workflow_name": session.workflow_name,
          "extracted_fields": session.extracted_fields,
          "messages": [{"role": m.role, "content": m.content, "timestamp": m.timestamp} for m in messages],
          "audit_log": {
              "decision": audit_log.decision,
              "rationale": audit_log.rationale,
              "final_response": audit_log.final_response,
              "timestamp": audit_log.timestamp
          } if audit_log else None
      }

  @app.post("/api/sessions/{session_id}/messages")
  def send_message(session_id: str, payload: MessageCreate, db: Session = Depends(get_db)):
      try:
          sess_id, assistant_reply = engine_instance.process_message(
              db=db,
              session_id=session_id,
              message=payload.message
          )
          session = db.query(SessionModel).filter_by(id=session_id).first()
          return {
              "id": session_id,
              "status": session.status,
              "last_message": assistant_reply
          }
      except ValueError as e:
          raise HTTPException(status_code=400, detail=str(e))
  ```

- [ ] **Step 4: Run test and verify it passes**
  Run: `pytest backend/tests/test_api.py -v`
  Expected: PASS

- [ ] **Step 5: Run all backend tests together to verify TDD completeness**
  Run: `pytest backend/tests/ -v`
  Expected: All tests (database, workflows, client, engine, api) PASS.

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add backend/app/main.py backend/tests/test_api.py
  git commit -m "feat: implement FastAPI router and endpoints with tests"
  ```

---

### Task 7: Frontend Scaffolding and Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`

- [ ] **Step 1: Check available options for Vite creation (First command with --help rule)**
  Run: `npx -y create-vite@latest --help`
  Expected: Displays Vite template option list.

- [ ] **Step 2: Create React application using Vite**
  Run in workspace root (`/Users/matan/projects/Treat`):
  `npx -y create-vite@latest frontend --template react`
  Expected: Creates standard React directory struct in `frontend/`.

- [ ] **Step 3: Modify package.json and install frontend dependencies**
  Modify: `frontend/package.json` to include styled-components and launch configurations.
  Install dependencies: `npm install --prefix frontend styled-components`
  Expected: Installations succeed.

- [ ] **Step 4: Configure Vite proxy**
  Create `frontend/vite.config.js` to proxy `/api` requests to backend port `8000`:
  ```javascript
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'

  export default defineConfig({
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        }
      }
    }
  })
  ```

- [ ] **Step 5: Commit scaffolding**
  Run:
  ```bash
  git add frontend/package.json frontend/vite.config.js
  git commit -m "chore: scaffold React Vite frontend and configure API proxy"
  ```

---

### Task 8: Frontend Component Development

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/components/SessionSidebar.jsx`
- Create: `frontend/src/components/ChatWindow.jsx`
- Create: `frontend/src/components/ChatInput.jsx`
- Create: `frontend/src/components/DecisionBanner.jsx`

- [ ] **Step 1: Build Sidebar component**
  Create `frontend/src/components/SessionSidebar.jsx` with list of historic sessions and a "New Request" button.
- [ ] **Step 2: Build ChatWindow and Message components**
  Create `frontend/src/components/ChatWindow.jsx` to render message histories and active fields.
- [ ] **Step 3: Build ChatInput and DecisionBanner components**
  Create `frontend/src/components/ChatInput.jsx` (form & chat input support) and `frontend/src/components/DecisionBanner.jsx` (Approved/Rejected banner).
- [ ] **Step 4: Build App.jsx layout and coordination logic**
  Update `frontend/src/App.jsx` to coordinate dropdown selections, form renderings, and API request dispatches.
- [ ] **Step 5: Commit UI implementation**
  Run:
  ```bash
  git add frontend/src/
  git commit -m "feat: implement React UI components using styled-components"
  ```

---

### Task 9: End-to-End Verification

- [ ] **Step 1: Run the complete test suite**
  Run: `pytest backend/tests/ -v`
  Expected: All tests pass.

- [ ] **Step 2: Start backend development server**
  Run: `python -m uvicorn backend.app.main:app --reload --port 8000`
  Expected: Server starts on port 8000.

- [ ] **Step 3: Start frontend development server**
  Run: `npm run dev --prefix frontend`
  Expected: Vite server starts on port 5173.

- [ ] **Step 4: Perform manual walk-through verification**
  Open `http://localhost:5173`. Select "Vendor Approval".
  Verify that submitting empty fields renders a chat prompt.
  Verify that typing details updates the extracted list.
  Verify that final decision renders the decision banner correctly.
