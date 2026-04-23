from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.db.database import get_db
from app.models.models import QoEMetrics, StreamingSession, PlaybackEvent, NetworkCondition, EventType
from app.services.qoe_service import compute_session_metrics
from app.services.ffprobe_service import probe_media

router = APIRouter()


class QoEResponse(BaseModel):
    session_id: str
    startup_delay_ms: Optional[float]
    total_buffering_ms: float
    buffering_count: int
    bitrate_switches: int
    avg_bitrate_kbps: Optional[float]
    min_bitrate_kbps: Optional[int]
    max_bitrate_kbps: Optional[int]
    error_count: int
    rebuffering_ratio: Optional[float]
    qoe_score: Optional[float]
    computed_at: datetime

    class Config:
        from_attributes = True


@router.get("/session/{session_id}", response_model=QoEResponse)
def get_session_metrics(session_id: str, recompute: bool = False, db: Session = Depends(get_db)):
    if recompute:
        m = compute_session_metrics(session_id, db)
    else:
        m = db.query(QoEMetrics).filter(QoEMetrics.session_id == session_id).first()
        if not m:
            m = compute_session_metrics(session_id, db)
    if not m:
        raise HTTPException(status_code=404, detail="No metrics available for session")
    return m


@router.get("/aggregate")
def aggregate_metrics(
    hours: int = Query(24, ge=1, le=720),
    network_condition: Optional[NetworkCondition] = None,
    content_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(hours=hours)

    q = db.query(QoEMetrics, StreamingSession).join(
        StreamingSession, QoEMetrics.session_id == StreamingSession.session_id
    ).filter(StreamingSession.started_at >= since)

    if network_condition:
        q = q.filter(StreamingSession.network_condition == network_condition)
    if content_id:
        q = q.filter(StreamingSession.content_id == content_id)

    rows = q.all()
    if not rows:
        return {"count": 0}

    metrics_list = [r[0] for r in rows]
    n = len(metrics_list)

    def safe_avg(vals):
        vals = [v for v in vals if v is not None]
        return sum(vals) / len(vals) if vals else None

    return {
        "session_count": n,
        "avg_startup_delay_ms": safe_avg([m.startup_delay_ms for m in metrics_list]),
        "avg_buffering_ms": safe_avg([m.total_buffering_ms for m in metrics_list]),
        "avg_buffering_count": safe_avg([m.buffering_count for m in metrics_list]),
        "avg_bitrate_switches": safe_avg([m.bitrate_switches for m in metrics_list]),
        "avg_bitrate_kbps": safe_avg([m.avg_bitrate_kbps for m in metrics_list]),
        "avg_rebuffering_ratio": safe_avg([m.rebuffering_ratio for m in metrics_list]),
        "avg_qoe_score": safe_avg([m.qoe_score for m in metrics_list]),
        "error_rate": sum(1 for m in metrics_list if m.error_count > 0) / n,
        "p50_startup_ms": _percentile([m.startup_delay_ms for m in metrics_list if m.startup_delay_ms], 50),
        "p95_startup_ms": _percentile([m.startup_delay_ms for m in metrics_list if m.startup_delay_ms], 95),
        "p50_buffering_ms": _percentile([m.total_buffering_ms for m in metrics_list], 50),
        "p95_buffering_ms": _percentile([m.total_buffering_ms for m in metrics_list], 95),
    }


@router.get("/timeseries")
def metrics_timeseries(
    hours: int = Query(24, ge=1, le=168),
    bucket_minutes: int = Query(30, ge=5, le=1440),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = db.query(QoEMetrics, StreamingSession).join(
        StreamingSession, QoEMetrics.session_id == StreamingSession.session_id
    ).filter(StreamingSession.started_at >= since).all()

    buckets: dict = {}
    for qoe, sess in rows:
        ts = sess.started_at.replace(second=0, microsecond=0)
        bucket_floor = ts - timedelta(minutes=ts.minute % bucket_minutes)
        key = bucket_floor.isoformat()
        if key not in buckets:
            buckets[key] = {"startup": [], "buffering": [], "qoe": [], "bitrate": []}
        if qoe.startup_delay_ms:
            buckets[key]["startup"].append(qoe.startup_delay_ms)
        buckets[key]["buffering"].append(qoe.total_buffering_ms or 0)
        if qoe.qoe_score:
            buckets[key]["qoe"].append(qoe.qoe_score)
        if qoe.avg_bitrate_kbps:
            buckets[key]["bitrate"].append(qoe.avg_bitrate_kbps)

    def avg(lst):
        return sum(lst) / len(lst) if lst else None

    return [
        {
            "timestamp": k,
            "avg_startup_delay_ms": avg(v["startup"]),
            "avg_buffering_ms": avg(v["buffering"]),
            "avg_qoe_score": avg(v["qoe"]),
            "avg_bitrate_kbps": avg(v["bitrate"]),
            "session_count": len(v["qoe"]),
        }
        for k, v in sorted(buckets.items())
    ]


@router.get("/network-breakdown")
def network_breakdown(db: Session = Depends(get_db)):
    rows = db.query(QoEMetrics, StreamingSession).join(
        StreamingSession, QoEMetrics.session_id == StreamingSession.session_id
    ).all()

    result = {}
    for qoe, sess in rows:
        nc = sess.network_condition or "unknown"
        if nc not in result:
            result[nc] = {"qoe": [], "startup": [], "buffering": []}
        if qoe.qoe_score:
            result[nc]["qoe"].append(qoe.qoe_score)
        if qoe.startup_delay_ms:
            result[nc]["startup"].append(qoe.startup_delay_ms)
        result[nc]["buffering"].append(qoe.total_buffering_ms or 0)

    return [
        {
            "network_condition": nc,
            "avg_qoe_score": sum(v["qoe"]) / len(v["qoe"]) if v["qoe"] else None,
            "avg_startup_delay_ms": sum(v["startup"]) / len(v["startup"]) if v["startup"] else None,
            "avg_buffering_ms": sum(v["buffering"]) / len(v["buffering"]) if v["buffering"] else None,
            "session_count": len(v["buffering"]),
        }
        for nc, v in result.items()
    ]


@router.post("/probe-media")
def probe_media_endpoint(url: str):
    result = probe_media(url)
    if not result:
        raise HTTPException(status_code=422, detail="Could not probe media — check URL and FFmpeg installation")
    return result


def _percentile(data: list, p: int):
    if not data:
        return None
    data = sorted(data)
    idx = int(len(data) * p / 100)
    return data[min(idx, len(data) - 1)]
