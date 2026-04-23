"""
Seed the database with realistic demo data.
Run inside container: python /scripts/seed_data.py
"""
import sys, os, random, uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, '/app')

from app.db.database import SessionLocal, engine, Base
from app.models.models import StreamingSession, PlaybackEvent
from app.services.qoe_service import aggregate_session_metrics, upsert_qoe_metrics

Base.metadata.create_all(bind=engine)

CONTENTS = [
    ("c001", "Big Buck Bunny"),
    ("c002", "Elephants Dream"),
    ("c003", "Tears of Steel"),
    ("c004", "Sintel"),
    ("c005", "Cosmos Laundromat"),
]
CDNS = ["Akamai", "Cloudfront", "Fastly", "Cloudflare"]
NETWORK_TYPES = ["wifi", "4g", "5g", "3g", "ethernet"]
DEVICE_TYPES = ["desktop", "mobile", "tablet", "tv"]
BROWSERS = ["Chrome", "Firefox", "Safari", "Edge"]
OSES = ["Windows", "macOS", "Linux", "iOS", "Android"]
COUNTRIES = ["US", "DE", "GB", "FR", "JP", "BR", "IN"]
BITRATE_LADDER = [400, 800, 1500, 3000, 5000, 8000]


def random_dt(days_ago_max=14):
    return datetime.now(timezone.utc) - timedelta(
        days=random.uniform(0, days_ago_max),
        hours=random.uniform(0, 23),
    )


def generate_events(session_id, start_wall, content_duration):
    events = []
    t = start_wall

    events.append(dict(session_id=session_id, event_type="session_start", wall_clock_time=t, playback_time=0))

    manifest_ms = random.uniform(50, 400)
    t += manifest_ms
    events.append(dict(session_id=session_id, event_type="manifest_load", wall_clock_time=t, segment_load_time=manifest_ms))

    startup_ms = random.uniform(300, 8000)
    t += startup_ms
    events.append(dict(session_id=session_id, event_type="play", wall_clock_time=t, playback_time=0))

    playback_time = 0.0
    current_bitrate = random.choice(BITRATE_LADDER[:3])
    buffer_level = random.uniform(5, 15)
    target_duration = content_duration * random.uniform(0.5, 1.0)
    segment_duration = 4.0

    while playback_time < target_duration:
        load_ms = random.uniform(30, 500)
        t += load_ms
        playback_time += segment_duration
        buffer_level = max(0, buffer_level + segment_duration - random.uniform(0, 0.5))

        events.append(dict(session_id=session_id, event_type="segment_load",
            wall_clock_time=t, playback_time=playback_time,
            bitrate=current_bitrate, buffer_level=buffer_level,
            segment_duration=segment_duration, segment_load_time=load_ms))

        if random.random() < 0.15:
            new_bitrate = random.choice(BITRATE_LADDER)
            events.append(dict(session_id=session_id, event_type="bitrate_change",
                wall_clock_time=t, playback_time=playback_time,
                bitrate=new_bitrate, buffer_level=buffer_level))
            current_bitrate = new_bitrate

        if random.random() < 0.08:
            buf_start = t
            events.append(dict(session_id=session_id, event_type="buffer_start",
                wall_clock_time=buf_start, playback_time=playback_time, buffer_level=0))
            t += random.uniform(500, 8000)
            events.append(dict(session_id=session_id, event_type="buffer_end",
                wall_clock_time=t, playback_time=playback_time, buffer_level=random.uniform(2, 6)))

        if random.random() < 0.03:
            events.append(dict(session_id=session_id, event_type="error",
                wall_clock_time=t, playback_time=playback_time,
                error_code=random.choice(["404", "403", "503", "NETWORK_ERR", "DECODE_ERR"]),
                error_message="Segment fetch failed"))

        t += segment_duration * 1000

    events.append(dict(session_id=session_id, event_type="session_end", wall_clock_time=t, playback_time=playback_time))
    return events


def seed(n=120):
    db = SessionLocal()
    print(f"Seeding {n} sessions...")
    for i in range(n):
        sid = f"sess_{uuid.uuid4().hex[:12]}"
        content_id, content_title = random.choice(CONTENTS)
        start_dt = random_dt()

        session = StreamingSession(
            session_id=sid,
            user_id=f"user_{random.randint(1000, 9999)}",
            content_id=content_id,
            content_title=content_title,
            cdn=random.choice(CDNS),
            player_version=f"dash.js-{random.choice(['3.2','4.0','4.1'])}",
            device_type=random.choice(DEVICE_TYPES),
            os=random.choice(OSES),
            browser=random.choice(BROWSERS),
            network_type=random.choice(NETWORK_TYPES),
            country=random.choice(COUNTRIES),
            started_at=start_dt,
        )
        db.add(session)
        db.flush()

        for ev_data in generate_events(sid, start_dt.timestamp() * 1000, random.uniform(300, 3600)):
            db.add(PlaybackEvent(**ev_data))
        db.commit()

        evs = db.query(PlaybackEvent).filter(PlaybackEvent.session_id == sid).all()
        upsert_qoe_metrics(db, sid, aggregate_session_metrics(sid, evs))

        if (i + 1) % 20 == 0:
            print(f"  {i + 1}/{n} done")

    db.close()
    print("Seeding complete.")


if __name__ == "__main__":
    seed()
