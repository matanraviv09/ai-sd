import pytest
from backend.app.workflows.vendor_approval import VendorApprovalWorkflow

def test_vendor_approval_validation():
    wf = VendorApprovalWorkflow()
    assert wf.name == "Vendor Approval"
    assert "vendor_name" in wf.required_fields
    assert len(wf.required_fields) == 5

    # Test Rejected decision (PII classification and no SOC2)
    dec_rejected = wf.evaluate_decision({
        "vendor_name": "Acme",
        "business_owner": "owner@acme.com",
        "data_classification": "PII",
        "sso_supported": "yes",
        "soc2_available": "no"
    })
    assert dec_rejected.status == "Rejected"
    assert "SOC2" in dec_rejected.rationale
    assert dec_rejected.metadata["risk_level"] == "High"
    assert dec_rejected.input_data["vendor_name"] == "Acme"

    # Test Approved decision (PII and SOC2 available)
    dec_approved = wf.evaluate_decision({
        "vendor_name": "Acme",
        "business_owner": "owner@acme.com",
        "data_classification": "PII",
        "sso_supported": "yes",
        "soc2_available": "yes"
    })
    assert dec_approved.status == "Approved"
    assert dec_approved.metadata["risk_level"] == "Medium"
    assert dec_approved.input_data["soc2_available"] == "yes"

def test_firewall_change_validation():
    from backend.app.workflows.firewall_change import FirewallChangeWorkflow
    wf = FirewallChangeWorkflow()
    assert wf.name == "Firewall Change"
    assert "source" in wf.required_fields
    assert "expiry" in wf.required_fields

    # Rule: If environment = prod and expiry = permanent -> Needs More Info
    dec_needs_info = wf.evaluate_decision({
        "source": "VPC-1",
        "destination": "10.0.0.1",
        "port": 80,
        "environment": "prod",
        "justification": "Required for API",
        "expiry": "permanent"
    })
    assert dec_needs_info.status == "Needs More Info"
    assert "permanent" in dec_needs_info.rationale

    # Rule: If destination is 0.0.0.0/0 and port in {22,3389} -> Rejected
    dec_rejected_ssh = wf.evaluate_decision({
        "source": "VPC-1",
        "destination": "0.0.0.0/0",
        "port": 22,
        "environment": "prod",
        "justification": "Required for SSH",
        "expiry": "2026-06-30"
    })
    assert dec_rejected_ssh.status == "Rejected"
    assert "SSH" in dec_rejected_ssh.rationale or "22" in dec_rejected_ssh.rationale

    dec_rejected_rdp = wf.evaluate_decision({
        "source": "VPC-1",
        "destination": "  0.0.0.0/0  ", # with spaces
        "port": 3389,
        "environment": "non-prod",
        "justification": "Required for RDP",
        "expiry": "permanent"
    })
    assert dec_rejected_rdp.status == "Rejected"
    assert "RDP" in dec_rejected_rdp.rationale or "3389" in dec_rejected_rdp.rationale

    # Rule: Otherwise -> Approved
    dec_approved_prod_exp = wf.evaluate_decision({
        "source": "VPC-1",
        "destination": "10.0.0.2",
        "port": 443,
        "environment": "prod",
        "justification": "HTTPS traffic",
        "expiry": "2026-12-31"
    })
    assert dec_approved_prod_exp.status == "Approved"

    dec_approved_nonprod_perm = wf.evaluate_decision({
        "source": "VPC-1",
        "destination": "10.0.0.2",
        "port": 443,
        "environment": "non-prod",
        "justification": "HTTPS traffic",
        "expiry": "permanent"
    })
    assert dec_approved_nonprod_perm.status == "Approved"


def test_dev_tool_install_workflow():
    from backend.app.workflows.dev_tool_install import DevToolInstallWorkflow
    wf = DevToolInstallWorkflow()
    assert wf.name == "Dev Tool Install"
    assert "tool_name" in wf.required_fields
    assert "requested_permissions" in wf.required_fields

    # Rule: If requested_permissions = admin and team_lead_approval = no -> Needs More Info
    dec_needs_info = wf.evaluate_decision({
        "tool_name": "Docker Desktop",
        "vendor": "Docker",
        "requested_permissions": "admin",
        "team_lead_approval": "no",
        "justification": "Local development containers"
    })
    assert dec_needs_info.status == "Needs More Info"
    assert "approval" in dec_needs_info.rationale.lower()

    # Rule: Otherwise -> Approved (e.g. admin with team lead approval)
    dec_approved_admin = wf.evaluate_decision({
        "tool_name": "Docker Desktop",
        "vendor": "Docker",
        "requested_permissions": "admin",
        "team_lead_approval": "yes",
        "justification": "Local development containers"
    })
    assert dec_approved_admin.status == "Approved"

    # Rule: Otherwise -> Approved (e.g. standard with no team lead approval)
    dec_approved_standard = wf.evaluate_decision({
        "tool_name": "VS Code",
        "vendor": "Microsoft",
        "requested_permissions": "standard",
        "team_lead_approval": "no",
        "justification": "Code editor"
    })
    assert dec_approved_standard.status == "Approved"


def test_data_export_workflow():
    from backend.app.workflows.data_export import DataExportWorkflow
    wf = DataExportWorkflow()
    assert wf.name == "Data Export"
    assert "dataset" in wf.required_fields
    assert "retention_days" in wf.required_fields

    # Rule: If contains_pii = yes and destination contains 'gmail' or 'personal' -> Rejected
    dec_rejected_gmail = wf.evaluate_decision({
        "dataset": "User emails",
        "destination": "bob.personal@gmail.com",
        "contains_pii": "yes",
        "retention_days": 5,
        "encryption": "both",
        "justification": "Local testing"
    })
    assert dec_rejected_gmail.status == "Rejected"
    assert "gmail" in dec_rejected_gmail.rationale.lower()

    dec_rejected_personal = wf.evaluate_decision({
        "dataset": "User emails",
        "destination": "personal-backup-server",
        "contains_pii": "yes",
        "retention_days": 5,
        "encryption": "both",
        "justification": "Backup"
    })
    assert dec_rejected_personal.status == "Rejected"
    assert "personal" in dec_rejected_personal.rationale.lower()

    # Rule: If contains_pii = yes and encryption = none -> Needs More Info
    dec_needs_info = wf.evaluate_decision({
        "dataset": "User emails",
        "destination": "partner-sftp-server",
        "contains_pii": "yes",
        "retention_days": 10,
        "encryption": "none",
        "justification": "External reporting"
    })
    assert dec_needs_info.status == "Needs More Info"
    assert "encryption" in dec_needs_info.rationale.lower()

    # Rule: Otherwise -> Approved (e.g. contains_pii = no, encryption = none, destination is personal/gmail)
    dec_approved_no_pii_gmail = wf.evaluate_decision({
        "dataset": "Public statistics",
        "destination": "bob.personal@gmail.com",
        "contains_pii": "no",
        "retention_days": 30,
        "encryption": "none",
        "justification": "Public reporting"
    })
    assert dec_approved_no_pii_gmail.status == "Approved"

    # Rule: Otherwise -> Approved (contains_pii = yes, encryption = both, partner destination)
    dec_approved_pii_encrypted = wf.evaluate_decision({
        "dataset": "User emails",
        "destination": "partner-sftp-server",
        "contains_pii": "yes",
        "retention_days": 10,
        "encryption": "both",
        "justification": "External reporting"
    })
    assert dec_approved_pii_encrypted.status == "Approved"


def test_privileged_access_workflow():
    from backend.app.workflows.privileged_access import PrivilegedAccessWorkflow
    wf = PrivilegedAccessWorkflow()
    assert wf.name == "Privileged Access"
    assert "requester" in wf.required_fields
    assert "duration_days" in wf.required_fields

    # Rule: If manager_approval = no -> Needs More Info
    dec_needs_info_mgr = wf.evaluate_decision({
        "requester": "alice@acme.com",
        "system": "prod-db",
        "role": "readonly",
        "duration_days": 3,
        "manager_approval": "no",
        "justification": "Debug production issue"
    })
    assert dec_needs_info_mgr.status == "Needs More Info"
    assert "manager" in dec_needs_info_mgr.rationale.lower()

    # Rule: If role contains 'admin' and duration_days > 7 -> Needs More Info
    dec_needs_info_admin_days = wf.evaluate_decision({
        "requester": "alice@acme.com",
        "system": "prod-db",
        "role": "SuperAdmin",
        "duration_days": 10,
        "manager_approval": "yes",
        "justification": "On-call rotation"
    })
    assert dec_needs_info_admin_days.status == "Needs More Info"
    assert "duration" in dec_needs_info_admin_days.rationale.lower() or "7" in dec_needs_info_admin_days.rationale.lower()

    # Rule: Otherwise -> Approved (e.g. role contains admin but duration_days <= 7)
    dec_approved_admin_short = wf.evaluate_decision({
        "requester": "alice@acme.com",
        "system": "prod-db",
        "role": "SuperAdmin",
        "duration_days": 5,
        "manager_approval": "yes",
        "justification": "On-call rotation"
    })
    assert dec_approved_admin_short.status == "Approved"

    # Rule: Otherwise -> Approved (e.g. role is readonly, duration_days > 7)
    dec_approved_readonly_long = wf.evaluate_decision({
        "requester": "alice@acme.com",
        "system": "prod-db",
        "role": "readonly",
        "duration_days": 30,
        "manager_approval": "yes",
        "justification": "Long term support"
    })
    assert dec_approved_readonly_long.status == "Approved"


