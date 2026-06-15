# Design Spec: Hybrid Security Workflow Assistant

This document outlines the design, architecture, and testing plan for the Security Workflow Assistant. The assistant is built using a React (Vite, styled-components) frontend and a FastAPI (Python, SQLAlchemy, SQLite) backend.

## Goal & Background Context

The assistant helps users submit security requests (such as vendor approvals), validates the required fields, asks follow-up questions for any missing fields in a chat format, and makes a final decision based on pluggable rule sets.

To simplify user interaction and ensure deterministic field collection, the application uses a **hybrid form + chat fallback** model:
1. The user selects a workflow type and fills out a form with whatever information they currently have.
2. If all required fields are provided, the backend immediately evaluates the decision, generates the final wording using OpenAI, and finishes.
3. If fields are missing, the backend transitions the request into a back-and-forth chat conversation, prompting for one missing field at a time using OpenAI, and extracting the user's responses into the database.

---

## Directory Structure

```text
/Users/matan/projects/Treat/
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-06-15-workflow-assistant-design.md  # This spec file
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app & routing
│   │   ├── config.py               # Env configuration (API keys, DB path)
│   │   ├── database.py             # SQLite setup
│   │   ├── models.py               # SQLAlchemy models (Sessions, Messages, AuditLogs)
│   │   ├── openai_client.py        # OpenAI service wrapper
│   │   ├── engine.py               # Orchestrator coordinating flow and state
│   │   └── workflows/              # Pluggable workflows
│   │       ├── __init__.py
│   │       ├── base.py             # Abstract base Workflow interface
│   │       └── vendor_approval.py  # Vendor Approval workflow definition
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_engine.py          # Orchestration integration tests
│   │   ├── test_workflows.py       # Unit tests for individual workflows
│   │   └── test_api.py             # Endpoint tests
│   ├── requirements.txt            # dependencies: fastapi, uvicorn, openai, sqlalchemy, pydantic
│   └── run.py                      # run command wrapper
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx      # Scrollable conversation component
│   │   │   ├── ChatInput.jsx       # Chat input box for follow-ups
│   │   │   ├── SessionSidebar.jsx  # History of requests
│   │   │   └── DecisionBanner.jsx  # Displays decision status & rationale
│   │   ├── App.jsx                 # Page layout & state orchestration
│   │   ├── index.css               # Global CSS reset
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js              # Vite config with /api proxy to FastAPI
```

---

## Core Backend Architecture & Interfaces

### 1. Pluggable Workflow Interface (`backend/app/workflows/base.py`)
All workflows must implement the following abstract class. They must declare a Pydantic model (`input_model`) representing their schema and inputs, making them strongly typed and validation-ready.

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel

class WorkflowDecision(BaseModel):
    status: str  # 'Approved' or 'Rejected'
    rationale: str
    metadata: Dict[str, Any]  # Structured in-depth data for LLM response generation
    input_data: Dict[str, Any]  # The validated input model data itself

class Workflow(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """The display name and identifier of the workflow."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """A brief description of what this workflow covers."""
        pass

    @property
    @abstractmethod
    def input_model(self) -> type[BaseModel]:
        """Pydantic model representing the required fields and schema for this workflow."""
        pass

    @property
    def required_fields(self) -> List[str]:
        """List of field keys required to evaluate the decision, automatically extracted from the input_model schema."""
        return list(self.input_model.__fields__.keys())

    @abstractmethod
    def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
        """
        Evaluates the completed fields.
        Returns a WorkflowDecision object containing the status, rationale, and detailed metadata.
        """
        pass
```

### 2. Vendor Approval Workflow (`backend/app/workflows/vendor_approval.py`)
Implementation of the core workflow utilizing a Pydantic model for its input definition and returning a structured `WorkflowDecision`:

```python
from pydantic import BaseModel, Field
from typing import Literal, Dict, Any

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
        # Validate input with the model
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

### 3. Database Schema (`backend/app/models.py`)
* **Session**:
  - `id` (string/UUID, Primary Key)
  - `status` (string: 'active' or 'completed')
  - `workflow_name` (string)
  - `extracted_fields` (JSON/Dictionary)
  - `created_at` (datetime)
  - `updated_at` (datetime)
* **Message**:
  - `id` (integer, Primary Key)
  - `session_id` (string, Foreign Key)
  - `role` (string: 'user' or 'assistant')
  - `content` (text)
  - `timestamp` (datetime)
* **AuditLog**:
  - `id` (integer, Primary Key)
  - `session_id` (string, Foreign Key)
  - `workflow_name` (text)
  - `extracted_fields` (JSON/Dictionary)
  - `decision` (string: 'Approved', 'Rejected', or 'Needs More Info')
  - `rationale` (text)
  - `final_response` (text)
  - `timestamp` (datetime)

---

## API Endpoints

* **`GET /api/workflows`**:
  Returns metadata for all available workflows (names, fields, and field display configurations for form rendering).
* **`GET /api/sessions`**:
  Lists all past and active sessions (for the UI sidebar).
* **`POST /api/sessions`**:
  Creates a new session with initial form values.
  - Request: `{ "workflow_name": "Vendor Approval", "form_values": { "vendor_name": "Acme", ... } }`
  - Response: Creates the session, runs the engine step, and returns the current session state and the assistant's first response.
* **`GET /api/sessions/{session_id}`**:
  Returns the complete conversation history, extracted fields, and audit log (if completed).
* **`POST /api/sessions/{session_id}/messages`**:
  Appends a user response in the chat thread.
  - Request: `{ "message": "Yes, we support SSO." }`
  - Response: Extracts fields, updates session, and returns the next assistant message or final decision.

---

## OpenAI Prompting Strategy

We will use OpenAI API chat completion with structured/JSON output constraints to perform extraction and generation:

1. **Field Extractor**:
   - **System Prompt**: Instructions containing the list of required fields, current values, and formatting rules.
   - **Inputs**: Workflow schema, current extracted fields, and the conversation history.
   - **Output**: JSON object mapping field names to extracted values (only values that can be confidently inferred; otherwise null/empty).
2. **Follow-up Generator**:
   - **System Prompt**: Act as a friendly security team assistant. Look at the missing fields and the conversation history. Ask one conversational, clear question to retrieve the value of one missing field. Do not ask for multiple fields at once.
   - **Inputs**: Missing field name, context of the workflow, and conversation history.
   - **Output**: Plain text response.
3. **Final Response Generator**:
   - **System Prompt**: Act as a friendly security team assistant. Write a polite, final notification response to the user presenting the decision (Approved or Rejected) and the security rationale.
   - **Inputs**: Decision, Rationale, and user context.
   - **Output**: Plain text response.

---

## Frontend Architecture

We will build the interface as a single-page React app:
- **`App.jsx`**: Manages selected session ID, active workflow form values, and sidebar list state.
- **`SessionSidebar`**: Displays list of sessions grouped by active vs. finalized.
- **`FormView / ChatView`**:
  - If starting a new session: Displays dropdown of workflows, which renders form fields dynamically based on fields fetched from `/api/workflows`.
  - If a session is active and has missing fields: Displays the scrollable `ChatWindow` showing the back-and-forth messages, with a `ChatInput` at the bottom.
  - If a session is completed: Displays the full chat history, a styled `DecisionBanner` at the top showing the status (Approved / Rejected) and rationale, and disables the chat input.

---

## Verification & Testing Plan

We will enforce Test-Driven Development (TDD) using `pytest`.

### Unit Tests
- `test_workflows.py`: Validates the `Vendor Approval` logic (`evaluate_decision`) with various inputs.
- `test_database.py`: Validates session creation, updating fields, and reading/writing audit logs.

### Integration Tests
- `test_engine.py`: Runs end-to-end integration tests mocking OpenAI API calls (using `unittest.mock` to mock `openai.resources.chat.completions.create`) to ensure that:
  - Submitting a complete form immediately transitions to Approved or Rejected and writes an audit log.
  - Submitting an incomplete form sets status to active and triggers a follow-up.
  - Chatting with the assistant successfully extracts the fields and eventually concludes the session.
