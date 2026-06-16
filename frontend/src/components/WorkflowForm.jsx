import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const FormContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background-color: white;
  font-size: 14px;
  color: ${props => props.theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  color: ${props => props.theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Description = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const SubmitButton = styled.button`
  padding: 12px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.primaryHover};
  }
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

export default function WorkflowForm({ workflows, onSubmit }) {
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (workflows && workflows.length > 0) {
      setSelectedWorkflow(workflows[0].name);
    }
  }, [workflows]);

  const activeWorkflow = workflows.find(w => w.name === selectedWorkflow);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedWorkflow, formData);
  };

  if (!workflows || workflows.length === 0) {
    return <LoadingText>Loading workflows...</LoadingText>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormContainer>
        <Title>New Security Request</Title>
        <FormGroup>
          <Label>Select Workflow</Label>
          <Select
            value={selectedWorkflow}
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
          return (
            <FormGroup key={field.name}>
              <Label>{field.label || field.name}</Label>
              {isLiteral ? (
                <Select
                  value={formData[field.name] || ''}
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
                  placeholder={`Enter ${field.name}...`}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                />
              )}
              {field.description && <Description>{field.description}</Description>}
            </FormGroup>
          );
        })}

        <SubmitButton type="submit">Start Request</SubmitButton>
      </FormContainer>
    </form>
  );
}
