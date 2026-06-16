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
  audit_log: {
    decision: 'Approved',
    rationale: 'All clear.',
    final_response: 'All clear.'
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

  it('renders thinking bubble and disables input when processing', () => {
    renderWithTheme(<ChatWindow session={mockActiveSession} onSendMessage={() => {}} isProcessing={true} />);

    expect(screen.getByTestId('thinking-bubble')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
