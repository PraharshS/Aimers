# Aimers — Architecture & Build Plan

Goal: a minimal, gamer-grade aim trainer where many people play at once. Plan written 2026-11-10 from a read of the repo (last commit 2026-06-02) and the design handoff.

## 1. Where the repo is today

| Area | State |
|---|---|
| Frontend | React 19 + TS + Vite. Three.js for 3D targets, Recharts for charts. `AimTrainer.tsx` is one 1,254-line component. Hot-loop state already lives in refs (good). |
| Backend | None in the repo. Components call Supabase directly (`profiles`, `scores`, `avatars` storage, auth). |
| Scores | Inserted straight from the browser. RLS only checks `auth.uid() = user_id`, so any logged-in user can post any score. |
| Leaderboard | Client queries `scores` with a join; no aggregation, no caching. |
| Custom tasks | Stored in `localStorage` only (not synced, not shareable). |
| Design | Wireframes + handoff README in `aim-trainer/Aimers_extracted/`. 5 screens: menu, HUD, results, stats, onboarding. Not implemented yet. |

Main risks for "many players at once": forgeable scores, no shot log (so no replay/heatmap/validation), no leaderboard cache, one giant game component.

## 2. Decision needed first: backend shape

The resume lists a Django REST Framework backend as done, but this repo only has Supabase. Confirm where the Django code lives (another repo/branch, or not committed). Options:

- **A (recommended): Django REST API + Postgres, keep Supabase Auth at first.** API verifies the Supabase JWT, owns scoring, leaderboards and stats. Matches your stack. Later you can move auth in-house if wanted.
- **B: Supabase only** (RLS + Edge Functions + RPC). Fastest to ship, weaker for server-side score re-simulation and heavy aggregation.

The rest of this plan assumes A.

## 3. Target architecture (v1)

```
Browser (React + Three.js)  ──HTTPS──>  CDN (static, fonts, replays)
   │  ▲                                   
   │  └─ WebSocket (leaderboard push) ─┐
   ▼                                   ▼
Django API (DRF, stateless) ──> Redis (cache, sorted sets, rate limits, pub/sub)
   │                  │
   ▼                  ▼
Postgres (source of truth)   Object storage (shot logs / replays, avatars)
   ▲
Celery workers (rollups, validation, streaks, coach jobs)
```

API is stateless so it can scale horizontally behind a load balancer from day one.

## 4. Server-authoritative scoring (the core design problem)

1. Client starts a run: `POST /runs/start {task_id, task_version}` → server returns `run_id` + a random `seed`.
2. Target spawns are generated from the seed with a deterministic PRNG (replace `Math.random` in spawn logic).
3. Client sends `POST /runs/{id}/finish` with the compact shot log: `[t_ms, x, y, hit_target_id]` plus client-claimed totals.
4. Server re-runs hit detection on the log, recomputes score/accuracy/TTK, and rejects mismatches.
5. Plausibility checks: minimum human reaction time, max click rate, impossible precision patterns, run duration vs task duration, one open run per user per task.
6. Store summary row in Postgres; store full shot log compressed in object storage (feeds replay + heatmap).

This cannot stop a determined cheater, but it removes trivial score forgery and makes cheating costly. Flag suspicious runs for review rather than silently dropping them.

## 5. Data model (Postgres)

- `profiles` (existing) + sens config (dpi, game, in-game sens, cm/360), skill level, preferred games, prefs JSON
- `tasks` (built-in + custom, versioned config JSON, owner, visibility) — replaces localStorage
- `runs` (id, user, task, task_version, seed, score, hits, misses, accuracy, avg_ttk_ms, best_ttk_ms, max_streak, duration, played_at, status, flagged)
- `run_logs` (run_id → object storage key, size, format version)
- `personal_bests` (user, task → best run) — updated transactionally
- `daily_activity` (user, date, minutes, runs) — streak calendar
- Indexes: `(task_id, score DESC)`, `(user_id, played_at DESC)`; partition `runs` by month once it grows.

## 6. API surface (v1)

`GET /tasks`, `POST /tasks` (custom) · `POST /runs/start`, `POST /runs/{id}/finish` · `GET /me/stats` (KPIs, radar, heatmap, calendar) · `GET /leaderboard/{task}?period=day|week|all&around_me=1` · `GET/PATCH /me` · `GET /runs/{id}/replay`. Version the API (`/v1`), publish an OpenAPI schema.

## 7. Frontend restructure

1. Tokens first: CSS variables from the handoff (graphite/platinum, accent options, Space Grotesk + JetBrains Mono self-hosted).
2. Split `AimTrainer.tsx`: `engine/` (loop, spawner, hit-testing, input/pointer-lock, no React), `hud/` (HUD variants), `screens/` (menu, results, stats, onboarding), `api/` (typed client), `store/` (prefs, session).
3. Rule from the handoff: per-frame state stays in refs/engine; push score/accuracy/streak to React at most ~10×/sec.
4. Build order: tokens → menu A + HUD A → results A → shot log capture → ⌘K launcher → stats (radar + calendar) → onboarding/calibration → replay (results D) → heatmap.
5. PWA: service worker for shell caching; scores never queued blindly offline (validation needs the live run).

## 8. Library suggestions

Frontend: React Router, TanStack Query (server state), Zustand (prefs/session), cmdk (⌘K palette), Zod (shared validation), vite-plugin-pwa, Vitest + Testing Library, Playwright (E2E), `@fontsource` fonts. Keep Three.js and Recharts (radar chart is built in).
Backend: Django + djangorestframework, drf-spectacular (OpenAPI), PyJWT (verify Supabase JWT), psycopg 3, Celery + Redis, django-redis, DRF throttling, Channels + channels-redis (WebSocket), pytest-django, Sentry, gunicorn/uvicorn.
Infra (not built yet — mark "in progress" anywhere public until done): Docker, GitHub Actions CI, S3 + CloudFront, managed Postgres, ECS/EC2 behind an ALB, CloudWatch.

## 9. Scalability roadmap (add when the trigger appears)

| Order | Concept | Trigger / why |
|---|---|---|
| 1 | Stateless API + connection pooling (pgbouncer) | Day one; enables horizontal scaling |
| 2 | Redis sorted-set leaderboards (`ZADD GT`, top-N + rank-around-me); Postgres stays source of truth and can rebuild Redis | Leaderboard reads dominate load |
| 3 | Rate limiting per user/IP; idempotent `finish` endpoint | Abuse + retries |
| 4 | Async jobs (Celery): streak rollups, PB updates, log processing, anomaly checks | Keep `finish` fast |
| 5 | WebSocket fan-out via Redis pub/sub; throttle pushes (batch every 1–2 s) | Live leaderboard with many viewers |
| 6 | CDN for static + replays; cache `GET /tasks` and public leaderboards with short TTL | Cut origin load |
| 7 | Postgres read replica for stats; partition `runs` by month; archive old logs | Table growth |
| 8 | Observability: structured logs, metrics, tracing, alerts, load tests (k6/Locust) | Before every scale step |
| 9 | Matchmaking / live duels (later): dedicated realtime service, sticky sessions | Only if multiplayer modes are added |

Define SLOs early (e.g. leaderboard read p95 < 150 ms, finish p95 < 300 ms) and load-test against them before adding the next layer.

## 10. Milestones

- **M0** decide backend (section 2), repo hygiene (move the zip out of git, add `.env.example`, CI lint + typecheck).
- **M1** API skeleton: auth, tasks, run start/finish, validation, tests.
- **M2** new UI shell + engine split + shot log capture, wired to the API.
- **M3** results, stats, ⌘K, onboarding/calibration.
- **M4** Redis leaderboard + WebSocket push + rate limits.
- **M5** replay + heatmap, LLM coach (tool calls against the stats API).
- **M6** Docker, CI/CD, load tests, deploy.

## 11. Cleanup noticed in the repo

- `aim-trainer/Aimers.zip` and the extracted handoff folder are committed; move them to `docs/design/` (or drop the zip).
- `supabase.ts` sets an `Access-Control-Allow-Origin` request header (has no effect; CORS is server-side) — remove.
- Task config lives in `localStorage`; migrate to the `tasks` table with a one-time import.

---

# Part 2 — Planned features and system design practice (added 2026-11-10)

## 12. Planned features

### 12.1 Leaderboards (extended)
- Boards: per task × period (day / week / all-time), global and friends. Later: country/region.
- Redis sorted sets, one key per `lb:{task}:{period}:{bucket}` (bucket = date or ISO week, TTL set so old buckets expire). Postgres stays the source of truth; Redis can be rebuilt from `runs`.
- Keep only each user's best per board (`ZADD GT`). Tie-break by earlier achievement (encode `score * 1e6 + (1e6 - seconds_into_period)` or store a secondary key).
- Reads: top-N (`ZREVRANGE`), "around me" (`ZREVRANK` then a range), friends board (pipeline `ZMSCORE` over the friend list, sort in app).
- Updated asynchronously after a validated run finishes (queue worker), never from the client.

### 12.2 Live presence: "who is playing what"
- Client opens a WebSocket and sends a heartbeat every ~10 s: `{state: menu|playing|results, task_id}`.
- Server: `SET presence:{user} <task> EX 30` (TTL = failure detector, so a closed tab disappears by itself) and `ZADD playing:{task} <now> <user>`; a cleanup job removes members older than 30 s.
- Do not broadcast every event. Aggregate and push counts per task every 1–2 s (`ZCARD`), and push exact status only for friends or for a viewed profile.
- Privacy: "appear offline" setting; no presence for users who opt out.
- Consistency: presence is eventually consistent by design (a few seconds stale is fine).

### 12.3 Per-player task history
- `runs` already holds one row per run. Index `(user_id, played_at DESC)` and `(user_id, task_id, played_at DESC)`.
- API uses keyset pagination (`?cursor=<played_at,id>`), not `OFFSET`, with filters for task and date range.
- Views: run list, per-task trend and PB timeline (from `personal_bests` + daily rollups), run detail that lazily loads the replay log from storage.
- Cache the first page per user (short TTL, invalidated when a new run finishes).
- Retention: keep summaries forever; keep full traces about 90 days, then move to cold storage or drop.

### 12.4 Weakness analysis and drill recommendations (strafing, micro-adjustment)

**Data to capture (extends section 4).** Besides clicks, record the cursor trace sampled at about 120 Hz (use coalesced pointer events), delta-encoded and compressed. Target positions are reconstructed from seed + task + time, so they need not be stored. Store in object storage like the shot log.

**Metrics computed server-side in a worker (deterministic, testable):**

| Skill | Metrics |
|---|---|
| Strafing (tracking targets that reverse direction) | on-target %, tracking error in steady motion vs in the 300 ms after a reversal, reversal re-acquire time, overshoot after reversal, cursor-vs-target velocity matching error, left vs right asymmetry |
| Micro-adjustment | corrections in the last ~150 ms before a click, correction amplitude, overshoot rate, settle time near target, path efficiency, click offset from centre (heatmap), accuracy by target-size bucket |
| Flick | landing error of the first ballistic movement vs later corrections |

**Recommender, in two layers:**
1. **Rule-based (always on, free):** compare each metric with the player's own baseline and with a cohort of similar skill (percentiles from rollups). Weakness score per skill → pick the top 2–3 drills from a `drill_tags` table (e.g. `strafe_reversal`, `micro_adjust`) and suggest parameters (smaller targets, slower speed, more reversals).
2. **LLM explanation (optional):** send only aggregated metrics as JSON (no personal data), get back a short plain-language coaching note. Cache the result per user and run-set; generate on demand or once a day, not per run.

**Free LLM API options** (indicative figures from a third-party comparison, they change often, so verify on each provider's page before building):

| Provider | Free limits (approx.) | Notes |
|---|---|---|
| Groq | ~30 req/min, ~1,000 req/day, Llama 3.3 70B | No card; says it does not train on your data; fast |
| Cerebras | ~30 req/min, ~1M tokens/day | No card; no training on your data |
| Google AI Studio (Gemini Flash) | ~5–15 req/min, ~20–1,500 req/day depending on model | Prompts may be used for training outside the EU/UK/EEA |
| OpenRouter free models | ~20 req/min, ~50 req/day (1,000 with a $10 top-up) | Many models; small daily cap |

Suggested setup: primary Groq or Cerebras, Gemini as fallback, behind a provider interface. Because daily caps are low, the LLM must never sit on the hot path (see circuit breaker in section 13). If every provider is down or over quota, return a templated explanation from the rule-based layer.

## 13. System design concepts and where they fit

Pick the ones you have learned and build each as a small, measured step (one short design note per step: problem, choice, trade-off, and a load-test number).

| Concept | Where in Aimers | What to build or demonstrate |
|---|---|---|
| Capacity estimation | whole system | Back-of-envelope sheet. Illustrative assumption: 10k concurrent players, one run per ~75 s, so ~130 run submissions/s at peak, leaderboard reads ~10× that, ~5–10 KB compressed trace per run (~1 MB/s ingest). Replace with load-test numbers. |
| Stateless services + load balancing | Django API | Run 3 API containers behind nginx (round-robin); kill one and show no impact. |
| Caching: cache-aside, TTL, invalidation, stampede protection | leaderboard top-N, task catalog, history first page | Redis cache with single-flight lock on a hot key; measure hit ratio and p95. |
| Replication and read-your-writes | stats and history reads on a replica | Show replication lag causing a "my run is missing" bug, then fix by reading the user's own latest run from primary or Redis. |
| Partitioning / sharding, hot keys | `runs` by month; Redis keys by task | Range partition `runs`; discuss hash vs range; split a hot popular-task leaderboard by bucket. |
| Consistent hashing | WebSocket connections, presence keys, Redis cluster slots | Small demo/simulation of key distribution when a node is added or removed. |
| Rate limiting (token bucket / sliding window) | `/runs/start`, `/runs/finish`, coach endpoint | Redis + Lua limiter; return `429` with `Retry-After`. |
| Idempotency | `POST /runs/{id}/finish` | Idempotency key so a retry never double-counts a run. |
| Message queue: at-least-once, retries, dead-letter queue, outbox pattern | after finish: PB, leaderboard, streak, trace analysis | Write run + outbox row in one DB transaction; worker publishes and consumes; duplicates handled by idempotent consumers. |
| CQRS / event-driven read models | leaderboards, stats, calendar | Writes go to `runs`; read models are Redis ZSETs and rollup tables, all rebuildable from `runs`. |
| Pub/Sub, WebSockets, fan-out, batching, backpressure | live presence and leaderboard | Redis pub/sub between API instances; push aggregated counts every 1–2 s; drop slow clients. |
| CAP and consistency per feature | all | Strong: run submission, PB. Eventual: leaderboard, presence, stats. Write this down per endpoint. |
| CDN and edge caching | static assets, replay files | CloudFront (or similar) with cache headers; signed URLs for private replays. |
| Circuit breaker, timeouts, retries with jitter, bulkhead, graceful degradation | LLM coach | Provider interface with breaker; fall back to rule-based text; separate worker pool so coach load cannot starve scoring. |
| Bloom filter (optional) | username availability, seen-run-id dedup | Small implementation and false-positive measurement. |
| Heartbeats, TTL, failure detection | presence | Already in 12.2; test by killing a client tab. |
| Data lifecycle (hot / warm / cold) | traces and old runs | Job that archives traces older than 90 days. |
| Observability, SLOs, load and chaos testing | everything | Metrics + tracing + alerts; k6 or Locust scenarios; kill Redis and confirm graceful degradation. |

Suggested order for learning value: stateless API + load balancer → caching → rate limiting + idempotency → queue + outbox → CQRS read models → pub/sub + WebSockets → replication/partitioning → circuit breaker + coach → observability and load tests.

Resume note: only list a concept or tool as done after it is built and tested; use "in progress" until then.

## 14. Updated milestones

Current focus (decided 2026-11-10): a working frontend + backend + authentication first. LLM work is deferred.

- **M0** decide backend and auth approach, repo cleanup, CI lint + typecheck.
- **M1 (first working slice)** backend skeleton + authentication (register, login, refresh, logout, profile), tasks, run start/finish with validation (section 4) and idempotent finish, tests; frontend wired to it: auth screens, play a run, score saved, basic leaderboard and history. Replaces the direct Supabase calls.
- **M2** new UI shell from the design, engine split, cursor-trace + shot-log capture.
- **M3** results, stats, ⌘K, onboarding/calibration, per-player history (12.3).
- **M4** async pipeline (queue + outbox), Redis leaderboards (12.1), rate limiting.
- **M5** WebSocket presence and live leaderboard (12.2).
- **M6** trace analysis workers, rule-based recommender, drill tags (12.4 layer 1).
- **M7 (deferred)** LLM explanation layer with free API, circuit breaker, caching (12.4 layer 2).
- **M8** replay + heatmap, replicas/partitioning, Docker, CI/CD, load tests, deploy.
