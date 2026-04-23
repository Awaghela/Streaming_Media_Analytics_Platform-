from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text
from typing import Optional, List
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.models import QoEMetrics, PlaybackEvent, StreamingSession

router = APIRouter()


@router.get("/buffering-by-network")
def buffering_by_network(db: Session = Depends(get_db)):
    rows = (
        db.query(
            StreamingSession.network_type,
            func.avg(QoEMetrics.total_buffering_duration_ms).label("avg_buffering_ms"),
            func.count(StreamingSession.id).label("session_count"),
        )
        .join(QoEMetrics, StreamingSession.session_id == QoEMetrics.session_id)
        .filter(StreamingSession.network_type.isnot(None))
        .group_by(StreamingSession.network_type)
        .all()
    )
    return [
        {
            "network_type": r.network_type,
            "avg_buffering_ms": round(r.avg_buffering_ms or 0, 2),
            "session_count": r.session_count,
        }
        for r in rows
    ]


@router.get("/startup-delay-distribution")
def startup_delay_distribution(
    buckets: int = 10,
    db: Session = Depends(get_db),
):
    rows = db.query(QoEMetrics.startup_delay_ms).filter(
        QoEMetrics.startup_delay_ms.isnot(None)
    ).all()
    values = sorted([r.startup_delay_ms for r in rows])
    if not values:
        return {"distribution": []}

    mn, mx = values[0], values[-1]
    bucket_size = (mx - mn) / buckets if mx != mn else 1
    dist = [0] * buckets
    for v in values:
        idx = min(int((v - mn) / bucket_size), buckets - 1)
        dist[idx] += 1

    return {
        "distribution": [
            {
                "bucket": i,
                "range_ms": [round(mn + i * bucket_size, 1), round(mn + (i + 1) * bucket_size, 1)],
                "count": dist[i],
            }
            for i in range(buckets)
        ]
    }


@router.get("/bitrate-switches")
def bitrate_switch_analysis(db: Session = Depends(get_db)):
    rows = db.query(
        func.avg(QoEMetrics.bitrate_switches_count).label("avg_switches"),
        func.max(QoEMetrics.bitrate_switches_count).label("max_switches"),
        func.min(QoEMetrics.bitrate_switches_count).label("min_switches"),
        func.count(QoEMetrics.id).label("total"),
    ).first()

    # Distribution by CDN
    cdn_rows = (
        db.query(
            StreamingSession.cdn,
            func.avg(QoEMetrics.bitrate_switches_count).label("avg_switches"),
            func.count().label("n"),
        )
        .join(QoEMetrics, StreamingSession.session_id == QoEMetrics.session_id)
        .filter(StreamingSession.cdn.isnot(None))
        .group_by(StreamingSession.cdn)
        .all()
    )

    return {
        "overall": {
            "avg": round(rows.avg_switches or 0, 2),
            "max": rows.max_switches or 0,
            "min": rows.min_switches or 0,
            "total_sessions": rows.total,
        },
        "by_cdn": [
            {"cdn": r.cdn, "avg_switches": round(r.avg_switches or 0, 2), "sessions": r.n}
            for r in cdn_rows
        ],
    }


@router.get("/error-analysis")
def error_analysis(db: Session = Depends(get_db)):
    # Top error codes
    rows = db.query(
        PlaybackEvent.error_code,
        func.count(PlaybackEvent.id).label("count"),
    ).filter(
        PlaybackEvent.error_code.isnot(None)
    ).group_by(PlaybackEvent.error_code).order_by(func.count(PlaybackEvent.id).desc()).limit(20).all()

    total_errors = sum(r.count for r in rows)

    return {
        "top_errors": [
            {
                "error_code": r.error_code,
                "count": r.count,
                "pct": round(r.count / total_errors * 100, 2) if total_errors else 0,
            }
            for r in rows
        ],
        "total_errors": total_errors,
    }


@router.get("/qoe-trend")
def qoe_trend(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Daily average QoE score trend."""
    rows = db.query(
        func.date_trunc("day", QoEMetrics.computed_at).label("day"),
        func.avg(QoEMetrics.qoe_score).label("avg_score"),
        func.count(QoEMetrics.id).label("sessions"),
    ).filter(
        QoEMetrics.computed_at >= datetime.utcnow() - timedelta(days=days)
    ).group_by(
        func.date_trunc("day", QoEMetrics.computed_at)
    ).order_by(
        func.date_trunc("day", QoEMetrics.computed_at)
    ).all()

    return [
        {
            "date": r.day.strftime("%Y-%m-%d") if r.day else None,
            "avg_qoe_score": round(r.avg_score or 0, 2),
            "sessions": r.sessions,
        }
        for r in rows
    ]


@router.get("/performance-by-content")
def performance_by_content(db: Session = Depends(get_db)):
    rows = (
        db.query(
            StreamingSession.content_id,
            StreamingSession.content_title,
            func.avg(QoEMetrics.qoe_score).label("avg_qoe"),
            func.avg(QoEMetrics.startup_delay_ms).label("avg_startup"),
            func.avg(QoEMetrics.total_buffering_duration_ms).label("avg_buffering"),
            func.count().label("sessions"),
        )
        .join(QoEMetrics, StreamingSession.session_id == QoEMetrics.session_id)
        .filter(StreamingSession.content_id.isnot(None))
        .group_by(StreamingSession.content_id, StreamingSession.content_title)
        .order_by(func.avg(QoEMetrics.qoe_score).desc())
        .limit(20)
        .all()
    )
    return [
        {
            "content_id": r.content_id,
            "content_title": r.content_title,
            "avg_qoe_score": round(r.avg_qoe or 0, 2),
            "avg_startup_ms": round(r.avg_startup or 0, 2),
            "avg_buffering_ms": round(r.avg_buffering or 0, 2),
            "sessions": r.sessions,
        }
        for r in rows
    ]
