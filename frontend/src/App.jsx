import React, { useState } from 'react';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
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

const PlaceholderText = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
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
      <>
        <GlobalStyle />
        <AppContainer data-testid="app-container">
          <SessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
          />
          <MainContent>
            {currentSessionId ? (
              <PlaceholderText>Active Session: {currentSessionId}</PlaceholderText>
            ) : (
              <PlaceholderText>Create New Request</PlaceholderText>
            )}
          </MainContent>
        </AppContainer>
      </>
    </ThemeProvider>
  );
}
