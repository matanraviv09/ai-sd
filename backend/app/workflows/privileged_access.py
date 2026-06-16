from pydantic import BaseModel, Field
from typing import Literal, Dict, Any
from backend.app.workflows.base import Workflow, WorkflowDecision

class PrivilegedAccessInput(BaseModel):
    requester: str = Field(description="The username or email of the requester.")
    system: str = Field(description="The system or resource name.")
    role: str = Field(description="The role or permission level requested.")
    duration_days: int = Field(description="The requested access duration in days.")
    manager_approval: Literal["yes", "no"] = Field(description="Whether manager approval has been obtained.")
    justification: str = Field(description="The business justification for requesting privileged access.")

class PrivilegedAccessWorkflow(Workflow):
    @property
    def name(self) -> str:
        return "Privileged Access"

    @property
    def description(self) -> str:
        return "Request temporary privileged or administrative access to a system."

    @property
    def input_model(self) -> type[BaseModel]:
        return PrivilegedAccessInput

    def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
        data = self.input_model(**extracted_fields)
        role = data.role.strip().lower()

        # Rule: If manager_approval = no -> Needs More Info
        if data.manager_approval == "no":
            return WorkflowDecision(
                status="Needs More Info",
                rationale="Privileged access requests require manager approval. Please obtain approval first.",
                metadata={"risk_level": "High", "requires_manager_approval": True},
                input_data=data.model_dump()
            )

        # Rule: If role contains 'admin' and duration_days > 7 -> Needs More Info
        if "admin" in role and data.duration_days > 7:
            return WorkflowDecision(
                status="Needs More Info",
                rationale="Administrative access requests for more than 7 days require additional approval.",
                metadata={"risk_level": "High", "requires_extended_approval": True},
                input_data=data.model_dump()
            )

        return WorkflowDecision(
            status="Approved",
            rationale="Privileged access request has been approved.",
            metadata={"risk_level": "High" if "admin" in role else "Medium"},
            input_data=data.model_dump()
        )
