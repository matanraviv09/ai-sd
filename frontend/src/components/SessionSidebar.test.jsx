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
