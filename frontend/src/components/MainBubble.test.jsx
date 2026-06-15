import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from 'styled-components';
import { theme } from '../App.jsx';
import MainBubble from './MainBubble.jsx';

describe('MainBubble', () => {
  it('renders its children correctly inside styled bubble card', () => {
    render(
      <ThemeProvider theme={theme}>
        <MainBubble>
          <div data-testid="test-child">Child Element</div>
        </MainBubble>
      </ThemeProvider>
    );
    expect(screen.getByTestId('main-bubble')).toBeInTheDocument();
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });
});
