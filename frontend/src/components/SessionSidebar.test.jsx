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

  it('triggers onDeleteSession when delete button is clicked', () => {
    const onDeleteSession = vi.fn();
    renderWithTheme(
      <SessionSidebar
        sessions={mockSessions}
        currentSessionId="12345678"
        onSelectSession={() => {}}
        onNewSession={() => {}}
        onDeleteSession={onDeleteSession}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Request' });
    fireEvent.click(deleteButtons[0]);
    expect(onDeleteSession).toHaveBeenCalledWith('12345678');
  });

  it('renders loading spinner and disables buttons when processing', () => {
    renderWithTheme(
      <SessionSidebar
        sessions={mockSessions}
        currentSessionId="12345678"
        onSelectSession={() => {}}
        onNewSession={() => {}}
        onDeleteSession={() => {}}
        isProcessing={true}
      />
    );

    expect(screen.getByTestId('sidebar-spinner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Request' })).toBeDisabled();
  });

  it('renders color highlights for Approved and Rejected sessions', () => {
    const sessionsWithDecisions = [
      { id: '11111111', workflow_name: 'Vendor Approval', status: 'completed', decision: 'Approved' },
      { id: '22222222', workflow_name: 'Vendor Approval', status: 'completed', decision: 'Rejected' }
    ];

    renderWithTheme(
      <SessionSidebar
        sessions={sessionsWithDecisions}
        currentSessionId="11111111"
        onSelectSession={() => {}}
        onNewSession={() => {}}
      />
    );

    const approvedItem = screen.getByText('Vendor Approval (111111)').closest('div');
    const rejectedItem = screen.getByText('Vendor Approval (222222)').closest('div');

    expect(approvedItem).toBeInTheDocument();
    expect(rejectedItem).toBeInTheDocument();
  });
});
