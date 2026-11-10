# Aimers backend

API for the Aimers aim trainer. Lives next to the frontend (`../aim-trainer`) so both ship from one repository. Plan: `../docs/ARCHITECTURE_PLAN.md`.

## Run locally

```bash
docker compose up -d db            # PostgreSQL 16 on localhost:5432 (from the repo root)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env               # then export the variables, or use your shell/IDE to load it
export DJANGO_DEBUG=true
python manage.py migrate
python manage.py runserver
```

Checks: `GET /api/v1/health/` (process is up) and `GET /api/v1/health/ready/` (database reachable).

Tests run against a real PostgreSQL: `python -m pytest`.

## Configuration

All settings come from environment variables; see `.env.example`. `DATABASE_URL` defaults to the docker-compose database. No accounts or API keys are needed for local development.
