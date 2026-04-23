from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.models.models import PlaybackEvent, StreamingSession, EventType
from app.services.log_parser import parse_log_file
from app.services.qoe_service import compute_session_metrics

router = APIRouter()


class EventCreate(BaseModel):
    event_type: EventType
    playback_position_ms: Optional[int] = None
    bitrate_kbps: Optional[int] = None
    previous_bitrate_kbps: Optional[int] = None
    buffer_level_ms: Optional[int] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    segment_url: Optional[str] = None
    extra: Optional[dict] = None


class EventResponse(BaseModel):
    id: int
    session_id: str
    event_type: str
    timestamp: datetime
    playback_position_ms: Optional[int]
    bitrate_kbps: Optional[int]
    buffer_level_ms: Optional[int]
    error_code: Optional[str]

    class Config:
        from_attributes = True


@router.post("/{session_id}", response_model=EventResponse, status_code=201)
def ingest_event(session_id: str, payload: EventCreate, db: Session = Depends(get_db)):
    s = db.query(StreamingSession).filter(StreamingSession.session_id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    event = PlaybackEvent(session_id=session_id, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{session_id}/batch", status_code=201)
def ingest_events_batch(session_id: str, events: List[EventCreate], db: Session = Depends(get_db)):
    s = db.query(StreamingSession).filter(StreamingSession.session_id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    objs = [PlaybackEvent(session_id=session_id, **e.model_dump()) for e in events]
    db.bulk_save_objects(objs)
    db.commit()
    # Recompute metrics after batch ingest
    compute_session_metrics(session_id, db)
    return {"ingested": len(objs)}


@router.post("/{session_id}/upload-log")
async def upload_dash_log(session_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    s = db.query(StreamingSession).filter(StreamingSession.session_id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    content = await file.read()
    parsed = parse_log_file(content.decode("utf-8", errors="replace"))

    objs = []
    for ev in parsed:
        try:
            obj = PlaybackEvent(
                session_id=session_id,
                event_type=ev.get("event_type", "unknown"),
                playback_position_ms=ev.get("playback_position_ms"),
                bitrate_kbps=ev.get("bitrate_kbps"),
                previous_bitrate_kbps=ev.get("previous_bitrate_kbps"),
                buffer_level_ms=ev.get("buffer_level_ms"),
                error_code=ev.get("error_code"),
                error_message=ev.get("error_message"),
                segment_url=ev.get("segment_url"),
                extra=ev.get("extra"),
            )
            objs.append(obj)
        except Exception:
            continue

    db.bulk_save_objects(objs)
    db.commit()
    compute_session_metrics(session_id, db)
    return {"parsed": len(parsed), "ingested": len(objs)}


@router.get("/{session_id}", response_model=List[EventResponse])
def get_session_events(session_id: str, event_type: Optional[EventType] = None, db: Session = Depends(get_db)):
    q = db.query(PlaybackEvent).filter(PlaybackEvent.session_id == session_id)
    if event_type:
        q = q.filter(PlaybackEvent.event_type == event_type)
    return q.order_by(PlaybackEvent.timestamp).all()
