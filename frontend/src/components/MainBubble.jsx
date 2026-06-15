import React from 'react';
import styled from 'styled-components';

const BubbleCard = styled.div`
  width: 100%;
  max-width: 600px;
  height: 600px;
  background-color: ${props => props.theme.colors.paper};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  box-shadow: ${props => props.theme.shadows.bubble};
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
`;

export default function MainBubble({ children }) {
  return (
    <BubbleCard data-testid="main-bubble">
      {children}
    </BubbleCard>
  );
}
