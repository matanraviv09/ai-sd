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

const LoadingText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ErrorBanner = styled.div`
  padding: 12px 16px;
  background-color: ${props => props.theme.colors.errorBg};
  color: ${props => props.theme.colors.error};
  border: 1px solid ${props => props.theme.colors.error};
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.error};
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  line-height: 1;
`;

const DoubleBubbleContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
  max-width: 1220px;
  justify-content: center;
  align-items: center;
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
`;

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWorkflows();
    fetchSessions();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      if (!res.ok) throw new Error('Failed to load workflows');
      const data = await res.json();
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      setError('Could not load workflows from server. Please verify the backend API is running.');
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Could not load sessions from server.');
    }
  };

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
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      const sess = sessions.find(s => s.id === currentSessionId);
      if (!sess || !sess.messages) {
        fetchSessionDetails(currentSessionId);
      }
    }
  }, [currentSessionId, sessions]);

  const fetchSessionDetails = async (id) => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error('Failed to load session details');
      const data = await res.json();
      setSessions(prev => {
        const exists = prev.some(s => s.id === id);
        if (exists) {
          return prev.map(s => s.id === id ? data : s);
        } else {
          return [data, ...prev];
        }
      });
    } catch (err) {
      console.error('Failed to fetch session details:', err);
      setError('Could not load session details.');
    }
  };

  const handleCreateSession = async (workflowName, formValues, refitted_from = null) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_name: workflowName, form_values: formValues, refitted_from })
      });
      if (!res.ok) throw new Error('Failed to create session');
      const newSession = await res.json();
      await fetchSessionDetails(newSession.id);
      window.location.hash = `#/session/${newSession.id}`;
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Could not create new security request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (text) => {
    if (!currentSessionId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (!res.ok) throw new Error('Failed to send message');
      await fetchSessionDetails(currentSessionId);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSession = async (id) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete session');
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        window.location.hash = '';
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Could not delete session.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectSession = (id) => {
    window.location.hash = `#/session/${id}`;
  };

  const handleNewSession = () => {
    window.location.hash = '';
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
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            isProcessing={isProcessing}
          />
          <MainContent>
            <ContentArea>
              {error && (
                <ErrorBanner data-testid="error-banner" style={{ width: '100%', maxWidth: activeSession ? '1220px' : '600px' }}>
                  <span>{error}</span>
                  <DismissButton onClick={() => setError(null)}>×</DismissButton>
                </ErrorBanner>
              )}
              {activeSession ? (
                <DoubleBubbleContainer>
                  <MainBubble>
                    <WorkflowForm
                      workflows={workflows}
                      onSubmit={handleCreateSession}
                      isProcessing={isProcessing}
                      session={activeSession}
                    />
                  </MainBubble>
                  <MainBubble>
                    {!activeSession.messages ? (
                      <LoadingText>Loading session details...</LoadingText>
                    ) : (
                      <ChatWindow
                        session={activeSession}
                        onSendMessage={handleSendMessage}
                        isProcessing={isProcessing}
                      />
                    )}
                  </MainBubble>
                </DoubleBubbleContainer>
              ) : (
                <MainBubble>
                  <WorkflowForm
                    workflows={workflows}
                    onSubmit={handleCreateSession}
                    isProcessing={isProcessing}
                  />
                </MainBubble>
              )}
            </ContentArea>
          </MainContent>
        </AppContainer>
      </>
    </ThemeProvider>
  );
}
