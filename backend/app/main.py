from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from backend.app.database import engine, Base, get_db
from backend.app.models import Session as SessionModel, Message as MessageModel, AuditLog as AuditLogModel
from backend.app.engine import Engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Security Workflow Assistant API")
engine_instance = Engine()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SessionCreate(BaseModel):
    workflow_name: str
    form_values: Dict[str, Any]

class MessageCreate(BaseModel):
    message: str

@app.get("/api/workflows")
def get_workflows():
    result = []
    for name, wf in engine_instance.workflows.items():
        # Extract field metadata dynamically from Pydantic input_model
        fields = []
        for field_name, field_info in wf.input_model.model_fields.items():
            fields.append({
                "name": field_name,
                "description": field_info.description or field_name,
                "type": getattr(field_info.annotation, "__name__", str(field_info.annotation)),
                "choices": list(field_info.annotation.__args__) if hasattr(field_info.annotation, "__args__") else None
            })
        result.append({
            "name": wf.name,
            "description": wf.description,
            "fields": fields
        })
    return result

@app.get("/api/sessions")
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(SessionModel).order_by(SessionModel.updated_at.desc()).all()
    return [{
        "id": s.id,
        "status": s.status,
        "workflow_name": s.workflow_name,
        "extracted_fields": s.extracted_fields,
        "updated_at": s.updated_at
    } for s in sessions]

@app.post("/api/sessions")
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    try:
        session_id, assistant_reply = engine_instance.start_session(
            db=db,
            workflow_name=payload.workflow_name,
            initial_fields=payload.form_values
        )
        
        session = db.query(SessionModel).filter_by(id=session_id).first()
        return {
            "id": session_id,
            "status": session.status,
            "last_message": assistant_reply
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages = db.query(MessageModel).filter_by(session_id=session_id).order_by(MessageModel.id.asc()).all()
    audit_log = db.query(AuditLogModel).filter_by(session_id=session_id).first()
    
    return {
        "id": session.id,
        "status": session.status,
        "workflow_name": session.workflow_name,
        "extracted_fields": session.extracted_fields,
        "messages": [{"role": m.role, "content": m.content, "timestamp": m.timestamp} for m in messages],
        "audit_log": {
            "decision": audit_log.decision,
            "rationale": audit_log.rationale,
            "final_response": audit_log.final_response,
            "timestamp": audit_log.timestamp
        } if audit_log else None
    }

@app.post("/api/sessions/{session_id}/messages")
def send_message(session_id: str, payload: MessageCreate, db: Session = Depends(get_db)):
    try:
        sess_id, assistant_reply = engine_instance.process_message(
            db=db,
            session_id=session_id,
            message=payload.message
        )
        session = db.query(SessionModel).filter_by(id=session_id).first()
        return {
            "id": session_id,
            "status": session.status,
            "last_message": assistant_reply
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"detail": "Session deleted"}
