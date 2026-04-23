"""
QoE (Quality of Experience) computation service.
Aggregates playback events into meaningful metrics.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import PlaybackEvent, QoEMetrics, StreamingSession, EventType
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def compute_qoe_score(
    startup_delay_ms: Optional[float],
    rebuffering_ratio: Optional[float],
    bitrate_switches: int,
    avg_bitrate_kbps: Optional[float],
    error_count: int,
) -> float:
    """
    ITU-T G.1030-inspired QoE score (0-10).
    Higher is better.
    """
    score = 10.0

    # Startup delay penalty (>2s is bad)
    if startup_delay_ms:
        if startup_delay_ms > 5000:
            score -= 2.5
        elif startup_delay_ms > 2000:
            score -= 1.5
        elif startup_delay_ms > 1000:
            score -= 0.5

    # Rebuffering penalty
    if rebuffering_ratio:
        score -= min(3.0, rebuffering_ratio * 30)

    # Bitrate instability
    if bitrate_switches > 10:
        score -= 1.5
    elif bitrate_switches > 5:
        score -= 0.75

    # Bitrate quality
    if avg_bitrate_kbps:
        if avg_bitrate_kbps < 500:
            score -= 1.5
        elif avg_bitrate_kbps < 1500:
            score -= 0.5

    # Error penalty
    score -= min(2.0, error_count * 0.5)

    return max(0.0, min(10.0, round(score, 2)))


def compute_session_metrics(session_id: str, db: Session) -> Optional[QoEMetrics]:
    session = db.query(StreamingSession).filter(
        StreamingSession.session_id == session_id
    ).first()
    if not session:
        return None

    events = db.query(PlaybackEvent).filter(
        PlaybackEvent.session_id == session_id
    ).order_by(PlaybackEvent.timestamp).all()

    if not events:
        return None

    startup_delay_ms = None
    total_buffering_ms = 0.0
    buffering_count = 0
    bitrate_switches = 0
    bitrates = []
    error_count = 0
    buffer_start_time = None

    for ev in events:
        if ev.event_type == EventType.startup and ev.playback_position_ms is not None:
            startup_delay_ms = float(ev.playback_position_ms)
        elif ev.event_type == EventType.buffer_start:
            buffer_start_time = ev.timestamp
            buffering_count += 1
        elif ev.event_type == EventType.buffer_end and buffer_start_time:
            delta = (ev.timestamp - buffer_start_time).total_seconds() * 1000
            total_buffering_ms += max(0, delta)
            buffer_start_time = None
        elif ev.event_type == EventType.bitrate_switch:
            bitrate_switches += 1
            if ev.bitrate_kbps:
                bitrates.append(ev.bitrate_kbps)
        elif ev.event_type == EventType.error:
            error_count += 1

    total_play_ms = session.total_duration_ms or 1
    rebuffering_ratio = total_buffering_ms / total_play_ms if total_play_ms > 0 else 0.0
    avg_bitrate = sum(bitrates) / len(bitrates) if bitrates else None

    qoe_score = compute_qoe_score(
        startup_delay_ms, rebuffering_ratio, bitrate_switches, avg_bitrate, error_count
    )

    existing = db.query(QoEMetrics).filter(QoEMetrics.session_id == session_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    metrics = QoEMetrics(
        session_id=session_id,
        startup_delay_ms=startup_delay_ms,
        total_buffering_ms=total_buffering_ms,
        buffering_count=buffering_count,
        bitrate_switches=bitrate_switches,
        avg_bitrate_kbps=avg_bitrate,
        min_bitrate_kbps=min(bitrates) if bitrates else None,
        max_bitrate_kbps=max(bitrates) if bitrates else None,
        error_count=error_count,
        rebuffering_ratio=rebuffering_ratio,
        qoe_score=qoe_score,
    )
    db.add(metrics)
    db.commit()
    db.refresh(metrics)
    return metrics
