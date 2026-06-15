from pydantic import BaseModel, Field
from typing import Literal, Dict, Any
from backend.app.workflows.base import Workflow, WorkflowDecision

class VendorApprovalInput(BaseModel):
    vendor_name: str = Field(description="The name of the vendor.")
    business_owner: str = Field(description="The email or name of the internal business owner.")
    data_classification: Literal["public", "internal", "PII"] = Field(description="The classification of data processed by the vendor.")
    sso_supported: Literal["yes", "no"] = Field(description="Whether the vendor supports single sign-on (SSO).")
    soc2_available: Literal["yes", "no"] = Field(description="Whether a SOC2 report is available for the vendor.")

class VendorApprovalWorkflow(Workflow):
    @property
    def name(self) -> str:
        return "Vendor Approval"

    @property
    def description(self) -> str:
        return "Process requests for reviewing and approving a new third-party software vendor."

    @property
    def input_model(self) -> type[BaseModel]:
        return VendorApprovalInput

    def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
        data = self.input_model(**extracted_fields)
        if data.data_classification == "PII" and data.soc2_available == "no":
            return WorkflowDecision(
                status="Rejected",
                rationale="SOC2 certification is required for PII data classification.",
                metadata={
                    "risk_level": "High",
                    "requires_soc2": True,
                    "sso_compliant": data.sso_supported == "yes"
                },
                input_data=data.model_dump()
            )
        return WorkflowDecision(
            status="Approved",
            rationale="All security criteria met successfully.",
            metadata={
                "risk_level": "Low" if data.data_classification == "public" else "Medium",
                "requires_soc2": data.data_classification == "PII",
                "sso_compliant": data.sso_supported == "yes"
            },
            input_data=data.model_dump()
        )
