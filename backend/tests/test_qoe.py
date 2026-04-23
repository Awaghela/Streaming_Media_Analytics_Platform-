"""
Unit tests for QoE computation and log parser.
Run with: pytest tests/ -v
"""
import pytest
from app.services.qoe_service import compute_qoe_score, aggregate_session_metrics
from app.services.log_parser import parse_cdn_log, parse_json_log, parse_mpd_representations
from app.models.models import PlaybackEvent


# ─── QoE Score ────────────────────────────────────────────────────────────────

def test_perfect_session():
    score = compute_qoe_score(
        startup_delay_ms=500,
        total_buffering_ms=0,
        watch_time_s=600,
        bitrate_switches=1,
        error_count=0,
        completion_rate=1.0,
    )
    assert score > 90, f"Expected >90, got {score}"


def test_terrible_session():
    score = compute_qoe_score(
        startup_delay_ms=15000,
        total_buffering_ms=120000,
        watch_time_s=300,
        bitrate_switches=20,
        error_count=5,
        completion_rate=0.1,
    )
    assert score < 40, f"Expected <40, got {score}"


def test_score_clamped_0_100():
    score = compute_qoe_score(
        startup_delay_ms=100000,
        total_buffering_ms=9999999,
        watch_time_s=10,
        bitrate_switches=1000,
        error_count=100,
        completion_rate=0.0,
    )
    assert 0 <= score <= 100


def test_none_inputs_dont_crash():
    score = compute_qoe_score(None, None, None, None, None, None)
    assert 0 <= score <= 100


# ─── CDN Log Parser ───────────────────────────────────────────────────────────

CDN_SAMPLE = """
2025-08-15T10:00:00Z session=sess1 type=session_start
2025-08-15T10:00:00Z session=sess1 type=manifest_load url=/dash/manifest.mpd load_time_ms=120
2025-08-15T10:00:01Z session=sess1 type=play playback_time=0
2025-08-15T10:00:05Z session=sess1 type=segment_load url=/dash/seg1.m4s duration=4.0 load_time_ms=50 bitrate=1500 buffer=8.0 playback_time=4
2025-08-15T10:00:09Z session=sess1 type=bitrate_change bitrate=3000 buffer=12.0 playback_time=8
2025-08-15T10:00:13Z session=sess1 type=buffer_start playback_time=12 buffer=0
2025-08-15T10:00:15Z session=sess1 type=buffer_end playback_time=12 buffer=3.5
2025-08-15T10:00:16Z session=sess1 type=error error=404 playback_time=12
2025-08-15T10:00:30Z session=sess1 type=session_end playback_time=120
"""


def test_parse_cdn_log_count():
    events = parse_cdn_log(CDN_SAMPLE)
    assert len(events) == 9


def test_parse_cdn_log_types():
    events = parse_cdn_log(CDN_SAMPLE)
    types = [e.event_type for e in events]
    assert 'session_start' in types
    assert 'bitrate_change' in types
    assert 'buffer_start' in types
    assert 'error' in types


def test_parse_cdn_log_bitrate():
    events = parse_cdn_log(CDN_SAMPLE)
    seg = next(e for e in events if e.event_type == 'segment_load')
    assert seg.bitrate == 1500
    assert seg.segment_load_time == 50.0
    assert seg.buffer_level == 8.0


def test_parse_cdn_log_all_same_session():
    events = parse_cdn_log(CDN_SAMPLE)
    assert all(e.session_id == 'sess1' for e in events)


def test_parse_cdn_ignores_comments():
    log = "# header comment\n2025-08-15T10:00:00Z session=s type=session_start\n"
    events = parse_cdn_log(log)
    assert len(events) == 1


# ─── JSON Log Parser ──────────────────────────────────────────────────────────

JSON_SAMPLE = [
    {"sessionId": "j1", "type": "session_start", "wallClockTime": 1723716000000},
    {"sessionId": "j1", "type": "play", "wallClockTime": 1723716002000, "playbackTime": 0},
    {"sessionId": "j1", "type": "bitrate_change", "wallClockTime": 1723716005000, "bitrate": 5000, "bufferLevel": 12.0},
    {"sessionId": "j1", "type": "session_end", "wallClockTime": 1723716240000, "playbackTime": 300},
]


def test_parse_json_log():
    import json
    events = parse_json_log(json.dumps(JSON_SAMPLE))
    assert len(events) == 4
    bc = next(e for e in events if e.event_type == 'bitrate_change')
    assert bc.bitrate == 5000
    assert bc.buffer_level == 12.0


def test_parse_json_log_invalid():
    events = parse_json_log("not valid json {{{")
    assert events == []


# ─── MPD Parser ───────────────────────────────────────────────────────────────

MPD_SAMPLE = """
<MPD>
  <AdaptationSet>
    <Representation id="v1" bandwidth="400000" width="640" height="360" codecs="avc1"/>
    <Representation id="v2" bandwidth="1500000" width="1280" height="720" codecs="avc1"/>
    <Representation id="v3" bandwidth="5000000" width="1920" height="1080" codecs="avc1"/>
  </AdaptationSet>
</MPD>
"""


def test_parse_mpd_representations():
    reps = parse_mpd_representations(MPD_SAMPLE)
    assert len(reps) == 3
    assert reps[0]['bandwidth_kbps'] == 400
    assert reps[2]['width'] == 1920
    assert reps[1]['height'] == 720


# ─── Aggregate metrics ────────────────────────────────────────────────────────

def _make_event(**kwargs):
    """Minimal fake PlaybackEvent (not a real ORM object)."""
    ev = PlaybackEvent.__new__(PlaybackEvent)
    defaults = dict(
        event_type='segment_load', wall_clock_time=0,
        playback_time=None, bitrate=None, buffer_level=None,
        segment_load_time=None, error_code=None, segment_duration=None,
    )
    for k, v in {**defaults, **kwargs}.items():
        setattr(ev, k, v)
    return ev


def test_aggregate_startup_delay():
    events = [
        _make_event(event_type='session_start', wall_clock_time=1000),
        _make_event(event_type='play', wall_clock_time=3500),
    ]
    m = aggregate_session_metrics('s1', events)
    assert m['startup_delay_ms'] == pytest.approx(2500)


def test_aggregate_buffering():
    events = [
        _make_event(event_type='buffer_start', wall_clock_time=5000),
        _make_event(event_type='buffer_end', wall_clock_time=8000),
    ]
    m = aggregate_session_metrics('s1', events)
    assert m['total_buffering_duration_ms'] == pytest.approx(3000)
    assert m['buffering_events_count'] == 1


def test_aggregate_bitrate_switches():
    events = [
        _make_event(event_type='bitrate_change', wall_clock_time=1000, bitrate=1500),
        _make_event(event_type='bitrate_change', wall_clock_time=2000, bitrate=3000),
        _make_event(event_type='bitrate_change', wall_clock_time=3000, bitrate=800),
    ]
    m = aggregate_session_metrics('s1', events)
    assert m['bitrate_switches_count'] == 2
    assert m['average_bitrate_kbps'] == pytest.approx((1500 + 3000 + 800) / 3)
