#!/bin/sh
set -e

echo "Waiting for database..."
until python -c "
import os, psycopg2
try:
    psycopg2.connect(os.environ['DATABASE_URL'])
    print('DB ready')
except Exception as e:
    print(f'DB not ready: {e}')
    exit(1)
" 2>/dev/null; do
  sleep 2
done

echo "Creating tables..."
python -c "
from app.db.database import engine, Base
from app.models import models
Base.metadata.create_all(bind=engine)
print('Tables ready')
"

echo "Checking if seed needed..."
python -c "
from app.db.database import SessionLocal
from app.models.models import StreamingSession
db = SessionLocal()
count = db.query(StreamingSession).count()
db.close()
print(f'Existing sessions: {count}')
exit(0 if count > 0 else 1)
" && echo "Data exists, skipping seed." || (echo "Seeding database..." && python /app/seed_data.py)

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
