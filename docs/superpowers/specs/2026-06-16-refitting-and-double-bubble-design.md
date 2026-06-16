# Spec: Request Refitting, Double-Bubble Layout, and Routing

## Goal
Enable users to view their original request settings side-by-side with the assistant chat in a double-bubble layout. When a request is active, the settings form is disabled/read-only with missing fields highlighted. When a request is rejected, the settings form becomes editable, allowing the user to modify the inputs and submit a "Refit" request. This new request links back to the original rejected request. We also implement hash-based URL routing for sharing and navigation.

## Proposed Changes

### Backend

#### [MODIFY] [models.py](file:///Users/matan/projects/Treat/backend/app/models.py)
* Add a nullable `refitted_from = Column(String, nullable=True)` to the `Session` model.

#### [MODIFY] [main.py](file:///Users/matan/projects/Treat/backend/app/main.py)
* Update `SessionCreate` Pydantic model to include `refitted_from: Optional[str] = None`.
* Save `refitted_from` in `create_session` (`POST /api/sessions`).
* Return `refitted_from` in session detail responses.

#### [MODIFY] [engine.py](file:///Users/matan/projects/Treat/backend/app/engine.py)
* Accept `refitted_from` in `start_session` and store it.

#### [MODIFY] [openai_client.py](file:///Users/matan/projects/Treat/backend/app/openai_client.py)
* Refactor prompts in `generate_follow_up` and `generate_final_response` to mandate concise, direct responses.

---

### Frontend

#### [MODIFY] [App.jsx](file:///Users/matan/projects/Treat/frontend/src/App.jsx)
* Add hash-routing listener (`hashchange`) and synchronize `currentSessionId` with the URL hash `#/session/{id}`.
* When a session is selected, render a side-by-side layout:
  * **Left Bubble**: [WorkflowForm.jsx](file:///Users/matan/projects/Treat/frontend/src/components/WorkflowForm.jsx) (the main form) with session values and active/disabled styles.
  * **Right Bubble**: [ChatWindow.jsx](file:///Users/matan/projects/Treat/frontend/src/components/ChatWindow.jsx) (the chat window) positioned directly next to the main form bubble.

#### [MODIFY] [WorkflowForm.jsx](file:///Users/matan/projects/Treat/frontend/src/components/WorkflowForm.jsx)
* Accept `session` prop. If `session` is passed:
  * Populate form values with `session.extracted_fields`.
  * If the session is `active`, disable form controls and highlight any fields not in `session.extracted_fields` with a highlighted border and badge.
  * If the session is `completed` with status `Rejected`, keep form controls enabled so they can be modified, and change submit button text to "Refit Request".

#### [MODIFY] [ChatWindow.jsx](file:///Users/matan/projects/Treat/frontend/src/components/ChatWindow.jsx)
* Render a link to the parent request at the top of the chat list if `session.refitted_from` is set.

#### [MODIFY] [SessionSidebar.jsx](file:///Users/matan/projects/Treat/frontend/src/components/SessionSidebar.jsx)
* Style list items with color markers or text styling: green for Approved requests, red for Rejected requests, orange for Needs More Info.

---

## Verification Plan

### Automated Tests
* Run `npm run test --prefix frontend` to run Vitest tests.
* Update App and component unit tests to verify double bubble rendering, hash changes, missing field highlighting, and refitting.
* Run backend tests via `pytest` to ensure database changes don't break session serialization.
