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
  background-color: ${props => props.$active ? props.theme.colors.chatUser : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textPrimary};
  font-weight: ${props => props.$active ? '600' : 'normal'};

  &:hover {
    background-color: ${props => props.$active ? props.theme.colors.chatUser : props.theme.colors.chatAssistant};
  }
`;

const EmptyText = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  padding: 4px 10px;
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
            $active={session.id === currentSessionId}
            onClick={() => onSelectSession(session.id)}
          >
            {session.workflow_name} ({session.id.substring(0, 6)})
          </SessionItem>
        ))}
        {activeSessions.length === 0 && <EmptyText>None</EmptyText>}

        <SectionTitle>Completed Requests</SectionTitle>
        {completedSessions.map(session => (
          <SessionItem
            key={session.id}
            $active={session.id === currentSessionId}
            onClick={() => onSelectSession(session.id)}
          >
            {session.workflow_name} ({session.id.substring(0, 6)})
          </SessionItem>
        ))}
        {completedSessions.length === 0 && <EmptyText>None</EmptyText>}
      </ScrollableList>
    </SidebarContainer>
  );
}
