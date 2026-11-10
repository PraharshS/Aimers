# Aimers

A web aim trainer. React + Three.js frontend, Django REST + PostgreSQL backend.

```
aim-trainer/   React 19 + TypeScript + Vite frontend (talks to the REST API only)
backend/       Django REST API, PostgreSQL, JWT auth
docs/          Architecture plan, legacy Supabase schema
docker-compose.yml   PostgreSQL for local development
```

Plan and roadmap: [`docs/ARCHITECTURE_PLAN.md`](docs/ARCHITECTURE_PLAN.md).

## Run locally

**1. Database** (from the repo root)

```bash
docker compose up -d db
```

**2. Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DJANGO_DEBUG=true            # see backend/.env.example for all variables
python manage.py migrate
python manage.py runserver          # http://localhost:8000
```

**3. Frontend**

```bash
cd aim-trainer
cp .env.example .env.local          # VITE_API_URL=http://localhost:8000/api/v1
npm install
npm run dev                         # http://localhost:5173
```

## Tests

```bash
cd backend && python -m pytest      # needs PostgreSQL running (uses a throwaway test database)
cd aim-trainer && npm test          # API client unit tests
```

## How it works

- **Auth:** register / login return a 15-minute access token (kept in memory by the frontend). The refresh token is an httpOnly cookie that rotates on every use; a used token cannot be replayed. Login and registration are rate limited.
- **Scores:** the browser asks the server to start a run, plays the round, then submits the result. The server checks timing and plausibility (score vs hits, hit rate, round length), computes accuracy itself and flags suspicious runs. Submitting twice is safe (idempotent).
- **Leaderboard:** best finished, unflagged run per player, filterable by task and period, with a short server-side cache.
- **Avatars:** uploads are re-encoded to a 512 px JPEG on the server; stored on local disk in development.

API endpoints (all under `/api/v1/`): `auth/register|login|refresh|logout`, `me`, `me/avatar`, `me/runs`, `me/bests`, `runs/start`, `runs/{id}/finish`, `leaderboard`, `leaderboard/trend`, `players/recent`, `health`, `health/ready`.

## Configuration

Backend variables are listed in `backend/.env.example` (`DJANGO_SECRET_KEY` is required when `DJANGO_DEBUG` is off). Frontend: `VITE_API_URL`. Generate a secret key with
`python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` and keep it out of git.

## Notes

- Accounts and scores from the old Supabase setup are not migrated; players register again.
- Custom tasks are still stored in the browser (`localStorage`); syncing them to the server is a planned step.
