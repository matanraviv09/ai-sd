import React, { useState, useEffect } from 'react';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
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

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.textPrimary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`;

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
      <>
        <GlobalStyle />
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
      </>
    </ThemeProvider>
  );
}
