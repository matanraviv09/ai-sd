from pydantic import BaseModel, Field
from typing import Literal, Dict, Any
from backend.app.workflows.base import Workflow, WorkflowDecision

class DevToolInstallInput(BaseModel):
    tool_name: str = Field(description="The name of the development tool.")
    vendor: str = Field(description="The vendor or publisher of the tool.")
    requested_permissions: Literal["standard", "admin"] = Field(description="The requested permission level (standard or admin).")
    team_lead_approval: Literal["yes", "no"] = Field(description="Whether team lead approval has been obtained.")
    justification: str = Field(description="The business justification for installing this tool.")

class DevToolInstallWorkflow(Workflow):
    @property
    def name(self) -> str:
        return "Dev Tool Install"

    @property
    def description(self) -> str:
        return "Request approval to install a development tool on your workstation."

    @property
    def input_model(self) -> type[BaseModel]:
        return DevToolInstallInput

    def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
        data = self.input_model(**extracted_fields)
        
        # Rule: If requested_permissions = admin and team_lead_approval = no -> Needs More Info
        if data.requested_permissions == "admin" and data.team_lead_approval == "no":
            return WorkflowDecision(
                status="Needs More Info",
                rationale="Admin permission requests require team lead approval. Please obtain approval first.",
                metadata={"risk_level": "Medium", "requires_team_lead_approval": True},
                input_data=data.model_dump()
            )
            
        return WorkflowDecision(
            status="Approved",
            rationale=f"Tool install request for '{data.tool_name}' has been approved.",
            metadata={"risk_level": "Low" if data.requested_permissions == "standard" else "Medium"},
            input_data=data.model_dump()
        )
