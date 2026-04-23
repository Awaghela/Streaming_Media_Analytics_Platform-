# StreamLens — DASH Streaming Media Analytics Platform

A full-stack platform for analyzing MPEG-DASH streaming logs and computing
Quality of Experience (QoE) metrics including startup delay, buffering,
bitrate adaptation, and playback failures.

## Tech Stack

| Layer     | Technology                     |
|-----------|-------------------------------|
| Backend   | Python 3.12, FastAPI           |
| Database  | PostgreSQL 16                  |
| ORM       | SQLAlchemy 2                   |
| Frontend  | React 18, Vite, Recharts       |
| Media     | FFmpeg / ffprobe               |
| Container | Docker Compose                 |

---

## Quick Start (Docker Compose)

```bash
docker compose up --build
# Frontend → http://localhost:5173
# API docs → http://localhost:8000/docs
```

## Manual Setup

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://analytics:analytics@localhost:5432/streaming_analytics
python -c "from app.db.database import engine, Base; from app.models import models; Base.metadata.create_all(bind=engine)"
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Seed Demo Data

```bash
python scripts/seed_data.py
```

## Run Tests

```bash
cd backend && pytest tests/ -v
```

See full API reference and log format documentation in the project.
