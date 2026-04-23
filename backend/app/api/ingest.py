from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import StreamingSession, PlaybackEvent
from app.models.schemas import BatchIngestPayload
from app.services.qoe_service import aggregate_session_metrics, upsert_qoe_metrics
from app.services.log_parser import parse_cdn_log, parse_json_log

router = APIRouter()


@router.post("/batch")
def batch_ingest(payload: BatchIngestPayload, db: Session = Depends(get_db)):
    """Ingest a session + its events in one request, then compute metrics."""
    # Upsert session
    session = db.query(StreamingSession).filter(
        StreamingSession.session_id == payload.session.session_id
    ).first()
    if not session:
        session = StreamingSession(**payload.session.dict())
        db.add(session)
        db.flush()

    # Insert events
    events_orm = [PlaybackEvent(**ev.dict()) for ev in payload.events]
    db.bulk_save_objects(events_orm)
    db.commit()

    # Compute metrics immediately
    all_events = db.query(PlaybackEvent).filter(
        PlaybackEvent.session_id == payload.session.session_id
    ).all()
    metrics_data = aggregate_session_metrics(payload.session.session_id, all_events)
    upsert_qoe_metrics(db, payload.session.session_id, metrics_data)

    return {
        "session_id": payload.session.session_id,
        "events_inserted": len(events_orm),
        "metrics_computed": True,
        "qoe_score": metrics_data.get("qoe_score"),
    }


@router.post("/log/cdn")
async def ingest_cdn_log(
    file: UploadFile = File(...),
    session_prefix: str = "",
    db: Session = Depends(get_db),
):
    """Upload a raw CDN access log file for parsing and ingest."""
    content = await file.read()
    raw = content.decode("utf-8", errors="ignore")
    events_parsed = parse_cdn_log(raw)

    if not events_parsed:
        raise HTTPException(status_code=422, detail="No parseable events found in log")

    # Group by session
    by_session: dict = {}
    for ev in events_parsed:
        sid = ev.session_id
        by_session.setdefault(sid, []).append(ev)

    inserted_sessions = 0
    total_events = 0

    for sid, evs in by_session.items():
        session = db.query(StreamingSession).filter(
            StreamingSession.session_id == sid
        ).first()
        if not session:
            session = StreamingSession(session_id=sid)
            db.add(session)
            db.flush()

        for ev in evs:
            db.add(PlaybackEvent(
                session_id=ev.session_id,
                event_type=ev.event_type,
                wall_clock_time=ev.wall_clock_time,
                playback_time=ev.playback_time,
                bitrate=ev.bitrate,
                buffer_level=ev.buffer_level,
                segment_url=ev.segment_url,
                segment_duration=ev.segment_duration,
                segment_load_time=ev.segment_load_time,
                error_code=ev.error_code,
                error_message=ev.error_message,
            ))
        total_events += len(evs)
        inserted_sessions += 1

    db.commit()

    # Compute metrics for newly imported sessions
    for sid in by_session:
        all_evs = db.query(PlaybackEvent).filter(PlaybackEvent.session_id == sid).all()
        metrics_data = aggregate_session_metrics(sid, all_evs)
        upsert_qoe_metrics(db, sid, metrics_data)

    return {
        "sessions_imported": inserted_sessions,
        "events_imported": total_events,
        "filename": file.filename,
    }


@router.post("/log/json")
async def ingest_json_log(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a JSON player log for parsing and ingest."""
    content = await file.read()
    raw = content.decode("utf-8", errors="ignore")
    events_parsed = parse_json_log(raw)

    if not events_parsed:
        raise HTTPException(status_code=422, detail="No parseable events in JSON log")

    by_session: dict = {}
    for ev in events_parsed:
        by_session.setdefault(ev.session_id, []).append(ev)

    total_events = 0
    for sid, evs in by_session.items():
        session = db.query(StreamingSession).filter(
            StreamingSession.session_id == sid
        ).first()
        if not session:
            session = StreamingSession(session_id=sid)
            db.add(session)
            db.flush()

        for ev in evs:
            db.add(PlaybackEvent(
                session_id=ev.session_id,
                event_type=ev.event_type,
                wall_clock_time=ev.wall_clock_time,
                playback_time=ev.playback_time,
                bitrate=ev.bitrate,
                resolution_width=ev.resolution_width,
                resolution_height=ev.resolution_height,
                buffer_level=ev.buffer_level,
                segment_url=ev.segment_url,
                segment_duration=ev.segment_duration,
                segment_load_time=ev.segment_load_time,
                error_code=ev.error_code,
                error_message=ev.error_message,
            ))
        total_events += len(evs)

    db.commit()

    for sid in by_session:
        all_evs = db.query(PlaybackEvent).filter(PlaybackEvent.session_id == sid).all()
        metrics_data = aggregate_session_metrics(sid, all_evs)
        upsert_qoe_metrics(db, sid, metrics_data)

    return {
        "sessions_imported": len(by_session),
        "events_imported": total_events,
    }
