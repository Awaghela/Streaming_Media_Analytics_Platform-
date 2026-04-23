"""Auto-seed script — runs on first backend startup."""
import sys, os, random, uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, '/app')

from app.db.database import SessionLocal
from app.models.models import StreamingSession, PlaybackEvent, EventType, NetworkCondition
from app.services.qoe_service import compute_session_metrics

CONTENTS = [
    ("c001", "Big Buck Bunny"),
    ("c002", "Elephants Dream"),
    ("c003", "Tears of Steel"),
    ("c004", "Sintel"),
    ("c005", "Cosmos Laundromat"),
]
CDNS = ["Akamai", "Cloudfront", "Fastly", "Cloudflare"]
NETWORK_CONDITIONS = list(NetworkCondition)
DEVICE_TYPES = ["desktop", "mobile", "tablet", "tv"]
BITRATE_LADDER = [400, 800, 1500, 3000, 5000, 8000]


def random_dt(days_ago_max=14):
    return datetime.now(timezone.utc) - timedelta(
        days=random.uniform(0, days_ago_max),
        hours=random.uniform(0, 23),
    )


def seed(n=120):
    db = SessionLocal()
    print(f"Seeding {n} sessions...")

    for i in range(n):
        sid = f"sess_{uuid.uuid4().hex[:12]}"
        content_id, content_title = random.choice(CONTENTS)
        start_dt = random_dt()
        duration_ms = int(random.uniform(60000, 1800000))

        session = StreamingSession(
            session_id=sid,
            content_id=content_id,
            content_title=content_title,
            user_id=f"user_{random.randint(1000, 9999)}",
            device_type=random.choice(DEVICE_TYPES),
            player_version=f"dash.js-{random.choice(['3.2','4.0','4.1'])}",
            network_condition=random.choice(NETWORK_CONDITIONS),
            cdn=random.choice(CDNS),
            started_at=start_dt,
            ended_at=start_dt + timedelta(milliseconds=duration_ms),
            total_duration_ms=duration_ms,
        )
        db.add(session)
        db.flush()

        t = start_dt
        current_bitrate = random.choice(BITRATE_LADDER[:3])

        # startup event
        startup_ms = random.uniform(300, 8000)
        db.add(PlaybackEvent(
            session_id=sid, event_type=EventType.startup,
            timestamp=t, playback_position_ms=int(startup_ms),
        ))
        t += timedelta(milliseconds=startup_ms)

        # playback events
        pos_ms = 0
        segment_ms = 4000
        while pos_ms < duration_ms:
            t += timedelta(milliseconds=random.uniform(30, 500))
            pos_ms += segment_ms

            # occasional bitrate switch
            if random.random() < 0.15:
                new_bitrate = random.choice(BITRATE_LADDER)
                db.add(PlaybackEvent(
                    session_id=sid, event_type=EventType.bitrate_switch,
                    timestamp=t, playback_position_ms=pos_ms,
                    bitrate_kbps=new_bitrate, previous_bitrate_kbps=current_bitrate,
                ))
                current_bitrate = new_bitrate

            # occasional buffering
            if random.random() < 0.08:
                db.add(PlaybackEvent(
                    session_id=sid, event_type=EventType.buffer_start,
                    timestamp=t, playback_position_ms=pos_ms,
                    buffer_level_ms=0,
                ))
                t += timedelta(milliseconds=random.uniform(500, 8000))
                db.add(PlaybackEvent(
                    session_id=sid, event_type=EventType.buffer_end,
                    timestamp=t, playback_position_ms=pos_ms,
                    buffer_level_ms=int(random.uniform(2000, 6000)),
                ))

            # occasional error
            if random.random() < 0.03:
                db.add(PlaybackEvent(
                    session_id=sid, event_type=EventType.error,
                    timestamp=t, playback_position_ms=pos_ms,
                    error_code=random.choice(["404", "503", "NETWORK_ERR"]),
                    error_message="Segment fetch failed",
                ))

        # end event
        db.add(PlaybackEvent(
            session_id=sid, event_type=EventType.end,
            timestamp=t, playback_position_ms=pos_ms,
        ))

        db.commit()
        compute_session_metrics(sid, db)

        if (i + 1) % 20 == 0:
            print(f"  {i + 1}/{n} done")

    db.close()
    print("Seeding complete.")


if __name__ == "__main__":
    seed()