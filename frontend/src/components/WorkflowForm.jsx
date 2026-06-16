import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const StyledForm = styled.form`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const FormContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.textPrimary};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.textPrimary};
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid ${props => props.$missing ? props.theme.colors.error : props.theme.colors.border};
  border-radius: 8px;
  background-color: white;
  font-size: 14px;
  color: ${props => props.theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${props => props.$missing ? props.theme.colors.error : props.theme.colors.primary};
  }
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${props => props.$missing ? props.theme.colors.error : props.theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  color: ${props => props.theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${props => props.$missing ? props.theme.colors.error : props.theme.colors.primary};
  }
`;

const Description = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MissingBadge = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.error};
  font-weight: bold;
  text-transform: uppercase;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
  width: 100%;
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 12px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryHover};
  }

  &:disabled {
    background-color: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.textSecondary};
    cursor: not-allowed;
  }
`;

const ResetButton = styled.button`
  flex: 1;
  padding: 12px;
  background-color: transparent;
  color: ${props => props.theme.colors.textPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.chatAssistant};
  }

  &:disabled {
    background-color: transparent;
    color: ${props => props.theme.colors.textSecondary};
    border-color: ${props => props.theme.colors.border};
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

export default function WorkflowForm({ workflows, onSubmit, isProcessing, session }) {
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    if (session) {
      setSelectedWorkflow(session.workflow_name);
      const fields = session.extracted_fields || {};
      setFormData(fields);
      setOriginalData(fields);
    } else if (workflows && workflows.length > 0) {
      setSelectedWorkflow(workflows[0].name);
      setFormData({});
      setOriginalData({});
    }
  }, [session, workflows]);

  const activeWorkflow = workflows.find(w => w.name === selectedWorkflow);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = (e) => {
    e.preventDefault();
    setFormData(originalData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (session) {
      onSubmit(selectedWorkflow, formData, session.id);
    } else {
      onSubmit(selectedWorkflow, formData);
    }
  };

  if (!workflows || workflows.length === 0) {
    return <LoadingText>Loading workflows...</LoadingText>;
  }

  const decision = session && (session.decision || (session.audit_log && session.audit_log.decision));
  const isRejected = session && session.status === 'completed' && decision === 'Rejected';
  const isReadOnly = session && session.status === 'completed' && decision === 'Approved';

  const isDirty = () => {
    const allKeys = new Set([...Object.keys(formData), ...Object.keys(originalData)]);
    for (const key of allKeys) {
      const val1 = formData[key] === undefined || formData[key] === null ? '' : formData[key];
      const val2 = originalData[key] === undefined || originalData[key] === null ? '' : originalData[key];
      if (String(val1).trim() !== String(val2).trim()) {
        return true;
      }
    }
    return false;
  };

  const dirty = isDirty();

  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (!session) return 'Start Request';
    if (isRejected) return 'Refit Request';
    if (decision === 'Approved') return 'Approved';
    return 'Save Settings';
  };

  return (
    <StyledForm onSubmit={handleSubmit}>
      <FormContainer>
        <Title>{session ? 'Request Settings' : 'New Security Request'}</Title>
        <FormGroup>
          <Label>Select Workflow</Label>
          <Select
            value={selectedWorkflow}
            disabled={true}
            onChange={e => {
              setSelectedWorkflow(e.target.value);
              setFormData({});
            }}
          >
            {workflows.map(w => (
              <option key={w.name} value={w.name}>{w.name}</option>
            ))}
          </Select>
        </FormGroup>

        {activeWorkflow && activeWorkflow.fields.map(field => {
          const isLiteral = field.choices && field.choices.length > 0;
          const isFieldMissing = session && (!formData[field.name] || formData[field.name] === '');
          return (
            <FormGroup key={field.name}>
              <LabelRow>
                <Label>{field.label || field.name}</Label>
                {isFieldMissing && <MissingBadge>Missing</MissingBadge>}
              </LabelRow>
              {isLiteral ? (
                <Select
                  value={formData[field.name] || ''}
                  disabled={isProcessing || isReadOnly}
                  $missing={isFieldMissing}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                >
                  <option value="">-- Choose option (Optional) --</option>
                  {field.choices.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  type="text"
                  value={formData[field.name] || ''}
                  disabled={isProcessing || isReadOnly}
                  $missing={isFieldMissing}
                  placeholder={`Enter ${field.name}...`}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                />
              )}
              {field.description && <Description>{field.description}</Description>}
            </FormGroup>
          );
        })}

        <ButtonRow>
          <ResetButton type="button" onClick={handleReset} disabled={isProcessing || isReadOnly || !dirty}>
            Reset
          </ResetButton>
          <SubmitButton type="submit" disabled={isProcessing || isReadOnly || !dirty}>
            {getButtonText()}
          </SubmitButton>
        </ButtonRow>
      </FormContainer>
    </StyledForm>
  );
}
