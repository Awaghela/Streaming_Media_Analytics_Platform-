"""
FFmpeg-based media probing utilities.
Extracts stream metadata, bitrate ladders, and codec info from media files.
"""
import subprocess
import json
import os
from typing import Dict, Any, Optional, List


def probe_media(file_path: str) -> Optional[Dict[str, Any]]:
    """
    Run ffprobe on a media file and return structured metadata.
    Requires ffprobe to be installed on the system.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Media file not found: {file_path}")

    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            return {"error": result.stderr}
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        return {"error": "ffprobe timed out"}
    except FileNotFoundError:
        return {"error": "ffprobe not found – install FFmpeg"}
    except json.JSONDecodeError:
        return {"error": "Invalid ffprobe output"}


def extract_stream_info(probe_data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse ffprobe output into a cleaner summary dict."""
    streams = probe_data.get("streams", [])
    fmt = probe_data.get("format", {})

    video_streams = [s for s in streams if s.get("codec_type") == "video"]
    audio_streams = [s for s in streams if s.get("codec_type") == "audio"]

    video = video_streams[0] if video_streams else {}
    audio = audio_streams[0] if audio_streams else {}

    return {
        "filename": fmt.get("filename"),
        "duration_s": float(fmt.get("duration", 0)),
        "size_bytes": int(fmt.get("size", 0)),
        "overall_bitrate_kbps": int(fmt.get("bit_rate", 0)) // 1000,
        "format_name": fmt.get("format_name"),
        "video": {
            "codec": video.get("codec_name"),
            "profile": video.get("profile"),
            "width": video.get("width"),
            "height": video.get("height"),
            "frame_rate": video.get("r_frame_rate"),
            "bitrate_kbps": int(video.get("bit_rate", 0)) // 1000 if video.get("bit_rate") else None,
            "pixel_format": video.get("pix_fmt"),
        } if video else None,
        "audio": {
            "codec": audio.get("codec_name"),
            "sample_rate": audio.get("sample_rate"),
            "channels": audio.get("channels"),
            "bitrate_kbps": int(audio.get("bit_rate", 0)) // 1000 if audio.get("bit_rate") else None,
        } if audio else None,
    }


def analyze_segment_file(segment_path: str) -> Dict[str, Any]:
    """
    Analyze a DASH/HLS segment file and return QoE-relevant metadata.
    """
    probe_data = probe_media(segment_path)
    if not probe_data or "error" in probe_data:
        return probe_data or {"error": "probe failed"}

    info = extract_stream_info(probe_data)

    # Estimated download quality
    video = info.get("video") or {}
    resolution = f"{video.get('width', '?')}x{video.get('height', '?')}"

    return {
        **info,
        "resolution": resolution,
        "segment_type": "video" if info.get("video") else "audio",
    }


def build_bitrate_ladder(representations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sort representation list into a bitrate ladder with quality tiers.
    """
    sorted_reps = sorted(
        [r for r in representations if r.get("bandwidth_kbps")],
        key=lambda r: r["bandwidth_kbps"],
    )

    tiers = ["low", "medium", "high", "ultra"]
    n = len(sorted_reps)

    for i, rep in enumerate(sorted_reps):
        tier_idx = min(int(i / n * len(tiers)), len(tiers) - 1)
        rep["quality_tier"] = tiers[tier_idx]

    return sorted_reps
