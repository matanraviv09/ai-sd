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
      { name: 'vendor_name', description: 'Name of vendor', options: [] },
      { name: 'soc2_available', description: 'SOC2 status', options: ['yes', 'no'] }
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
});
