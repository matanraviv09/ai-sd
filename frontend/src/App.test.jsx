import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App.jsx';

const mockWorkflows = [
  {
    name: 'Vendor Approval',
    description: 'Vendor review',
    fields: [
      { name: 'vendor_name', description: 'Name of vendor', choices: null }
    ]
  }
];

const mockSessions = [
  {
    id: 'session-1',
    workflow_name: 'Vendor Approval',
    status: 'active'
  }
];

describe.sequential('App Integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.location.hash = '';
    let dbSessions = {
      'session-1': {
        id: 'session-1',
        workflow_name: 'Vendor Approval',
        status: 'active',
        messages: [{ role: 'assistant', content: 'What classification?' }],
        audit_log: null
      }
    };

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url, options) => {
      if (url === '/api/workflows') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWorkflows)
        });
      }
      if (url === '/api/sessions') {
        if (options && options.method === 'POST') {
          const body = JSON.parse(options.body);
          const newSession = {
            id: 'new-session-id',
            workflow_name: body.workflow_name,
            status: 'active',
            messages: [{ role: 'assistant', content: 'First response' }],
            audit_log: null
          };
          dbSessions[newSession.id] = newSession;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: newSession.id,
              status: newSession.status,
              last_message: 'First response'
            })
          });
        }
        
        const list = Object.values(dbSessions).map(s => ({
          id: s.id,
          workflow_name: s.workflow_name,
          status: s.status
        }));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(list)
        });
      }
      
      if (url.startsWith('/api/sessions/')) {
        const parts = url.split('/');
        const id = parts[3];
        const isMessage = parts[4] === 'messages';
        
        if (options && options.method === 'DELETE') {
          delete dbSessions[id];
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ detail: 'Session deleted' })
          });
        }

        if (isMessage && options && options.method === 'POST') {
          const body = JSON.parse(options.body);
          const session = dbSessions[id];
          if (session) {
            session.messages.push({ role: 'user', content: body.message });
            session.status = 'completed';
            session.messages.push({ role: 'assistant', content: 'Approved.' });
            session.audit_log = {
              decision: 'Approved',
              rationale: 'Looks good.',
              final_response: 'Looks good.'
            };
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                id: session.id,
                status: session.status,
                last_message: 'Approved.'
              })
            });
          }
        }
        
        const session = dbSessions[id];
        if (session) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(session)
          });
        }
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

  it('displays and dismisses error banner on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500
      });
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.getByText(/Could not load/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByTestId('error-banner')).not.toBeInTheDocument();
  });

  it('allows deletion of a session', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Approval (sessio)')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Request' });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Vendor Approval (sessio)')).not.toBeInTheDocument();
    });
  });
});
