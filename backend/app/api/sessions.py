from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.db.database import get_db
from app.models.models import StreamingSession, QoEMetrics, NetworkCondition

router = APIRouter()


class SessionCreate(BaseModel):
    content_id: str
    content_title: Optional[str] = None
    user_id: Optional[str] = None
    device_type: Optional[str] = None
    player_version: Optional[str] = None
    network_condition: Optional[NetworkCondition] = None
    cdn: Optional[str] = None


class SessionResponse(BaseModel):
    id: int
    session_id: str
    content_id: str
    content_title: Optional[str]
    user_id: Optional[str]
    device_type: Optional[str]
    network_condition: Optional[str]
    cdn: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    total_duration_ms: Optional[int]

    class Config:
        from_attributes = True


@router.post("/", response_model=SessionResponse, status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    session = StreamingSession(
        session_id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/", response_model=List[SessionResponse])
def list_sessions(
    skip: int = 0,
    limit: int = Query(50, le=200),
    content_id: Optional[str] = None,
    network_condition: Optional[NetworkCondition] = None,
    db: Session = Depends(get_db),
):
    q = db.query(StreamingSession)
    if content_id:
        q = q.filter(StreamingSession.content_id == content_id)
    if network_condition:
        q = q.filter(StreamingSession.network_condition == network_condition)
    return q.order_by(desc(StreamingSession.started_at)).offset(skip).limit(limit).all()


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(StreamingSession).filter(StreamingSession.session_id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


@router.patch("/{session_id}/end")
def end_session(session_id: str, total_duration_ms: Optional[int] = None, db: Session = Depends(get_db)):
    s = db.query(StreamingSession).filter(StreamingSession.session_id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.ended_at = datetime.utcnow()
    if total_duration_ms:
        s.total_duration_ms = total_duration_ms
    db.commit()
    return {"status": "ended"}
