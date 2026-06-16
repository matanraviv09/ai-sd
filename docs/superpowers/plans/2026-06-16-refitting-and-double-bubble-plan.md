# Request Refitting, Double-Bubble Layout, and Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a double-bubble side-by-side UI layout (Form next to Chat), add visual styling for missing fields in the form, enable request refitting on rejection (creating a new session linked to the original), add color-coding to sidebar status lists, and enforce concise AI responses and hash-based URL routing.

**Architecture:** Extend the backend SQLite schema and endpoints with `refitted_from`. Refactor the React `App.jsx` component layout to render the form and chat bubbles side-by-side. Update component-level properties, styles, and event triggers, and update prompt strings in `openai_client.py`.

**Tech Stack:** React, Styled Components, Vitest, Python, FastAPI, SQLAlchemy, SQLite.

---

### Task 1: Backend Schema Migration
**Files:**
* Modify: [models.py](file:///Users/matan/projects/Treat/backend/app/models.py)
* Test: [test_api.py](file:///Users/matan/projects/Treat/backend/backend/tests/test_api.py)

- [ ] **Step 1: Update SQLite Schema in models.py**
  Add `refitted_from` column to `Session` in `backend/app/models.py`:
  ```python
  refitted_from = Column(String, ForeignKey("sessions.id"), nullable=True)
  ```

- [ ] **Step 2: Run tests to verify they pass**
  Run: `pytest backend/backend/tests/test_api.py -v`
  Expected: PASS (as tables are auto-created on startup, adding a column with default/nullable properties is safe).

- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add backend/app/models.py
  git commit -m "db: add refitted_from column to sessions table"
  ```

---

### Task 2: Backend API and Engine Integration
**Files:**
* Modify: [main.py](file:///Users/matan/projects/Treat/backend/app/main.py)
* Modify: [engine.py](file:///Users/matan/projects/Treat/backend/app/engine.py)
* Modify: [test_api.py](file:///Users/matan/projects/Treat/backend/backend/tests/test_api.py)

- [ ] **Step 1: Update Pydantic models and serialization in main.py**
  Modify `SessionCreate` and get/session serialization in `backend/app/main.py`:
  ```python
  class SessionCreate(BaseModel):
      workflow_name: str
      form_values: Dict[str, Any]
      refitted_from: Optional[str] = None
  ```
  And in `get_sessions`:
  ```python
  return [{
      "id": s.id,
      "status": s.status,
      "workflow_name": s.workflow_name,
      "extracted_fields": s.extracted_fields,
      "updated_at": s.updated_at,
      "refitted_from": s.refitted_from
  } for s in sessions]
  ```
  And in `get_session`:
  ```python
  return {
      "id": session.id,
      "status": session.status,
      "workflow_name": session.workflow_name,
      "extracted_fields": session.extracted_fields,
      "refitted_from": session.refitted_from,
      "messages": [{"role": m.role, "content": m.content, "timestamp": m.timestamp} for m in messages],
      "audit_log": ...
  }
  ```

- [ ] **Step 2: Update start_session signature and implementation in engine.py**
  Modify `start_session` in `backend/app/engine.py`:
  ```python
  def start_session(self, db: DBSession, workflow_name: str, initial_fields: Dict[str, Any], refitted_from: Optional[str] = None) -> tuple[str, str]:
      # ...
      session = SessionModel(
          id=session_id,
          status="active",
          workflow_name=workflow_name,
          extracted_fields=cleaned_fields,
          refitted_from=refitted_from
      )
  ```

- [ ] **Step 3: Update POST /api/sessions endpoint in main.py**
  Update `create_session` in `backend/app/main.py`:
  ```python
  session_id, assistant_reply = engine_instance.start_session(
      db=db,
      workflow_name=payload.workflow_name,
      initial_fields=payload.form_values,
      refitted_from=payload.refitted_from
  )
  ```

- [ ] **Step 4: Write API test for refitted_from parameter**
  Add a test to `backend/backend/tests/test_api.py` verifying that passing `refitted_from` stores it and returns it.
  ```python
  def test_create_session_with_refitted_from(client, db_session):
      # Create rejected session first
      # Create refitted session linking back to it
      # Assert refitted_from is returned in get details
  ```

- [ ] **Step 5: Run tests**
  Run: `pytest backend/backend/tests/test_api.py -v`
  Expected: PASS

- [ ] **Step 6: Commit changes**
  Run:
  ```bash
  git add backend/app/main.py backend/app/engine.py backend/backend/tests/test_api.py
  git commit -m "feat: support refitted_from parameter in backend API and session creation"
  ```

---

### Task 3: AI Prompts Shortening
**Files:**
* Modify: [openai_client.py](file:///Users/matan/projects/Treat/backend/app/openai_client.py)

- [ ] **Step 1: Modify generate_follow_up system prompt**
  Update prompt in `backend/app/openai_client.py`'s `generate_follow_up`:
  ```python
  system_prompt = (
      f"You are a security team assistant. The field '{missing_field}' ({field_description}) is missing.\n"
      f"Ask one extremely short, direct question to gather ONLY this missing field. Do not include greetings or polite filler text."
  )
  ```

- [ ] **Step 2: Modify generate_final_response system prompt**
  Update prompt in `backend/app/openai_client.py`'s `generate_final_response`:
  ```python
  system_prompt = (
      f"You are a security assistant. A request under workflow '{workflow_name}' has been evaluated.\n"
      f"Status: {status}\n"
      f"Rationale: {rationale}\n\n"
      f"Write a very concise, direct response stating the final decision and highlighting exactly what went wrong or succeeded. Keep it under 2 sentences."
  )
  ```

- [ ] **Step 3: Run backend test suite**
  Run: `pytest backend/backend/tests/ -v`
  Expected: PASS

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add backend/app/openai_client.py
  git commit -m "refactor: shorten AI prompts to keep response direct and concise"
  ```

---

### Task 4: Frontend Sidebar Color Coding
**Files:**
* Modify: [SessionSidebar.jsx](file:///Users/matan/projects/Treat/frontend/src/components/SessionSidebar.jsx)
* Modify: [SessionSidebar.test.jsx](file:///Users/matan/projects/Treat/frontend/src/components/SessionSidebar.test.jsx)

- [ ] **Step 1: Get Audit Log/Decision info in Session list items**
  To style sidebar items based on decision, the frontend needs to know the decision status. Let's make sure `GET /api/sessions` lists `audit_log` decision if available. Wait, does `/api/sessions` include the decision?
  Let's add `decision` to the returned session list item in `main.py`'s `get_sessions`:
  ```python
  # In main.py
  audit_log = db.query(AuditLogModel).filter_by(session_id=s.id).first()
  # Include s.decision or fetch it
  ```
  Wait! Let's modify `get_sessions` in `main.py`:
  ```python
  @app.get("/api/sessions")
  def get_sessions(db: Session = Depends(get_db)):
      sessions = db.query(SessionModel).order_by(SessionModel.updated_at.desc()).all()
      result = []
      for s in sessions:
          audit_log = db.query(AuditLogModel).filter_by(session_id=s.id).first()
          result.append({
              "id": s.id,
              "status": s.status,
              "workflow_name": s.workflow_name,
              "extracted_fields": s.extracted_fields,
              "updated_at": s.updated_at,
              "refitted_from": s.refitted_from,
              "decision": audit_log.decision if audit_log else None
          })
      return result
  ```

- [ ] **Step 2: Update Sidebar component items**
  In `frontend/src/components/SessionSidebar.jsx`, style `SessionItem` based on `$decision` or `$status`:
  ```javascript
  const SessionItem = styled.div`
    // ... existing ...
    border-left: 4px solid ${props => 
      props.$decision === 'Approved' ? props.theme.colors.success :
      props.$decision === 'Rejected' ? props.theme.colors.error :
      'transparent'
    };
    color: ${props => 
      props.$decision === 'Approved' ? props.theme.colors.success :
      props.$decision === 'Rejected' ? props.theme.colors.error :
      props.$active ? props.theme.colors.primary : props.theme.colors.textPrimary
    };
  `;
  ```

- [ ] **Step 3: Update Sidebar Unit Tests**
  Add mock session decision inputs to `frontend/src/components/SessionSidebar.test.jsx` and assert classes/styles.

- [ ] **Step 4: Run Sidebar tests**
  Run: `npx vitest run frontend/src/components/SessionSidebar.test.jsx`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add backend/app/main.py frontend/src/components/SessionSidebar.jsx frontend/src/components/SessionSidebar.test.jsx
  git commit -m "feat: color code sidebar requests by decision (green for Approved, red for Rejected)"
  ```

---

### Task 5: Double-Bubble Layout and Hash Routing
**Files:**
* Modify: [App.jsx](file:///Users/matan/projects/Treat/frontend/src/App.jsx)
* Modify: [App.test.jsx](file:///Users/matan/projects/Treat/frontend/src/App.test.jsx)

- [ ] **Step 1: Refactor App.jsx state to support routing**
  Update `App.jsx` to synchronize `currentSessionId` state with `window.location.hash`:
  ```javascript
  useEffect(() => {
    const handleHashChange = () => {
      const match = window.location.hash.match(/^#\/session\/(.+)$/);
      if (match) {
        setCurrentSessionId(match[1]);
      } else {
        setCurrentSessionId(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // initial load check
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectSession = (id) => {
    window.location.hash = `#/session/${id}`;
  };

  const handleNewSession = () => {
    window.location.hash = '';
  };
  ```

- [ ] **Step 2: Update App.jsx Layout rendering**
  Refactor `App.jsx` main container to render Form and Chat side-by-side when a session is active/completed:
  ```javascript
  // AppContainer flex layout:
  // Render Left Bubble (WorkflowForm) and Right Bubble (ChatWindow) if activeSession exists.
  ```

- [ ] **Step 3: Support Refitting POST callback in App.jsx**
  Update `handleCreateSession` to accept `refitted_from` and pass it to the API.

- [ ] **Step 4: Update App tests to support routing and side-by-side assertions**
  Update integration tests in `frontend/src/App.test.jsx` to stub hashes and check for multiple bubble rendering.

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add frontend/src/App.jsx frontend/src/App.test.jsx
  git commit -m "feat: implement double-bubble layout and hash routing in App component"
  ```

---

### Task 6: Interactive Form and Missing Field Highlighting
**Files:**
* Modify: [WorkflowForm.jsx](file:///Users/matan/projects/Treat/frontend/src/components/WorkflowForm.jsx)
* Modify: [WorkflowForm.test.jsx](file:///Users/matan/projects/Treat/frontend/src/components/WorkflowForm.test.jsx)

- [ ] **Step 1: Add session fields and disabled/missing highlighting logic**
  Update `WorkflowForm.jsx` to accept `session` prop. If `session` is passed, populate inputs from `session.extracted_fields` and disable form when `session.status === 'active'`. Highlight fields that are missing in the active session's extracted fields.
  ```javascript
  // If session is completed/Rejected, enable editing.
  // Style missing fields with red/orange border and label.
  ```

- [ ] **Step 2: Submit handler for Refit Request**
  Update the submit button text to "Refit Request" if the session was rejected. Trigger `onSubmit` with `selectedWorkflow`, updated `formData`, and `session.id` as `refitted_from`.

- [ ] **Step 3: Update WorkflowForm tests**
  Add unit tests in `WorkflowForm.test.jsx` for missing field borders, disabled controls, and Refit submission.

- [ ] **Step 4: Run form tests**
  Run: `npx vitest run frontend/src/components/WorkflowForm.test.jsx`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add frontend/src/components/WorkflowForm.jsx frontend/src/components/WorkflowForm.test.jsx
  git commit -m "feat: add missing field highlighting, form disabled states, and refit request action"
  ```

---

### Task 7: Refitted From Link in ChatWindow
**Files:**
* Modify: [ChatWindow.jsx](file:///Users/matan/projects/Treat/frontend/src/components/ChatWindow.jsx)
* Modify: [ChatWindow.test.jsx](file:///Users/matan/projects/Treat/frontend/src/components/ChatWindow.test.jsx)

- [ ] **Step 1: Render link to original request**
  Add a banner/link at the top of the chat area in `ChatWindow.jsx` if `session.refitted_from` is populated:
  ```javascript
  // Render: "Refitted from request #ID" linking to "#/session/ID"
  ```

- [ ] **Step 2: Update ChatWindow unit tests**
  Update `ChatWindow.test.jsx` to verify the link is rendered correctly.

- [ ] **Step 3: Run all frontend tests**
  Run: `npm run test --prefix frontend`
  Expected: All 15+ tests PASS.

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add frontend/src/components/ChatWindow.jsx frontend/src/components/ChatWindow.test.jsx
  git commit -m "feat: render link to original rejected request in ChatWindow"
  ```
