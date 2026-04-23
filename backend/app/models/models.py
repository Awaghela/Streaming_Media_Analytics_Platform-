from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.database import Base


class NetworkCondition(str, enum.Enum):
    excellent = "excellent"
    good = "good"
    fair = "fair"
    poor = "poor"


class EventType(str, enum.Enum):
    startup = "startup"
    buffer_start = "buffer_start"
    buffer_end = "buffer_end"
    bitrate_switch = "bitrate_switch"
    error = "error"
    seek = "seek"
    play = "play"
    pause = "pause"
    end = "end"


class StreamingSession(Base):
    __tablename__ = "streaming_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True)
    content_id = Column(String(128), index=True)
    content_title = Column(String(256))
    user_id = Column(String(64), index=True)
    device_type = Column(String(64))
    player_version = Column(String(32))
    network_condition = Column(Enum(NetworkCondition))
    cdn = Column(String(64))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    total_duration_ms = Column(Integer, nullable=True)
    extra_metadata = Column(JSON, nullable=True)

    events = relationship("PlaybackEvent", back_populates="session")
    qoe_metrics = relationship("QoEMetrics", back_populates="session", uselist=False)


class PlaybackEvent(Base):
    __tablename__ = "playback_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("streaming_sessions.session_id"), index=True)
    event_type = Column(Enum(EventType), index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    playback_position_ms = Column(Integer, nullable=True)
    bitrate_kbps = Column(Integer, nullable=True)
    previous_bitrate_kbps = Column(Integer, nullable=True)
    buffer_level_ms = Column(Integer, nullable=True)
    error_code = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)
    segment_url = Column(Text, nullable=True)
    extra = Column(JSON, nullable=True)

    session = relationship("StreamingSession", back_populates="events")


class QoEMetrics(Base):
    __tablename__ = "qoe_metrics"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("streaming_sessions.session_id"), unique=True, index=True)
    startup_delay_ms = Column(Float, nullable=True)
    total_buffering_ms = Column(Float, default=0)
    buffering_count = Column(Integer, default=0)
    bitrate_switches = Column(Integer, default=0)
    avg_bitrate_kbps = Column(Float, nullable=True)
    min_bitrate_kbps = Column(Integer, nullable=True)
    max_bitrate_kbps = Column(Integer, nullable=True)
    error_count = Column(Integer, default=0)
    rebuffering_ratio = Column(Float, nullable=True)
    qoe_score = Column(Float, nullable=True)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("StreamingSession", back_populates="qoe_metrics")
