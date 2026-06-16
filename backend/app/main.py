from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, get_args, get_origin
import types


from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import engine, Base, get_db
from backend.app.models import Session as SessionModel, Message as MessageModel, AuditLog as AuditLogModel
from backend.app.engine import Engine

# Create tables on startup
Base.metadata.create_all(bind=engine)

# Engine is initialised inside lifespan so validate_production() runs first.
engine_instance: Engine = None  # type: ignore[assignment]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Guard: raises ValueError if production config is incomplete.
    settings.validate_production()
    global engine_instance
    engine_instance = Engine()
    yield


app = FastAPI(
    title="Security Workflow Assistant API",
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionCreate(BaseModel):
    workflow_name: str
    form_values: Dict[str, Any]
    refitted_from: Optional[str] = None


class SessionUpdate(BaseModel):
    workflow_name: str
    form_values: Dict[str, Any]



class MessageCreate(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def message_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message must not be empty")
        return value.strip()


def _extract_field_choices(annotation: object) -> Optional[List[str]]:
    """Safely extract choices from Literal or Optional[Literal[...]] annotations."""
    from typing import Literal
    origin = get_origin(annotation)
    args = get_args(annotation)

    # Handle Optional[X] → Union[X, None] — unwrap and recurse on the real type
    if str(origin) == "typing.Union" or (hasattr(types, "UnionType") and origin is getattr(types, "UnionType")):
        non_none = [a for a in args if a is not type(None)]
        if non_none:
            return _extract_field_choices(non_none[0])
        return None

    # Handle Literal["a", "b", ...]
    if origin is Literal or str(origin) == "typing.Literal" or str(origin).endswith("Literal"):
        return [str(a) for a in args]

    return None


def _field_type_name(annotation: object) -> str:
    """Return a human-readable type name, unwrapping Optional if needed."""
    origin = get_origin(annotation)
    args = get_args(annotation)

    # Handle Optional[X] / Union[X, None]
    if str(origin) in ("typing.Union", "typing.Optional"):
        non_none = [a for a in args if a is not type(None)]
        if non_none:
            return _field_type_name(non_none[0])

    return getattr(annotation, "__name__", str(annotation))


@app.get("/api/workflows")
def get_workflows():
    result = []
    for name, wf in engine_instance.workflows.items():
        fields = []
        for field_name, field_info in wf.input_model.model_fields.items():
            annotation = field_info.annotation
            fields.append({
                "name": field_name,
                "description": field_info.description or field_name,
                "required": field_info.is_required(),
                "type": _field_type_name(annotation),
                "choices": _extract_field_choices(annotation),
            })
        result.append({
            "name": wf.name,
            "description": wf.description,
            "fields": fields,
        })
    return result


@app.get("/api/sessions")
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(SessionModel).order_by(SessionModel.updated_at.desc()).all()
    result = []
    for s in sessions:
        audit_log = db.query(AuditLogModel).filter_by(session_id=s.id).first()
        result.append({
            "id": s.id,
            "status": s.status,
            "workflow_name": s.workflow_name,
            "extracted_fields": s.extracted_fields,
            "updated_at": s.updated_at,
            "refitted_from": s.refitted_from,
            "decision": audit_log.decision if audit_log else None
        })
    return result


@app.post("/api/sessions")
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    try:
        session_id, session, assistant_reply = engine_instance.start_session(
            db=db,
            workflow_name=payload.workflow_name,
            initial_fields=payload.form_values,
            refitted_from=payload.refitted_from,
        )
        return {
            "id": session_id,
            "status": session.status,
            "last_message": assistant_reply,
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
        "refitted_from": session.refitted_from,
        "messages": [{"role": m.role, "content": m.content, "timestamp": m.timestamp} for m in messages],
        "audit_log": {
            "decision": audit_log.decision,
            "rationale": audit_log.rationale,
            "final_response": audit_log.final_response,
            "timestamp": audit_log.timestamp,
        } if audit_log else None,
    }


@app.post("/api/sessions/{session_id}/messages")
def send_message(session_id: str, payload: MessageCreate, db: Session = Depends(get_db)):
    try:
        sess_id, session, assistant_reply = engine_instance.process_message(
            db=db,
            session_id=session_id,
            message=payload.message,
        )
        return {
            "id": session_id,
            "status": session.status,
            "last_message": assistant_reply,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/sessions/{session_id}")
def update_session(session_id: str, payload: SessionUpdate, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session is already completed")

    cleaned_fields = {k: v for k, v in payload.form_values.items() if v is not None and v != ""}
    session.workflow_name = payload.workflow_name
    session.extracted_fields = cleaned_fields
    db.commit()

    summary = f"Updated workflow '{payload.workflow_name}' settings: " + ", ".join([f"{k}={v}" for k, v in cleaned_fields.items()])
    msg = MessageModel(session_id=session_id, role="user", content=summary)
    db.add(msg)
    db.commit()

    assistant_reply = engine_instance._evaluate_and_respond(db, session)
    return {
        "id": session_id,
        "status": session.status,
        "last_message": assistant_reply,
    }


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"detail": "Session deleted"}
