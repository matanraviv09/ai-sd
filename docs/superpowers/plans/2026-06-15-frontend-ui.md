# Frontend UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a clean, small, centered, and bubbled React frontend UI for the Security Workflow Assistant that supports selecting workflows, dynamic form submission, session history, and back-and-forth chat.

**Architecture:** A single-page React application using Vite. Components are styled exclusively with Styled Components. A custom API client coordinates endpoints, rendering state is managed locally at the App level, and Vitest is used for testing.

**Tech Stack:** React, Vite, Styled Components, Vitest, React Testing Library.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/main.jsx`
- Create: `frontend/index.html`

- [ ] **Step 1: Create package.json**
  Write a clean npm config with react, styled-components, vitest, and testing library.
  
  File: `frontend/package.json`
  ```json
  {
    "name": "treat-frontend",
    "private": true,
    "version": "0.1.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "test": "vitest run",
      "test:watch": "vitest"
    },
    "dependencies": {
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "styled-components": "^6.1.11"
    },
    "devDependencies": {
      "@testing-library/jest-dom": "^6.4.6",
      "@testing-library/react": "^16.0.0",
      "@vitejs/plugin-react": "^4.3.1",
      "jsdom": "^24.1.0",
      "vite": "^5.3.1",
      "vitest": "^1.6.0"
    }
  }
  ```

- [ ] **Step 2: Run npm install**
  Run: `npm install --prefix frontend`
  Expected: Successful installation of dependencies.

- [ ] **Step 3: Create vite.config.js**
  Write the Vite configuration including the `/api` proxy.
  
  File: `frontend/vite.config.js`
  ```javascript
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true
        }
      }
    }
  });
  ```

- [ ] **Step 4: Create vitest.config.js**
  Write the Vitest configuration using jsdom.
  
  File: `frontend/vitest.config.js`
  ```javascript
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js'
    }
  });
  ```

- [ ] **Step 5: Create Vitest Setup File**
  File: `frontend/src/test/setup.js`
  ```javascript
  import '@testing-library/jest-dom';
  ```

- [ ] **Step 6: Create index.html**
  File: `frontend/index.html`
  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Security Workflow Assistant</title>
    </head>
    <body style="margin: 0; padding: 0;">
      <div id="root"></div>
      <script type="module" src="/src/main.jsx"></script>
    </body>
  </html>
  ```

- [ ] **Step 7: Create main.jsx**
  File: `frontend/src/main.jsx`
  ```javascript
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App.jsx';
  import './index.css';

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  ```

- [ ] **Step 8: Commit Scaffolding**
  Run: `git add frontend/package.json frontend/vite.config.js frontend/vitest.config.js frontend/index.html frontend/src/main.jsx frontend/src/test/setup.js`
  Run: `git commit -m "feat: scaffold frontend project structure"`

---

### Task 2: Theme Setup and Global Styles

**Files:**
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/App.test.jsx`

- [ ] **Step 1: Write index.css**
  Reset margins, paddings, and set up modern typography.
  
  File: `frontend/src/index.css`
  ```css
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: #f8f9fa;
    color: #1e293b;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ```

- [ ] **Step 2: Create App.jsx with ThemeProvider**
  Setup Styled Components ThemeProvider and base layout grid.
  
  File: `frontend/src/App.jsx`
  ```javascript
  import React, { useState } from 'react';
  import styled, { ThemeProvider } from 'styled-components';

  export const theme = {
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

  const AppContainer = styled.div`
    display: flex;
    height: 100vh;
    width: 100vw;
    background-color: ${props => props.theme.colors.background};
  `;

  export default function App() {
    return (
      <ThemeProvider theme={theme}>
        <AppContainer data-testid="app-container">
          <div style={{ padding: '20px' }}>Security Workflow Assistant</div>
        </AppContainer>
      </ThemeProvider>
    );
  }
  ```

- [ ] **Step 3: Create App Smoke Test**
  Write a test to ensure App renders correctly within ThemeProvider.
  
  File: `frontend/src/App.test.jsx`
  ```javascript
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import App from './App.jsx';

  describe('App Smoke Test', () => {
    it('renders the App container', () => {
      render(<App />);
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run --prefix frontend test`
  Expected: PASS

- [ ] **Step 5: Commit Theme Setup**
  Run: `git add frontend/src/index.css frontend/src/App.jsx frontend/src/App.test.jsx`
  Run: `git commit -m "feat: add light theme and app shell container"`

---

### Task 3: Sidebar Component

**Files:**
- Create: `frontend/src/components/SessionSidebar.jsx`
- Create: `frontend/src/components/SessionSidebar.test.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create SessionSidebar.jsx**
  Implement the session sidebar containing the "New Request" button and grouped session lists.
  
  File: `frontend/src/components/SessionSidebar.jsx`
  ```javascript
  import React from 'react';
  import styled from 'styled-components';

  const SidebarContainer = styled.aside`
    width: 280px;
    border-right: 1px solid ${props => props.theme.colors.border};
    background-color: ${props => props.theme.colors.paper};
    display: flex;
    flex-direction: column;
    height: 100%;
  `;

  const Header = styled.div`
    padding: 20px;
    border-bottom: 1px solid ${props => props.theme.colors.border};
  `;

  const NewButton = styled.button`
    width: 100%;
    padding: 10px 16px;
    background-color: ${props => props.theme.colors.primary};
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: ${props => props.theme.colors.primaryHover};
    }
  `;

  const ScrollableList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  `;

  const SectionTitle = styled.h3`
    font-size: 12px;
    text-transform: uppercase;
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: 10px;
    margin-top: 20px;
    &:first-of-type {
      margin-top: 0;
    }
  `;

  const SessionItem = styled.div`
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    margin-bottom: 4px;
    background-color: ${props => props.active ? props.theme.colors.chatUser : 'transparent'};
    color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.textPrimary};
    font-weight: ${props => props.active ? '600' : 'normal'};

    &:hover {
      background-color: ${props => props.active ? props.theme.colors.chatUser : props.theme.colors.chatAssistant};
    }
  `;

  export default function SessionSidebar({ sessions, currentSessionId, onSelectSession, onNewSession }) {
    const activeSessions = sessions.filter(s => s.status === 'active');
    const completedSessions = sessions.filter(s => s.status === 'completed');

    return (
      <SidebarContainer>
        <Header>
          <NewButton onClick={onNewSession}>New Request</NewButton>
        </Header>
        <ScrollableList>
          <SectionTitle>Active Requests</SectionTitle>
          {activeSessions.map(session => (
            <SessionItem
              key={session.id}
              active={session.id === currentSessionId}
              onClick={() => onSelectSession(session.id)}
            >
              {session.workflow_name} ({session.id.substring(0, 6)})
            </SessionItem>
          ))}
          {activeSessions.length === 0 && <div style={{ fontSize: '12px', color: '#94a3b8' }}>None</div>}

          <SectionTitle>Completed Requests</SectionTitle>
          {completedSessions.map(session => (
            <SessionItem
              key={session.id}
              active={session.id === currentSessionId}
              onClick={() => onSelectSession(session.id)}
            >
              {session.workflow_name} ({session.id.substring(0, 6)})
            </SessionItem>
          ))}
          {completedSessions.length === 0 && <div style={{ fontSize: '12px', color: '#94a3b8' }}>None</div>}
        </ScrollableList>
      </SidebarContainer>
    );
  }
  ```

- [ ] **Step 2: Create SessionSidebar Tests**
  File: `frontend/src/components/SessionSidebar.test.jsx`
  ```javascript
  import React from 'react';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { ThemeProvider } from 'styled-components';
  import { theme } from '../App.jsx';
  import SessionSidebar from './SessionSidebar.jsx';

  const mockSessions = [
    { id: '12345678', workflow_name: 'Vendor Approval', status: 'active' },
    { id: '87654321', workflow_name: 'Vendor Approval', status: 'completed' }
  ];

  const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

  describe('SessionSidebar', () => {
    it('renders the session categories and list items', () => {
      renderWithTheme(
        <SessionSidebar
          sessions={mockSessions}
          currentSessionId="12345678"
          onSelectSession={() => {}}
          onNewSession={() => {}}
        />
      );
      expect(screen.getByText('Active Requests')).toBeInTheDocument();
      expect(screen.getByText('Completed Requests')).toBeInTheDocument();
      expect(screen.getByText('Vendor Approval (123456)')).toBeInTheDocument();
    });

    it('triggers callbacks on select and new button clicks', () => {
      const onSelectSession = vi.fn();
      const onNewSession = vi.fn();

      renderWithTheme(
        <SessionSidebar
          sessions={mockSessions}
          currentSessionId="12345678"
          onSelectSession={onSelectSession}
          onNewSession={onNewSession}
        />
      );

      fireEvent.click(screen.getByText('New Request'));
      expect(onNewSession).toHaveBeenCalled();

      fireEvent.click(screen.getByText('Vendor Approval (876543)'));
      expect(onSelectSession).toHaveBeenCalledWith('87654321');
    });
  });
  ```

- [ ] **Step 3: Run Vitest to check tests**
  Run: `npm run --prefix frontend test`
  Expected: PASS

- [ ] **Step 4: Update App.jsx to embed the sidebar**
  File: `frontend/src/App.jsx`
  ```javascript
  import React, { useState } from 'react';
  import styled, { ThemeProvider } from 'styled-components';
  import SessionSidebar from './components/SessionSidebar.jsx';

  export const theme = {
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

  const AppContainer = styled.div`
    display: flex;
    height: 100vh;
    width: 100vw;
    background-color: ${props => props.theme.colors.background};
  `;

  const MainContent = styled.main`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  export default function App() {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const handleSelectSession = (id) => {
      setCurrentSessionId(id);
    };

    const handleNewSession = () => {
      setCurrentSessionId(null);
    };

    return (
      <ThemeProvider theme={theme}>
        <AppContainer data-testid="app-container">
          <SessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
          />
          <MainContent>
            {currentSessionId ? 'Active Session' : 'Create New Request'}
          </MainContent>
        </AppContainer>
      </ThemeProvider>
    );
  }
  ```

- [ ] **Step 5: Run tests and commit**
  Run: `npm run --prefix frontend test`
  Expected: PASS
  Run: `git add frontend/src/components/SessionSidebar.jsx frontend/src/components/SessionSidebar.test.jsx frontend/src/App.jsx`
  Run: `git commit -m "feat: implement and verify SessionSidebar component"`

---

### Task 4: Dynamic Workflow Form Component

**Files:**
- Create: `frontend/src/components/WorkflowForm.jsx`
- Create: `frontend/src/components/WorkflowForm.test.jsx`

- [ ] **Step 1: Create WorkflowForm.jsx**
  Implement dynamic field generator from `/api/workflows` configuration.
  
  File: `frontend/src/components/WorkflowForm.jsx`
  ```javascript
  import React, { useState, useEffect } from 'react';
  import styled from 'styled-components';

  const FormContainer = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `;

  const Title = styled.h2`
    font-size: 18px;
    font-weight: 600;
    color: ${props => props.theme.colors.textPrimary};
  `;

  const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `;

  const Label = styled.label`
    font-size: 14px;
    font-weight: 500;
    color: ${props => props.theme.colors.textPrimary};
  `;

  const Select = styled.select`
    padding: 10px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 8px;
    background-color: white;
    font-size: 14px;
    color: ${props => props.theme.colors.textPrimary};
  `;

  const Input = styled.input`
    padding: 10px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 8px;
    font-size: 14px;
    color: ${props => props.theme.colors.textPrimary};
  `;

  const Description = styled.span`
    font-size: 12px;
    color: ${props => props.theme.colors.textSecondary};
  `;

  const SubmitButton = styled.button`
    padding: 12px;
    background-color: ${props => props.theme.colors.primary};
    color: white;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 10px;

    &:hover {
      background-color: ${props => props.theme.colors.primaryHover};
    }
  `;

  export default function WorkflowForm({ workflows, onSubmit }) {
    const [selectedWorkflow, setSelectedWorkflow] = useState('');
    const [formData, setFormData] = useState({});

    useEffect(() => {
      if (workflows && workflows.length > 0) {
        setSelectedWorkflow(workflows[0].name);
      }
    }, [workflows]);

    const activeWorkflow = workflows.find(w => w.name === selectedWorkflow);

    const handleFieldChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(selectedWorkflow, formData);
    };

    if (!workflows || workflows.length === 0) {
      return <div>Loading workflows...</div>;
    }

    return (
      <form onSubmit={handleSubmit}>
        <FormContainer>
          <Title>New Security Request</Title>
          <FormGroup>
            <Label>Select Workflow</Label>
            <Select
              value={selectedWorkflow}
              onChange={e => {
                setSelectedWorkflow(e.target.value);
                setFormData({});
              }}
            >
              {workflows.map(w => (
                <option key={w.name} value={w.name}>{w.name}</option>
              ))}
            </Select>
          </FormGroup>

          {activeWorkflow && activeWorkflow.fields.map(field => {
            const isLiteral = field.options && field.options.length > 0;
            return (
              <FormGroup key={field.name}>
                <Label>{field.label || field.name}</Label>
                {isLiteral ? (
                  <Select
                    value={formData[field.name] || ''}
                    onChange={e => handleFieldChange(field.name, e.target.value)}
                  >
                    <option value="">-- Choose option (Optional) --</option>
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type="text"
                    value={formData[field.name] || ''}
                    placeholder={`Enter ${field.name}...`}
                    onChange={e => handleFieldChange(field.name, e.target.value)}
                  />
                )}
                {field.description && <Description>{field.description}</Description>}
              </FormGroup>
            );
          })}

          <SubmitButton type="submit">Start Request</SubmitButton>
        </FormContainer>
      </form>
    );
  }
  ```

- [ ] **Step 2: Create WorkflowForm Tests**
  File: `frontend/src/components/WorkflowForm.test.jsx`
  ```javascript
  import React from 'react';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { ThemeProvider } from 'styled-components';
  import { theme } from '../App.jsx';
  import WorkflowForm from './WorkflowForm.jsx';

  const mockWorkflows = [
    {
      name: 'Vendor Approval',
      description: 'Vendor review',
      fields: [
        { name: 'vendor_name', description: 'Name of vendor', options: [] },
        { name: 'soc2_available', description: 'SOC2 status', options: ['yes', 'no'] }
      ]
    }
  ];

  const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

  describe('WorkflowForm', () => {
    it('renders selects and input fields dynamically', () => {
      renderWithTheme(<WorkflowForm workflows={mockWorkflows} onSubmit={() => {}} />);
      expect(screen.getByText('Select Workflow')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter vendor_name...')).toBeInTheDocument();
      expect(screen.getByText('-- Choose option (Optional) --')).toBeInTheDocument();
    });

    it('triggers onSubmit with input data', () => {
      const onSubmit = vi.fn();
      renderWithTheme(<WorkflowForm workflows={mockWorkflows} onSubmit={onSubmit} />);

      fireEvent.change(screen.getByPlaceholderText('Enter vendor_name...'), { target: { value: 'Acme Corp' } });
      fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'yes' } });

      fireEvent.click(screen.getByRole('button', { name: 'Start Request' }));

      expect(onSubmit).toHaveBeenCalledWith('Vendor Approval', {
        vendor_name: 'Acme Corp',
        soc2_available: 'yes'
      });
    });
  });
  ```

- [ ] **Step 3: Run Vitest to check tests**
  Run: `npm run --prefix frontend test`
  Expected: PASS

- [ ] **Step 4: Commit WorkflowForm Component**
  Run: `git add frontend/src/components/WorkflowForm.jsx frontend/src/components/WorkflowForm.test.jsx`
  Run: `git commit -m "feat: implement and verify dynamic WorkflowForm"`

---

### Task 5: Chat Window and Decision Banner

**Files:**
- Create: `frontend/src/components/ChatWindow.jsx`
- Create: `frontend/src/components/ChatWindow.test.jsx`

- [ ] **Step 1: Create ChatWindow.jsx**
  Implement the chat message interface with scrollable window and conditional DecisionBanner.
  
  File: `frontend/src/components/ChatWindow.jsx`
  ```javascript
  import React, { useState, useRef, useEffect } from 'react';
  import styled from 'styled-components';

  const ChatContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  `;

  const Banner = styled.div`
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-weight: 500;
    font-size: 14px;
    line-height: 1.4;
    background-color: ${props => props.status === 'Approved' ? props.theme.colors.successBg : props.theme.colors.errorBg};
    color: ${props => props.status === 'Approved' ? props.theme.colors.success : props.theme.colors.error};
    border: 1px solid ${props => props.status === 'Approved' ? props.theme.colors.success : props.theme.colors.error};
  `;

  const MessageList = styled.div`
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 20px;
  `;

  const Bubble = styled.div`
    max-width: 80%;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
    align-self: ${props => props.role === 'user' ? 'flex-end' : 'flex-start'};
    background-color: ${props => props.role === 'user' ? props.theme.colors.chatUser : props.theme.colors.chatAssistant};
    color: ${props => props.theme.colors.textPrimary};
  `;

  const InputArea = styled.form`
    display: flex;
    gap: 8px;
    border-top: 1px solid ${props => props.theme.colors.border};
    padding-top: 16px;
  `;

  const Input = styled.input`
    flex: 1;
    padding: 12px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    &:focus {
      border-color: ${props => props.theme.colors.primary};
    }
  `;

  const SendButton = styled.button`
    padding: 12px 20px;
    background-color: ${props => props.theme.colors.primary};
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    &:hover {
      background-color: ${props => props.theme.colors.primaryHover};
    }
  `;

  export default function ChatWindow({ session, onSendMessage }) {
    const [input, setInput] = useState('');
    const listRef = useRef(null);

    const isCompleted = session.status === 'completed';

    useEffect(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, [session.messages]);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!input.trim()) return;
      onSendMessage(input);
      setInput('');
    };

    return (
      <ChatContainer>
        {isCompleted && session.decision && (
          <Banner status={session.decision.status} data-testid="decision-banner">
            <strong>{session.decision.status}</strong>: {session.decision.rationale}
          </Banner>
        )}
        
        <MessageList ref={listRef}>
          {session.messages.map((msg, i) => (
            <Bubble key={i} role={msg.role}>
              {msg.content}
            </Bubble>
          ))}
        </MessageList>

        {!isCompleted && (
          <InputArea onSubmit={handleSubmit}>
            <Input
              type="text"
              value={input}
              placeholder="Type your response..."
              onChange={e => setInput(e.target.value)}
              data-testid="chat-input"
            />
            <SendButton type="submit">Send</SendButton>
          </InputArea>
        )}
      </ChatContainer>
    );
  }
  ```

- [ ] **Step 2: Create ChatWindow Tests**
  File: `frontend/src/components/ChatWindow.test.jsx`
  ```javascript
  import React from 'react';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { ThemeProvider } from 'styled-components';
  import { theme } from '../App.jsx';
  import ChatWindow from './ChatWindow.jsx';

  const mockActiveSession = {
    id: 's1',
    status: 'active',
    messages: [
      { role: 'assistant', content: 'What is the vendor name?' },
      { role: 'user', content: 'Acme Corp' }
    ]
  };

  const mockCompletedSession = {
    id: 's2',
    status: 'completed',
    messages: [
      { role: 'assistant', content: 'Decision finalized.' }
    ],
    decision: {
      status: 'Approved',
      rationale: 'All clear.'
    }
  };

  const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

  describe('ChatWindow', () => {
    it('renders messages and handles input submission', () => {
      const onSendMessage = vi.fn();
      renderWithTheme(<ChatWindow session={mockActiveSession} onSendMessage={onSendMessage} />);

      expect(screen.getByText('What is the vendor name?')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();

      const input = screen.getByTestId('chat-input');
      fireEvent.change(input, { target: { value: 'Internal' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));

      expect(onSendMessage).toHaveBeenCalledWith('Internal');
    });

    it('renders DecisionBanner and hides input when completed', () => {
      renderWithTheme(<ChatWindow session={mockCompletedSession} onSendMessage={() => {}} />);

      expect(screen.getByTestId('decision-banner')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 3: Run Vitest to check tests**
  Run: `npm run --prefix frontend test`
  Expected: PASS

- [ ] **Step 4: Commit ChatWindow Component**
  Run: `git add frontend/src/components/ChatWindow.jsx frontend/src/components/ChatWindow.test.jsx`
  Run: `git commit -m "feat: implement and verify ChatWindow and DecisionBanner"`

---

### Task 6: MainBubble Container and Integration in App.jsx

**Files:**
- Create: `frontend/src/components/MainBubble.jsx`
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/components/MainBubble.test.jsx`
- Modify: `frontend/src/App.test.jsx`

- [ ] **Step 1: Create MainBubble.jsx**
  Design the centered bubble structure that holds the dynamic components.
  
  File: `frontend/src/components/MainBubble.jsx`
  ```javascript
  import React from 'react';
  import styled from 'styled-components';

  const BubbleCard = styled.div`
    width: 100%;
    max-width: 600px;
    height: 600px;
    background-color: ${props => props.theme.colors.paper};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 16px;
    box-shadow: ${props => props.theme.shadows.bubble};
    display: flex;
    flex-direction: column;
    padding: 24px;
    overflow: hidden;
  `;

  export default function MainBubble({ children }) {
    return (
      <BubbleCard data-testid="main-bubble">
        {children}
      </BubbleCard>
    );
  }
  ```

- [ ] **Step 2: Create MainBubble Tests**
  File: `frontend/src/components/MainBubble.test.jsx`
  ```javascript
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import { ThemeProvider } from 'styled-components';
  import { theme } from '../App.jsx';
  import MainBubble from './MainBubble.jsx';

  describe('MainBubble', () => {
    it('renders its children correctly inside styled bubble card', () => {
      render(
        <ThemeProvider theme={theme}>
          <MainBubble>
            <div data-testid="test-child">Child Element</div>
          </MainBubble>
        </ThemeProvider>
      );
      expect(screen.getByTestId('main-bubble')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 3: Integrate everything inside App.jsx**
  Rewrite `App.jsx` to load and bind API operations using `window.fetch`.
  
  File: `frontend/src/App.jsx`
  ```javascript
  import React, { useState, useEffect } from 'react';
  import styled, { ThemeProvider } from 'styled-components';
  import SessionSidebar from './components/SessionSidebar.jsx';
  import MainBubble from './components/MainBubble.jsx';
  import WorkflowForm from './components/WorkflowForm.jsx';
  import ChatWindow from './components/ChatWindow.jsx';

  export const theme = {
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

  const AppContainer = styled.div`
    display: flex;
    height: 100vh;
    width: 100vw;
    background-color: ${props => props.theme.colors.background};
  `;

  const MainContent = styled.main`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  export default function App() {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [workflows, setWorkflows] = useState([]);

    useEffect(() => {
      fetchWorkflows();
      fetchSessions();
    }, []);

    const fetchWorkflows = async () => {
      try {
        const res = await fetch('/api/workflows');
        const data = await res.json();
        setWorkflows(data);
      } catch (err) {
        console.error('Failed to fetch workflows:', err);
      }
    };

    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        setSessions(data);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      }
    };

    const handleCreateSession = async (workflowName, formValues) => {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow_name: workflowName, form_values: formValues })
        });
        const newSession = await res.json();
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    };

    const handleSendMessage = async (text) => {
      if (!currentSessionId) return;
      try {
        const res = await fetch(`/api/sessions/${currentSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const updatedSession = await res.json();
        setSessions(prev => prev.map(s => s.id === currentSessionId ? updatedSession : s));
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    };

    const activeSession = sessions.find(s => s.id === currentSessionId);

    return (
      <ThemeProvider theme={theme}>
        <AppContainer data-testid="app-container">
          <SessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={setCurrentSessionId}
            onNewSession={() => setCurrentSessionId(null)}
          />
          <MainContent>
            <MainBubble>
              {activeSession ? (
                <ChatWindow
                  session={activeSession}
                  onSendMessage={handleSendMessage}
                />
              ) : (
                <WorkflowForm
                  workflows={workflows}
                  onSubmit={handleCreateSession}
                />
              )}
            </MainBubble>
          </MainContent>
        </AppContainer>
      </ThemeProvider>
    );
  }
  ```

- [ ] **Step 4: Update App Integration Tests**
  File: `frontend/src/App.test.jsx`
  ```javascript
  import React from 'react';
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import App from './App.jsx';

  const mockWorkflows = [
    {
      name: 'Vendor Approval',
      description: 'Vendor review',
      fields: [
        { name: 'vendor_name', description: 'Name of vendor', options: [] }
      ]
    }
  ];

  const mockSessions = [
    {
      id: 'session-1',
      workflow_name: 'Vendor Approval',
      status: 'active',
      messages: [{ role: 'assistant', content: 'What classification?' }]
    }
  ];

  describe('App Integration', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url, options) => {
        if (url === '/api/workflows') {
          return Promise.resolve({
            json: () => Promise.resolve(mockWorkflows)
          });
        }
        if (url === '/api/sessions') {
          if (options && options.method === 'POST') {
            const body = JSON.parse(options.body);
            return Promise.resolve({
              json: () => Promise.resolve({
                id: 'new-session-id',
                workflow_name: body.workflow_name,
                status: 'active',
                messages: [{ role: 'assistant', content: 'First response' }]
              })
            });
          }
          return Promise.resolve({
            json: () => Promise.resolve(mockSessions)
          });
        }
        if (url.startsWith('/api/sessions/')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              id: 'session-1',
              workflow_name: 'Vendor Approval',
              status: 'completed',
              messages: [
                { role: 'assistant', content: 'What classification?' },
                { role: 'user', content: 'internal' }
              ],
              decision: {
                status: 'Approved',
                rationale: 'Looks good.'
              }
            })
          });
        }
        return Promise.reject(new Error('not found'));
      }));
    });

    it('loads workflows and allows starting a new session', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('New Security Request')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter vendor_name...');
      fireEvent.change(input, { target: { value: 'Test Vendor' } });

      fireEvent.click(screen.getByRole('button', { name: 'Start Request' }));

      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument();
      });
    });

    it('allows selection and messaging of existing session', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Vendor Approval (sessio)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Vendor Approval (sessio)'));

      await waitFor(() => {
        expect(screen.getByText('What classification?')).toBeInTheDocument();
      });

      const input = screen.getByTestId('chat-input');
      fireEvent.change(input, { target: { value: 'internal' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));

      await waitFor(() => {
        expect(screen.getByTestId('decision-banner')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
      });
    });
  });
  ```

- [ ] **Step 5: Run tests and ensure all tests pass**
  Run: `npm run --prefix frontend test`
  Expected: PASS

- [ ] **Step 6: Commit all components and App integration**
  Run: `git add frontend/src/components/MainBubble.jsx frontend/src/components/MainBubble.test.jsx frontend/src/App.jsx frontend/src/App.test.jsx`
  Run: `git commit -m "feat: complete MainBubble component and integrate all pieces in App.jsx"`
