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
