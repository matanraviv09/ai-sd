import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session as DBSession
from backend.app.models import Session as SessionModel, Message as MessageModel, AuditLog as AuditLogModel
from backend.app.openai_client import OpenAIClient
from backend.app.workflows import WORKFLOW_REGISTRY

class Engine:
    def __init__(self):
        self.openai_client = OpenAIClient()
        # Dynamically instantiate all registered workflows
        self.workflows = {
            name: workflow_cls() for name, workflow_cls in WORKFLOW_REGISTRY.items()
        }

    def get_workflow(self, name: str):
        if name not in self.workflows:
            raise ValueError(f"Unknown workflow: {name}")
        return self.workflows[name]

    def start_session(self, db: DBSession, workflow_name: str, initial_fields: Dict[str, Any], refitted_from: Optional[str] = None) -> tuple[str, SessionModel, str]:
        session_id = str(uuid.uuid4())
        wf = self.get_workflow(workflow_name)
        
        # Clean initial_fields: filter out None or empty strings
        cleaned_fields = {k: v for k, v in initial_fields.items() if v is not None and v != ""}
        
        session = SessionModel(
            id=session_id,
            status="active",
            workflow_name=workflow_name,
            extracted_fields=cleaned_fields,
            refitted_from=refitted_from
        )
        db.add(session)
        
        # Add initial message summarizing the request
        summary = f"Started workflow '{workflow_name}' with fields: " + ", ".join([f"{k}={v}" for k, v in cleaned_fields.items()])
        msg = MessageModel(session_id=session_id, role="user", content=summary)
        db.add(msg)
        db.commit()

        return session_id, session, self._evaluate_and_respond(db, session)

    def process_message(self, db: DBSession, session_id: str, message: str) -> tuple[str, SessionModel, str]:
        session = db.query(SessionModel).filter_by(id=session_id).first()
        if not session:
            raise ValueError("Session not found")
        if session.status == "completed":
            raise ValueError("Session is already completed")

        # Save user message
        user_msg = MessageModel(session_id=session_id, role="user", content=message)
        db.add(user_msg)
        db.commit()

        # Retrieve messages
        db_messages = db.query(MessageModel).filter_by(session_id=session_id).order_by(MessageModel.id.asc()).all()
        messages_list = [{"role": m.role, "content": m.content} for m in db_messages]

        # Extract new fields using LLM
        wf = self.get_workflow(session.workflow_name)
        new_fields = self.openai_client.extract_fields(
            model=wf.input_model,
            current_fields=session.extracted_fields,
            messages=messages_list
        )
        
        # Update session with new fields
        updated_fields = {**session.extracted_fields}
        for k, v in new_fields.items():
            if v is not None and v != "":
                updated_fields[k] = v
        
        session.extracted_fields = updated_fields
        db.commit()

        return session_id, session, self._evaluate_and_respond(db, session)

    def _evaluate_and_respond(self, db: DBSession, session: SessionModel) -> str:
        wf = self.get_workflow(session.workflow_name)
        extracted = session.extracted_fields or {}

        # Check missing fields
        missing_fields = []
        for field in wf.required_fields:
            if field not in extracted or extracted[field] is None or extracted[field] == "":
                missing_fields.append(field)

        db_messages = db.query(MessageModel).filter_by(session_id=session.id).order_by(MessageModel.id.asc()).all()
        messages_list = [{"role": m.role, "content": m.content} for m in db_messages]

        if missing_fields:
            # Get first missing field to query
            next_field = missing_fields[0]
            field_description = wf.input_model.model_fields[next_field].description or next_field
            
            # Generate follow up question
            follow_up = self.openai_client.generate_follow_up(
                missing_field=next_field,
                field_description=field_description,
                messages=messages_list
            )
            
            # Save assistant follow up
            assistant_msg = MessageModel(session_id=session.id, role="assistant", content=follow_up)
            db.add(assistant_msg)
            db.commit()
            return follow_up

        # All fields complete, evaluate decision!
        decision_obj = wf.evaluate_decision(extracted)
        
        # Generate final wording response
        final_response = self.openai_client.generate_final_response(
            workflow_name=session.workflow_name,
            status=decision_obj.status,
            rationale=decision_obj.rationale,
            metadata=decision_obj.metadata,
            messages=messages_list
        )

        # Only terminal decisions (Approved / Rejected) close the session.
        # "Needs More Info" keeps it active so the user can respond.
        TERMINAL_STATUSES = {"Approved", "Rejected"}
        if decision_obj.status in TERMINAL_STATUSES:
            session.status = "completed"
        
        # Save assistant final response
        assistant_msg = MessageModel(session_id=session.id, role="assistant", content=final_response)
        db.add(assistant_msg)

        # Write Audit Log
        audit_log = AuditLogModel(
            session_id=session.id,
            workflow_name=session.workflow_name,
            extracted_fields=extracted,
            decision=decision_obj.status,
            rationale=decision_obj.rationale,
            final_response=final_response
        )
        db.add(audit_log)
        db.commit()

        return final_response
