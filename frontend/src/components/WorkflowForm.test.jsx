import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from 'styled-components';
import { theme } from '../App.jsx';
import WorkflowForm from './WorkflowForm.jsx';

const mockWorkflows = [
  {
    name: 'Vendor Approval',
    description: 'Vendor review',
    fields: [
      { name: 'vendor_name', description: 'Name of vendor', choices: null },
      { name: 'soc2_available', description: 'SOC2 status', choices: ['yes', 'no'] }
    ]
  }
];

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('WorkflowForm', () => {
  it('renders selects and input fields dynamically', () => {
    renderWithTheme(<WorkflowForm workflows={mockWorkflows} onSubmit={() => {}} />);
    expect(screen.getByText('Select Workflow')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter vendor_name...')).toBeInTheDocument();
    expect(screen.getByText('-- Choose option (Optional) --')).toBeInTheDocument();
  });

  it('triggers onSubmit with input data', () => {
    const onSubmit = vi.fn();
    renderWithTheme(<WorkflowForm workflows={mockWorkflows} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Enter vendor_name...'), { target: { value: 'Acme Corp' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'yes' } });

    fireEvent.click(screen.getByRole('button', { name: 'Start Request' }));

    expect(onSubmit).toHaveBeenCalledWith('Vendor Approval', {
      vendor_name: 'Acme Corp',
      soc2_available: 'yes'
    });
  });
  it('disables input elements and updates button text when processing', () => {
    renderWithTheme(<WorkflowForm workflows={mockWorkflows} onSubmit={() => {}} isProcessing={true} />);
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    expect(screen.getByPlaceholderText('Enter vendor_name...')).toBeDisabled();
    expect(screen.getAllByRole('combobox')[0]).toBeDisabled();
  });

  it('renders editable fields and highlights missing fields for active session', () => {
    const activeSession = {
      id: 'session-123',
      workflow_name: 'Vendor Approval',
      status: 'active',
      extracted_fields: {
        vendor_name: 'Slack'
      }
    };

    renderWithTheme(
      <WorkflowForm
        workflows={mockWorkflows}
        onSubmit={() => {}}
        session={activeSession}
      />
    );

    expect(screen.getByPlaceholderText('Enter vendor_name...')).not.toBeDisabled();
    expect(screen.getAllByRole('combobox')[1]).not.toBeDisabled();
    expect(screen.getByText('Missing')).toBeInTheDocument();
    // Initially unchanged, so buttons are disabled
    expect(screen.getByRole('button', { name: 'Save Settings' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('disables submit/reset buttons by default, enables them on change, and disables them on reset', () => {
    const activeSession = {
      id: 'session-123',
      workflow_name: 'Vendor Approval',
      status: 'active',
      extracted_fields: {
        vendor_name: 'Slack'
      }
    };

    renderWithTheme(
      <WorkflowForm
        workflows={mockWorkflows}
        onSubmit={() => {}}
        session={activeSession}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Save Settings' });
    const resetBtn = screen.getByRole('button', { name: 'Reset' });

    expect(submitBtn).toBeDisabled();
    expect(resetBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('Enter vendor_name...');
    fireEvent.change(input, { target: { value: 'Different Vendor' } });
    expect(submitBtn).not.toBeDisabled();
    expect(resetBtn).not.toBeDisabled();

    fireEvent.click(resetBtn);
    expect(input.value).toBe('Slack');
    expect(submitBtn).toBeDisabled();
    expect(resetBtn).toBeDisabled();
  });

  it('allows editing and triggers onSubmit with refitted session ID when rejected', () => {
    const rejectedSession = {
      id: 'session-123',
      workflow_name: 'Vendor Approval',
      status: 'completed',
      decision: 'Rejected',
      extracted_fields: {
        vendor_name: 'Slack',
        soc2_available: 'no'
      }
    };

    const onSubmit = vi.fn();

    renderWithTheme(
      <WorkflowForm
        workflows={mockWorkflows}
        onSubmit={onSubmit}
        session={rejectedSession}
      />
    );

    const soc2Select = screen.getAllByRole('combobox')[1];
    expect(soc2Select).not.toBeDisabled();

    fireEvent.change(soc2Select, { target: { value: 'yes' } });

    const submitBtn = screen.getByRole('button', { name: 'Refit Request' });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith('Vendor Approval', {
      vendor_name: 'Slack',
      soc2_available: 'yes'
    }, 'session-123');
  });
});
