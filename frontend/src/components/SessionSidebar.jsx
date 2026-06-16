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

  &:disabled {
    background-color: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.textSecondary};
    cursor: not-allowed;
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

const SessionItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  font-size: 14px;
  margin-bottom: 4px;
  background-color: ${props => props.$active ? props.theme.colors.chatUser : 'transparent'};
  color: ${props => 
    props.$decision === 'Approved' ? props.theme.colors.success :
    props.$decision === 'Rejected' ? props.theme.colors.error :
    props.$active ? props.theme.colors.primary : props.theme.colors.textPrimary
  };
  font-weight: ${props => props.$active ? '600' : 'normal'};
  opacity: ${props => props.$disabled ? 0.7 : 1};
  pointer-events: ${props => props.$disabled ? 'none' : 'auto'};
  border-left: ${props => 
    props.$decision === 'Approved' ? `4px solid ${props.theme.colors.success}` :
    props.$decision === 'Rejected' ? `4px solid ${props.theme.colors.error}` :
    'none'
  };
  padding-left: ${props => (props.$decision === 'Approved' || props.$decision === 'Rejected') ? '6px' : '10px'};

  &:hover {
    background-color: ${props => props.$active ? props.theme.colors.chatUser : props.theme.colors.chatAssistant};
  }
`;

const SessionItemText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    color: ${props => props.theme.colors.error};
    background-color: ${props => props.theme.colors.errorBg};
  }
`;

const SidebarSpinner = styled.span`
  width: 12px;
  height: 12px;
  border: 2px solid ${props => props.theme.colors.border};
  border-top-color: ${props => props.theme.colors.primary};
  border-radius: 50%;
  display: inline-block;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyText = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  padding: 4px 10px;
`;

export default function SessionSidebar({ sessions, currentSessionId, onSelectSession, onNewSession, onDeleteSession, isProcessing }) {
  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <SidebarContainer>
      <Header>
        <NewButton onClick={onNewSession} disabled={isProcessing}>New Request</NewButton>
      </Header>
      <ScrollableList>
        <SectionTitle>Active Requests</SectionTitle>
        {activeSessions.map(session => (
          <SessionItemRow
            key={session.id}
            $active={session.id === currentSessionId}
            $disabled={isProcessing}
            $decision={session.decision || (session.audit_log && session.audit_log.decision)}
            onClick={() => !isProcessing && onSelectSession(session.id)}
          >
            <SessionItemText>
              {session.id === currentSessionId && isProcessing && <SidebarSpinner data-testid="sidebar-spinner" />}
              {session.workflow_name} ({session.id.substring(0, 6)})
            </SessionItemText>
            <DeleteButton
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              title="Delete Request"
              aria-label="Delete Request"
            >
              ×
            </DeleteButton>
          </SessionItemRow>
        ))}
        {activeSessions.length === 0 && <EmptyText>None</EmptyText>}

        <SectionTitle>Completed Requests</SectionTitle>
        {completedSessions.map(session => (
          <SessionItemRow
            key={session.id}
            $active={session.id === currentSessionId}
            $disabled={isProcessing}
            $decision={session.decision || (session.audit_log && session.audit_log.decision)}
            onClick={() => !isProcessing && onSelectSession(session.id)}
          >
            <SessionItemText>
              {session.id === currentSessionId && isProcessing && <SidebarSpinner data-testid="sidebar-spinner" />}
              {session.workflow_name} ({session.id.substring(0, 6)})
            </SessionItemText>
            <DeleteButton
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              title="Delete Request"
              aria-label="Delete Request"
            >
              ×
            </DeleteButton>
          </SessionItemRow>
        ))}
        {completedSessions.length === 0 && <EmptyText>None</EmptyText>}
      </ScrollableList>
    </SidebarContainer>
  );
}
