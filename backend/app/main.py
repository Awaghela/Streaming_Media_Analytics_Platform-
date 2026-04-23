from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import metrics, sessions, events, health
from app.db.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Streaming Media Analytics Platform",
    description="DASH streaming QoE analytics — startup delay, buffering, bitrate switches, failures",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
