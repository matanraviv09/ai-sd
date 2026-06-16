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

const MainContent = styled.main`
  flex: 1;
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const MiddleContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow-y: auto;
  height: 100%;
`;

const RightSidebar = styled.div`
  width: 400px;
  border-left: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.paper};
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
`;

const EmptyStateContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
  height: 100%;
  padding: 40px;
`;
const SelectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 600px;
`;

const SelectorTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.textPrimary};
  margin-bottom: 8px;
`;

const SearchInput = styled.input`
  padding: 14px 20px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  font-size: 16px;
  width: 100%;
  outline: none;
  background-color: white;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  &:focus {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  }
`;

const WorkflowGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const WorkflowCard = styled.div`
  padding: 20px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05);
  }
`;

const WorkflowName = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.textPrimary};
`;

const WorkflowDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.4;
`;



export default function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitializedHash, setHasInitializedHash] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWorkflows();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!hasInitializedHash && sessions.length > 0) {
      if (!window.location.hash) {
        window.location.hash = `#/session/${sessions[0].id}`;
      }
      setHasInitializedHash(true);
    }
  }, [sessions, hasInitializedHash]);

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
      if (sess) {
        if (!sess.messages) {
          fetchSessionDetails(currentSessionId);
        }
      } else if (sessions.length === 0 && !hasInitializedHash) {
        fetchSessionDetails(currentSessionId);
      }
    }
  }, [currentSessionId, sessions, hasInitializedHash]);

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

  const handleUpdateSession = async (workflowName, formValues, sessionId) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_name: workflowName, form_values: formValues })
      });
      if (!res.ok) throw new Error('Failed to update session');
      await fetchSessionDetails(sessionId);
    } catch (err) {
      console.error('Failed to update session:', err);
      setError('Could not update request settings.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (text) => {
    if (!currentSessionId) return;

    // Optimistically add client message to the session messages list immediately
    const optimisticMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setSessions(prev =>
      prev.map(s => {
        if (s.id === currentSessionId) {
          const messages = s.messages ? [...s.messages, optimisticMsg] : [optimisticMsg];
          return { ...s, messages };
        }
        return s;
      })
    );

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
      // Rollback on error
      await fetchSessionDetails(currentSessionId);
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
  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            {activeSession ? (
              <>
                <MiddleContent>
                  {error && (
                    <ErrorBanner data-testid="error-banner" style={{ width: '100%', maxWidth: '600px' }}>
                      <span>{error}</span>
                      <DismissButton onClick={() => setError(null)}>×</DismissButton>
                    </ErrorBanner>
                  )}
                  <MainBubble>
                    <WorkflowForm
                      workflows={workflows}
                      onSubmit={
                        activeSession &&
                        activeSession.status === 'completed' &&
                        (activeSession.decision === 'Rejected' || (activeSession.audit_log && activeSession.audit_log.decision === 'Rejected'))
                          ? (workflowName, formValues, sessionId) => handleCreateSession(workflowName, formValues, sessionId)
                          : handleUpdateSession
                      }
                      isProcessing={isProcessing}
                      session={activeSession}
                    />
                  </MainBubble>
                </MiddleContent>
                <RightSidebar>
                  {!activeSession.messages ? (
                    <LoadingText>Loading session details...</LoadingText>
                  ) : (
                    <ChatWindow
                      session={activeSession}
                      onSendMessage={handleSendMessage}
                      isProcessing={isProcessing}
                    />
                  )}
                </RightSidebar>
              </>
            ) : (
              <MiddleContent>
                {error && (
                  <ErrorBanner data-testid="error-banner" style={{ width: '100%', maxWidth: '600px', marginBottom: '24px' }}>
                    <span>{error}</span>
                    <DismissButton onClick={() => setError(null)}>×</DismissButton>
                  </ErrorBanner>
                )}
                <SelectorContainer>
                  <SelectorTitle>New Security Request</SelectorTitle>
                  <SearchInput
                    type="text"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    data-testid="workflow-search"
                  />
                  <WorkflowGrid>
                    {filteredWorkflows.map(w => (
                      <WorkflowCard
                        key={w.name}
                        onClick={() => handleCreateSession(w.name, {})}
                        data-testid={`workflow-card-${w.name.toLowerCase().replace(' ', '-')}`}
                      >
                        <WorkflowName>{w.name}</WorkflowName>
                        <WorkflowDescription>{w.description}</WorkflowDescription>
                      </WorkflowCard>
                    ))}
                    {filteredWorkflows.length === 0 && (
                      <div style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: '20px' }}>
                        No workflows found matching "{searchQuery}"
                      </div>
                    )}
                  </WorkflowGrid>
                </SelectorContainer>
              </MiddleContent>
            )}
          </MainContent>
        </AppContainer>
      </>
    </ThemeProvider>
  );
}
