from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Event ───────────────────────────────────────────────────────────────────

class PlaybackEventCreate(BaseModel):
    session_id: str
    event_type: str
    playback_time: Optional[float] = None
    wall_clock_time: Optional[float] = None
    bitrate: Optional[int] = None
    resolution_width: Optional[int] = None
    resolution_height: Optional[int] = None
    buffer_level: Optional[float] = None
    segment_url: Optional[str] = None
    segment_duration: Optional[float] = None
    segment_load_time: Optional[float] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class PlaybackEventOut(PlaybackEventCreate):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# ─── Session ─────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    content_id: Optional[str] = None
    content_title: Optional[str] = None
    cdn: Optional[str] = None
    player_version: Optional[str] = None
    device_type: Optional[str] = None
    os: Optional[str] = None
    browser: Optional[str] = None
    network_type: Optional[str] = None
    ip_address: Optional[str] = None
    country: Optional[str] = None
    isp: Optional[str] = None


class SessionOut(SessionCreate):
    id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── QoE Metrics ─────────────────────────────────────────────────────────────

class QoEMetricsOut(BaseModel):
    session_id: str
    startup_delay_ms: Optional[float] = None
    total_buffering_duration_ms: Optional[float] = None
    buffering_events_count: Optional[int] = None
    bitrate_switches_count: Optional[int] = None
    average_bitrate_kbps: Optional[float] = None
    max_bitrate_kbps: Optional[float] = None
    min_bitrate_kbps: Optional[float] = None
    total_watch_time_s: Optional[float] = None
    completion_rate: Optional[float] = None
    error_count: Optional[int] = None
    segment_failures: Optional[int] = None
    manifest_load_time_ms: Optional[float] = None
    average_buffer_level_s: Optional[float] = None
    qoe_score: Optional[float] = None
    computed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Ingest ──────────────────────────────────────────────────────────────────

class BatchIngestPayload(BaseModel):
    session: SessionCreate
    events: List[PlaybackEventCreate]


# ─── Analysis ────────────────────────────────────────────────────────────────

class AggregatedMetrics(BaseModel):
    avg_startup_delay_ms: Optional[float]
    avg_buffering_duration_ms: Optional[float]
    avg_bitrate_switches: Optional[float]
    avg_qoe_score: Optional[float]
    total_sessions: int
    error_rate: Optional[float]
    avg_completion_rate: Optional[float]


class TimeSeriesPoint(BaseModel):
    ts: str
    value: float


class BitrateDistribution(BaseModel):
    bitrate_kbps: int
    count: int
    pct: float


class BufferingByNetwork(BaseModel):
    network_type: str
    avg_buffering_ms: float
    session_count: int
