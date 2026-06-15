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
