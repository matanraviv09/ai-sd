import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

const Banner = styled.div`
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  background-color: ${props => props.$status === 'Approved' ? props.theme.colors.successBg : props.theme.colors.errorBg};
  color: ${props => props.$status === 'Approved' ? props.theme.colors.success : props.theme.colors.error};
  border: 1px solid ${props => props.$status === 'Approved' ? props.theme.colors.success : props.theme.colors.error};
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 20px;
`;

const Bubble = styled.div`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  align-self: ${props => props.$role === 'user' ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.$role === 'user' ? props.theme.colors.chatUser : props.theme.colors.chatAssistant};
  color: ${props => props.theme.colors.textPrimary};
`;

const InputArea = styled.form`
  display: flex;
  gap: 8px;
  border-top: 1px solid ${props => props.theme.colors.border};
  padding-top: 16px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  &:focus {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SendButton = styled.button`
  padding: 12px 20px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.primaryHover};
  }

  &:disabled {
    background-color: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.textSecondary};
    cursor: not-allowed;
  }
`;

const ThinkingBubble = styled(Bubble)`
  font-style: italic;
  color: ${props => props.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  background-color: ${props => props.theme.colors.textSecondary};
  border-radius: 50%;
  display: inline-block;
  animation: bounce 1.4s infinite ease-in-out both;

  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1.0); }
  }
`;

export default function ChatWindow({ session, onSendMessage, isProcessing }) {
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  const isCompleted = session.status === 'completed';

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [session.messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <ChatContainer>
      {isCompleted && session.audit_log && (
        <Banner $status={session.audit_log.decision} data-testid="decision-banner">
          <strong>{session.audit_log.decision}</strong>: {session.audit_log.rationale}
        </Banner>
      )}
      
      <MessageList ref={listRef}>
        {session.messages.map((msg, i) => (
          <Bubble key={i} $role={msg.role}>
            {msg.content}
          </Bubble>
        ))}
        {isProcessing && (
          <ThinkingBubble $role="assistant" data-testid="thinking-bubble">
            Thinking
            <Dot />
            <Dot />
            <Dot />
          </ThinkingBubble>
        )}
      </MessageList>

      {!isCompleted && (
        <InputArea onSubmit={handleSubmit}>
          <Input
            type="text"
            value={input}
            placeholder={isProcessing ? "Assistant is thinking..." : "Type your response..."}
            disabled={isProcessing}
            onChange={e => setInput(e.target.value)}
            data-testid="chat-input"
          />
          <SendButton type="submit" disabled={isProcessing}>Send</SendButton>
        </InputArea>
      )}
    </ChatContainer>
  );
}
