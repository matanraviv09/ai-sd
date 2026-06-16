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

let dbSessions;

describe.sequential('App Integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.location.hash = '';
    dbSessions = {
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
            audit_log: null,
            refitted_from: body.refitted_from || null
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
          status: s.status,
          refitted_from: s.refitted_from || null
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

        if (options && options.method === 'PUT') {
          const body = JSON.parse(options.body);
          const session = dbSessions[id];
          if (session) {
            if (session.status === 'completed') {
              return Promise.resolve({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ detail: 'Session is already completed' })
              });
            }
            session.workflow_name = body.workflow_name;
            session.extracted_fields = body.form_values;
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                id: session.id,
                status: session.status,
                last_message: 'Updated settings'
              })
            });
          }
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

  it('allows creating a new session via New Request button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('New Request')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Request'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search workflows...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search workflows...');
    fireEvent.change(searchInput, { target: { value: 'Vendor' } });
    expect(screen.getByText('Vendor Approval')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Vendor Approval'));

    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument();
      expect(screen.getByText('Request Settings')).toBeInTheDocument();
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

  it('allows refitting a rejected session and calls POST /api/sessions with refitted_from', async () => {
    dbSessions['rejected-session'] = {
      id: 'rejected-session',
      workflow_name: 'Vendor Approval',
      status: 'completed',
      extracted_fields: {
        vendor_name: 'Slack'
      },
      messages: [
        { role: 'user', content: 'Acme' },
        { role: 'assistant', content: 'Rejected.' }
      ],
      audit_log: {
        decision: 'Rejected',
        rationale: 'Missing SOC2.',
        final_response: 'Rejected.'
      }
    };

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Vendor Approval (reject)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Vendor Approval (reject)'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter vendor_name...').value).toBe('Slack');
    });

    const input = screen.getByPlaceholderText('Enter vendor_name...');

    // Make it dirty so the Refit Request button is enabled
    fireEvent.change(input, { target: { value: 'Slack Refitted' } });

    const refitButton = screen.getByRole('button', { name: 'Refit Request' });
    expect(refitButton).not.toBeDisabled();

    fireEvent.click(refitButton);

    // After clicking refit, we expect a POST to /api/sessions which will add a new-session-id to dbSessions.
    // Let's wait for the new session's messages/form to be loaded.
    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument();
    });

    // Check that the new session was created with refitted_from = 'rejected-session'
    expect(dbSessions['new-session-id']).toBeDefined();
    expect(dbSessions['new-session-id'].refitted_from).toBe('rejected-session');
  });
});
