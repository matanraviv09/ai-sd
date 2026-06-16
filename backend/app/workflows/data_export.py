from pydantic import BaseModel, Field
from typing import Literal, Dict, Any
from backend.app.workflows.base import Workflow, WorkflowDecision

class DataExportInput(BaseModel):
    dataset: str = Field(description="The name of the dataset to export.")
    destination: str = Field(description="The destination where data will be sent (e.g. personal email, partner server).")
    contains_pii: Literal["yes", "no"] = Field(description="Whether the dataset contains Personally Identifiable Information (PII).")
    retention_days: int = Field(description="Number of days the data will be retained at the destination.")
    encryption: Literal["at-rest", "in-transit", "both", "none"] = Field(description="The encryption level applied to the exported data.")
    justification: str = Field(description="The business justification for this data export.")

class DataExportWorkflow(Workflow):
    @property
    def name(self) -> str:
        return "Data Export"

    @property
    def description(self) -> str:
        return "Request approval for exporting datasets outside the organization."

    @property
    def input_model(self) -> type[BaseModel]:
        return DataExportInput

    def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
        data = self.input_model(**extracted_fields)
        dest = data.destination.strip().lower()

        # Rule: If contains_pii = yes and destination contains 'gmail' or 'personal' -> Rejected
        if data.contains_pii == "yes" and ("gmail" in dest or "personal" in dest):
            return WorkflowDecision(
                status="Rejected",
                rationale="PII data cannot be exported to personal destinations or Gmail.",
                metadata={"risk_level": "Critical", "violation": "PII to personal destination"},
                input_data=data.model_dump()
            )

        # Rule: If contains_pii = yes and encryption = none -> Needs More Info
        if data.contains_pii == "yes" and data.encryption == "none":
            return WorkflowDecision(
                status="Needs More Info",
                rationale="Exporting PII data requires encryption. Please specify encryption controls.",
                metadata={"risk_level": "High", "requires_encryption": True},
                input_data=data.model_dump()
            )

        return WorkflowDecision(
            status="Approved",
            rationale="Data export request has been approved.",
            metadata={"risk_level": "Medium" if data.contains_pii == "yes" else "Low"},
            input_data=data.model_dump()
        )
