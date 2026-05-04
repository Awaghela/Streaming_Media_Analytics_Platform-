# StreamLens — DASH Streaming Media Analytics Platform

A full-stack platform for analyzing MPEG-DASH streaming logs and computing
Quality of Experience (QoE) metrics including startup delay, buffering,
bitrate adaptation, and playback failures.

## Tech Stack

| Layer     | Technology               |
| --------- | ------------------------ |
| Backend   | Python 3.12, FastAPI     |
| Database  | PostgreSQL 16            |
| ORM       | SQLAlchemy 2             |
| Frontend  | React 18, Vite, Recharts |
| Media     | FFmpeg / ffprobe         |
| Container | Docker Compose           |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Ports `5173`, `8000`, and `5432` free on your machine

---

## Quick Start

```bash
# 1. Clone or unzip the project
cd "streaming-analytics"

# 2. Build and start all services (DB + backend + frontend)
docker compose up --build

# 3. Open in browser
# Frontend  → http://localhost:5173
# API docs  → http://localhost:8000/docs
```

The backend automatically creates tables and seeds 120 demo sessions on first boot.
No manual setup required.

---

## Stopping & Restarting

```bash
# Stop containers (keeps data)
docker compose down

# Stop and wipe all data (fresh start)
docker compose down -v

# Restart without rebuilding
docker compose up

# Rebuild images after code changes
docker compose up --build
```

---

## Resetting the Database

```bash
docker compose down -v        # removes the pgdata volume
docker compose up --build     # recreates and re-seeds automatically
```

---

## API Reference

| Method | Path                                       | Description                     |
| ------ | ------------------------------------------ | ------------------------------- |
| GET    | `/api/sessions`                            | List sessions                   |
| GET    | `/api/sessions/{id}`                       | Session detail                  |
| GET    | `/api/sessions/{id}/metrics`               | QoE metrics for session         |
| GET    | `/api/events/{session_id}`                 | Playback events for session     |
| POST   | `/api/metrics/compute/{id}`                | Compute QoE for session         |
| GET    | `/api/metrics/summary`                     | Platform-wide metric summary    |
| GET    | `/api/metrics/timeseries`                  | Time-bucketed QoE trend         |
| GET    | `/api/metrics/network-breakdown`           | Metrics grouped by network type |
| POST   | `/api/ingest/batch`                        | Batch ingest session + events   |
| POST   | `/api/ingest/log/cdn`                      | Upload CDN access log           |
| POST   | `/api/ingest/log/json`                     | Upload JSON player log          |
| GET    | `/api/analysis/buffering-by-network`       | Buffering by network type       |
| GET    | `/api/analysis/startup-delay-distribution` | Startup delay histogram         |
| GET    | `/api/analysis/error-analysis`             | Error code breakdown            |

Interactive docs: **http://localhost:8000/docs**

---

## QoE Score Formula

Composite score (0–10) based on:

- **Startup delay** — time to first frame
- **Rebuffering ratio** — buffering time / watch time
- **Bitrate switches** — ABR instability
- **Error count** — segment/manifest failures
- **Completion rate** — how much of content was watched

---

## Running Tests

```bash
docker compose exec backend pytest tests/ -v
```
