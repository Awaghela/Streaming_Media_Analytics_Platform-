"""
FFprobe wrapper for media content analysis.
Extracts codec, bitrate, duration, and stream metadata from media files or URLs.
"""
import subprocess
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def probe_media(url_or_path: str, timeout: int = 30) -> Optional[Dict[str, Any]]:
    """
    Run ffprobe on a media URL or local file.
    Returns parsed metadata or None on failure.
    """
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        url_or_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            logger.warning(f"ffprobe failed for {url_or_path}: {result.stderr[:200]}")
            return None

        data = json.loads(result.stdout)
        return _extract_summary(data)

    except subprocess.TimeoutExpired:
        logger.error(f"ffprobe timed out for {url_or_path}")
        return None
    except FileNotFoundError:
        logger.error("ffprobe not found — install FFmpeg")
        return None
    except Exception as e:
        logger.error(f"ffprobe error: {e}")
        return None


def _extract_summary(raw: Dict) -> Dict[str, Any]:
    fmt = raw.get("format", {})
    streams = raw.get("streams", [])

    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)

    summary = {
        "format_name": fmt.get("format_name"),
        "duration_s": float(fmt.get("duration", 0)),
        "size_bytes": int(fmt.get("size", 0)),
        "bit_rate_kbps": int(fmt.get("bit_rate", 0)) // 1000,
        "nb_streams": fmt.get("nb_streams"),
    }

    if video:
        summary["video"] = {
            "codec": video.get("codec_name"),
            "profile": video.get("profile"),
            "width": video.get("width"),
            "height": video.get("height"),
            "frame_rate": video.get("r_frame_rate"),
            "bit_rate_kbps": int(video.get("bit_rate", 0)) // 1000,
            "pix_fmt": video.get("pix_fmt"),
        }

    if audio:
        summary["audio"] = {
            "codec": audio.get("codec_name"),
            "sample_rate": audio.get("sample_rate"),
            "channels": audio.get("channels"),
            "bit_rate_kbps": int(audio.get("bit_rate", 0)) // 1000,
        }

    return summary


def analyze_segment(segment_url: str) -> Optional[Dict[str, Any]]:
    """Analyze a single DASH segment for codec/bitrate validation."""
    return probe_media(segment_url, timeout=15)
