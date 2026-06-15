# Design Spec: Frontend UI for Security Workflow Assistant

This document details the frontend implementation spec for the Security Workflow Assistant UI.

## Components & File Structure

We will create a Vite-based React project inside the `frontend/` directory:

```text
frontend/
├── src/
│   ├── components/
│   │   ├── SessionSidebar.jsx   # Sidebar listing previous and active sessions
│   │   ├── MainBubble.jsx       # The main centered bubble container
│   │   ├── WorkflowForm.jsx     # Dynamic form generator based on API schemas
│   │   └── ChatWindow.jsx       # Chat messaging and decision display
│   ├── App.jsx                  # Root state orchestration and theme provider
│   ├── index.css                # Global base styles/reset
│   └── main.jsx                 # Application entry point
├── package.json                 # Project dependencies
└── vite.config.js               # Proxy setup to redirect /api requests to FastAPI
```

---

## Component Specifications

### 1. Theme Configuration & Styled Components
We will use `styled-components` to implement the theme context.

```javascript
export const lightTheme = {
  colors: {
    background: '#f8f9fa',
    paper: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    border: '#e2e8f0',
    success: '#10b981',
    successBg: '#ecfdf5',
    error: '#ef4444',
    errorBg: '#fef2f2',
    chatUser: '#eff6ff',
    chatAssistant: '#f1f5f9'
  },
  shadows: {
    bubble: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
  }
};
```

### 2. State Orchestration (`App.jsx`)
`App.jsx` will coordinate the following states:
*   `sessions`: List of all sessions.
*   `currentSessionId`: The currently active session ID.
*   `workflows`: The supported workflows fetched from the API.
*   `activeWorkflow`: The workflow selected when starting a new session.

### 3. Session Sidebar (`SessionSidebar.jsx`)
*   Provides a "New Request" button that resets the current session ID to `null` to show the workflow selection/form view.
*   Displays a list of past and active sessions, grouped into:
    *   **Active Requests** (sessions where `status` is 'active')
    *   **Completed Requests** (sessions where `status` is 'completed')

### 4. Main Bubble Container (`MainBubble.jsx`)
*   A centered container (`max-width: 600px`, `width: 100%`) styled as a rounded card.
*   Displays either:
    *   `WorkflowForm`: If `currentSessionId` is `null` (rendering the dropdown + form).
    *   `ChatWindow`: If `currentSessionId` is active/completed (rendering chat history, decision banner, and user input).

### 5. Dynamic Workflow Form (`WorkflowForm.jsx`)
*   Fetches workflows from `/api/workflows` on mount.
*   Shows a select dropdown to choose a workflow.
*   Upon selecting a workflow, dynamically renders input fields based on the workflow's Pydantic/JSON schema:
    *   `string`: Standard text input.
    *   `Literal`/enum: Select dropdown mapping option strings.
*   "Submit Request" triggers `POST /api/sessions` with the initial form values.

### 6. Chat Window (`ChatWindow.jsx`)
*   Shows a scrollable message list for the current session.
*   Displays a **Decision Banner** if the session is completed:
    *   Green banner for "Approved" decision.
    *   Red banner for "Rejected" decision.
*   Provides a chat input bar at the bottom, which is hidden/disabled if the session status is completed.

---

## Verification & Testing Plan
*   **Testing Tool**: We will use Vitest and React Testing Library for testing the React components.
*   **Component Tests**:
    *   `App.test.jsx`: Verifies layout, theme application, and API loading states.
    *   `WorkflowForm.test.jsx`: Mocks workflow list and verifies dynamic form fields load and submit.
    *   `ChatWindow.test.jsx`: Verifies messages render and decision banner shows upon completion.
