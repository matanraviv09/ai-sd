from pydantic import BaseModel, Field
from typing import Literal, Dict, Any
from backend.app.workflows.base import Workflow, WorkflowDecision

class FirewallChangeInput(BaseModel):
    source: str = Field(description="The source system or VPC.")
    destination: str = Field(description="The destination IP address or DNS name.")
    port: int = Field(description="The port number.")
    environment: Literal["prod", "non-prod"] = Field(description="The target environment (prod or non-prod).")
    justification: str = Field(description="The business justification for this firewall change.")
    expiry: str = Field(description="The expiry date (e.g. YYYY-MM-DD) or 'permanent'.")

class FirewallChangeWorkflow(Workflow):
    @property
    def name(self) -> str:
        return "Firewall Change"

    @property
    def description(self) -> str:
        return "Process requests for modifying firewall rules and access lists."

    @property
    def input_model(self) -> type[BaseModel]:
        return FirewallChangeInput

    def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
        data = self.input_model(**extracted_fields)
        
        # Clean/normalize destination and port
        dest = data.destination.strip()
        port = data.port

        # If environment = prod and expiry = permanent -> Needs More Info
        if data.environment == "prod" and data.expiry.strip().lower() == "permanent":
            return WorkflowDecision(
                status="Needs More Info",
                rationale="Production firewall changes cannot be permanent. Please specify an expiry date or provide additional justification.",
                metadata={"risk_level": "High", "requires_expiry": True},
                input_data=data.model_dump()
            )

        # If destination is 0.0.0.0/0 and port in {22,3389} -> Rejected
        if dest == "0.0.0.0/0" and port in {22, 3389}:
            protocol_name = "SSH" if port == 22 else "RDP"
            return WorkflowDecision(
                status="Rejected",
                rationale=f"Opening {protocol_name} port {port} to the entire internet (0.0.0.0/0) is prohibited.",
                metadata={"risk_level": "Critical", "violation": f"Internet-facing {protocol_name}"},
                input_data=data.model_dump()
            )

        # Otherwise -> Approved
        return WorkflowDecision(
            status="Approved",
            rationale="Firewall change request complies with security policies.",
            metadata={"risk_level": "Low" if data.environment == "non-prod" else "Medium"},
            input_data=data.model_dump()
        )
