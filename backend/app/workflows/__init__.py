from typing import Dict
from backend.app.workflows.base import Workflow
from backend.app.workflows.vendor_approval import VendorApprovalWorkflow
from backend.app.workflows.firewall_change import FirewallChangeWorkflow
from backend.app.workflows.dev_tool_install import DevToolInstallWorkflow
from backend.app.workflows.data_export import DataExportWorkflow
from backend.app.workflows.privileged_access import PrivilegedAccessWorkflow

WORKFLOW_REGISTRY: Dict[str, type[Workflow]] = {
    "Vendor Approval": VendorApprovalWorkflow,
    "Firewall Change": FirewallChangeWorkflow,
    "Dev Tool Install": DevToolInstallWorkflow,
    "Data Export": DataExportWorkflow,
    "Privileged Access": PrivilegedAccessWorkflow
}
