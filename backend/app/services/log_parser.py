"""
DASH log parser — ingests MPEG-DASH MPD access logs and player event logs.
Supports common DASH.js / Shaka Player log formats.
"""
import re
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Regex patterns for common DASH log formats
DASHJS_EVENT_PATTERN = re.compile(
    r"(?P<timestamp>\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[(?P<level>\w+)\]\s+(?P<component>\w+):\s+(?P<message>.+)"
)
SEGMENT_REQUEST_PATTERN = re.compile(
    r"(?:GET|Request)\s+(?P<url>https?://\S+)\s+(?P<status>\d{3})\s+(?P<latency>\d+)ms"
)
BITRATE_PATTERN = re.compile(
    r"(?:quality|bitrate|representation)[=:\s]+(\d+)"
)
BUFFER_PATTERN = re.compile(
    r"buffer(?:Level)?[=:\s]+([\d.]+)"
)


def parse_dash_log_line(line: str) -> Optional[Dict[str, Any]]:
    line = line.strip()
    if not line:
        return None

    # Try JSON first (Shaka Player style)
    if line.startswith("{"):
        try:
            obj = json.loads(line)
            return _normalize_json_event(obj)
        except json.JSONDecodeError:
            pass

    # Try DASH.js text format
    m = DASHJS_EVENT_PATTERN.match(line)
    if m:
        return _normalize_dashjs_event(m.groupdict())

    return None


def _normalize_json_event(obj: Dict) -> Dict[str, Any]:
    event_type = obj.get("type") or obj.get("event") or "unknown"
    return {
        "event_type": _map_event_type(event_type),
        "timestamp": obj.get("timestamp") or obj.get("time"),
        "playback_position_ms": obj.get("currentTime") and int(float(obj["currentTime"]) * 1000),
        "bitrate_kbps": obj.get("bitrate") or obj.get("newBitrate"),
        "previous_bitrate_kbps": obj.get("oldBitrate"),
        "buffer_level_ms": obj.get("bufferLevel") and int(float(obj["bufferLevel"]) * 1000),
        "error_code": obj.get("errorCode"),
        "error_message": obj.get("errorMessage") or obj.get("message"),
        "segment_url": obj.get("url"),
        "extra": {k: v for k, v in obj.items() if k not in {
            "type", "event", "timestamp", "time", "currentTime",
            "bitrate", "newBitrate", "oldBitrate", "bufferLevel",
            "errorCode", "errorMessage", "message", "url"
        }},
    }


def _normalize_dashjs_event(groups: Dict) -> Dict[str, Any]:
    msg = groups.get("message", "")
    event_type = "unknown"

    if "startup" in msg.lower() or "manifest" in msg.lower():
        event_type = "startup"
    elif "buffer stall" in msg.lower() or "rebuffer" in msg.lower():
        event_type = "buffer_start"
    elif "buffer recovered" in msg.lower() or "buffer full" in msg.lower():
        event_type = "buffer_end"
    elif "quality change" in msg.lower() or "bitrate" in msg.lower():
        event_type = "bitrate_switch"
    elif "error" in msg.lower():
        event_type = "error"

    bitrate = None
    bm = BITRATE_PATTERN.search(msg)
    if bm:
        bitrate = int(bm.group(1))

    buffer = None
    buf_m = BUFFER_PATTERN.search(msg)
    if buf_m:
        buffer = int(float(buf_m.group(1)) * 1000)

    return {
        "event_type": event_type,
        "timestamp": groups.get("timestamp"),
        "playback_position_ms": None,
        "bitrate_kbps": bitrate,
        "buffer_level_ms": buffer,
        "error_code": None,
        "error_message": msg if event_type == "error" else None,
        "extra": {"raw": groups.get("message"), "component": groups.get("component")},
    }


def _map_event_type(raw: str) -> str:
    raw = raw.lower().replace("_", "").replace("-", "")
    mapping = {
        "startup": "startup", "manifestloaded": "startup", "streaminitialized": "startup",
        "bufferingstarted": "buffer_start", "stall": "buffer_start", "waiting": "buffer_start",
        "bufferingended": "buffer_end", "playing": "play",
        "qualitychange": "bitrate_switch", "adaptationsetremoved": "bitrate_switch",
        "error": "error", "pause": "pause", "seek": "seek", "ended": "end",
    }
    return mapping.get(raw, "unknown")


def parse_log_file(content: str) -> List[Dict[str, Any]]:
    events = []
    for line in content.splitlines():
        event = parse_dash_log_line(line)
        if event and event.get("event_type") != "unknown":
            events.append(event)
    logger.info(f"Parsed {len(events)} events from log")
    return events
