<div align="center">

# **StatusPing**

**Self-hosted uptime monitoring and public status page platform**

Built with Node.js · BullMQ · PostgreSQL · Redis · Next.js 15

[![CI](https://img.shields.io/github/actions/workflow/status/yourusername/statusping/ci.yml?branch=main&label=CI)](https://github.com/yourusername/statusping/actions)
[![Coverage](https://img.shields.io/badge/coverage-78%25-green)](./backend/tests)
[![Lighthouse](https://img.shields.io/badge/lighthouse-97-blue)](https://pagespeed.web.dev)
[![Deploy](https://img.shields.io/badge/deployed-Railway-blueviolet)](https://statusping.railway.app)

[Live Demo](https://statusping.railway.app/status) · [Dashboard](https://statusping.railway.app) · [API Docs](https://statusping.railway.app/api/docs)

</div>

---

## What It Is

StatusPing continuously checks whether your web services are reachable, measures their response times, automatically opens and resolves incidents, notifies you via email or webhook, and serves a public status page your users can check — no authentication required.

Think of it as your own self-hosted UptimeRobot. No vendor lock-in, no monthly fees, full control over every layer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RAILWAY DEPLOYMENT                           │
│                                                                      │
│   ┌──────────────────────────┐    ┌──────────────────────────────┐  │
│   │   SERVICE 1: Dashboard   │    │     SERVICE 2: Worker         │  │
│   │   (Next.js 15 App Router)│    │  (Node.js + BullMQ)          │  │
│   │                          │    │                               │  │
│   │  /dashboard  (auth)      │    │  Startup: re-register all    │  │
│   │  /status     (public)    │    │  active monitors as BullMQ   │  │
│   │  /api/*      (REST)      │    │  repeatable jobs             │  │
│   │                          │    │                               │  │
│   │  Auth.js v5 + GitHub     │    │  ┌──────────────────────┐   │  │
│   │  OAuth                   │    │  │  ping-queue          │   │  │
│   │                          │    │  │  HTTP health check   │   │  │
│   │  Prisma ORM              │    │  │  every N minutes     │   │  │
│   │  Zod validation          │    │  └──────────┬───────────┘   │  │
│   │  Resend email            │    │             │                │  │
│   └──────────┬───────────────┘    │  ┌──────────▼───────────┐   │  │
│              │                    │  │  incident-queue       │   │  │
│              │                    │  │  evaluate failures,   │   │  │
│              │                    │  │  open/resolve         │   │  │
│              │                    │  └──────────┬───────────┘   │  │
│              │                    │             │                │  │
│              │                    │  ┌──────────▼───────────┐   │  │
│              │                    │  │  notification-queue   │   │  │
│              │                    │  │  email + webhook      │   │  │
│              │                    │  │  with cooldown        │   │  │
│              │                    │  └──────────────────────┘   │  │
│              │                    │                               │  │
│              │                    │  retention-queue (2am UTC)   │  │
│              │                    │  ssl-queue      (6am UTC)    │  │
│              │                    └───────────────────────────────┘  │
│              │                                  │                    │
│   ┌──────────▼──────────────────────────────────▼──────────────┐   │
│   │                    RAILWAY ADD-ONS                           │   │
│   │                                                              │   │
│   │    PostgreSQL                        Redis                   │   │
│   │    ─────────────────────            ──────────────────────  │   │
│   │    users                            BullMQ job store         │   │
│   │    monitors                         notification cooldown    │   │
│   │    ping_logs (partitioned)          status page cache        │   │
│   │    incidents                        (60s TTL)                │   │
│   │    daily_stats                      rate limit counters      │   │
│   │    notification_configs             (sliding window, 100     │   │
│   │    ssl_checks                        req/min per user)       │   │
│   └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
   ┌──────▼──────┐    ┌────────▼──────┐    ┌────────▼───────┐
   │  Monitored  │    │  Resend API   │    │ Webhook         │
   │  Endpoints  │    │  (email)      │    │ Endpoints       │
   │  (HTTP GET) │    │               │    │ (HMAC-signed)   │
   └─────────────┘    └───────────────┘    └────────────────┘
```

### One full ping cycle

```
BullMQ Scheduler
      │
      │  every N minutes
      ▼
Ping Worker  ──── GET https://your-service.com/health ────► Target
      │                                                        │
      │  writes                                               200 OK / 503
      ▼                                                        │
 ping_logs                                                     │
 (status_code, response_time_ms, error_type)    ◄─────────────┘
      │
      ▼
Incident Worker
  consecutive_failures >= threshold?
      │
      ├─ YES, no open incident ──► CREATE incident ──► Notification Worker
      │                                                       │
      │                                              email via Resend
      │                                              webhook POST (HMAC)
      │                                              Redis cooldown key (30min TTL)
      │
      └─ Monitor recovered ──► RESOLVE incident ──► Recovery notification
```

---

## Key Features

**Monitoring**
- HTTP/HTTPS health checks at 1, 5, 15, 30, or 60-minute intervals
- Configurable failure threshold (default: 2 consecutive failures before incident)
- Keyword assertion in response body
- Redirect tracking — flags unexpected destination changes
- SSL certificate expiry alerts (30-day warning)

**Incident Engine**
- Auto-open incidents after N consecutive failures
- Auto-resolve when the monitor recovers
- PostgreSQL partial unique index prevents duplicate incidents under concurrent workers
- Incident timeline with duration, MTTD, and MTTR computed automatically

**Notifications**
- Email via Resend on incident open and resolve
- HMAC-SHA256-signed webhook delivery with exponential backoff (1s → 2s → 4s → 8s → 16s, max 5 attempts)
- Notification cooldown via Redis TTL — no alert storms during extended outages
- Dead-letter table for failed deliveries with manual replay support

**Security**
- API rate limiting: 100 requests/minute per authenticated user via Redis sliding window counter
- SSRF prevention: monitor URLs are resolved to an IP at creation time and rejected if they target private ranges (`127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.0.0/16`, etc.) — re-validated at ping execution time to catch DNS rebinding attacks
- Monitor ownership enforced on every API handler: `monitor.user_id === session.user.id` — never fetch by ID alone
- Webhook secrets stored encrypted (AES-256-GCM), never in plaintext

**Public Status Page (`/status`)**
- No login required — share one URL with your users
- 90-day uptime history (one colored square per day, like GitHub's status page)
- Active incident banner with live updates
- Server-rendered via Next.js App Router — Lighthouse score 97

**Data & Reporting**
- Response time P50/P95/P99 per monitor per day, charted over 90 days
- Monthly SLA PDF export: uptime %, longest incident, MTTD, MTTR
- 30-day raw ping log retention → aggregated into daily_stats indefinitely
- Partition-based deletion (`DROP TABLE ping_logs_YYYY_MM`) — O(1) vs millions of DELETEs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend API | Next.js API routes, Prisma ORM, Zod validation |
| Background Jobs | BullMQ, Redis |
| Database | PostgreSQL (partitioned tables, partial unique indexes) |
| Auth | Auth.js v5, GitHub OAuth |
| Email | Resend |
| Testing | Vitest (unit + integration), Playwright (E2E) |
| Deploy | Railway (two services from one monorepo), GitHub Actions |

---

## Project Structure

```
StatusPing/
├── backend/                   # Node.js worker process (Railway Service 2)
│   ├── prisma/
│   │   ├── schema.prisma      # Full schema with partitioning strategy
│   │   └── seed.ts            # Demo data: 3 monitors, 30 days of ping history
│   └── src/
│       ├── api/               # Express server exposing /health endpoint
│       ├── config/            # Prisma, Redis, environment config
│       ├── lib/               # crypto, SSRF blocklist, uptime calc, logger
│       ├── queues/            # BullMQ queue definitions and helpers
│       ├── services/          # Business logic: ping, incident, notification, SSL
│       └── worker/            # Queue consumers: ping, incident, notification, retention
│
├── frontend/                  # Next.js 15 app (Railway Service 1)
│   └── src/
│       ├── app/
│       │   ├── dashboard/     # Authenticated monitor management
│       │   ├── status/        # Public status page (no auth)
│       │   └── api/           # REST API route handlers
│       ├── components/        # Dashboard panels, status page, UI primitives
│       ├── hooks/             # useAuth, useTheme
│       └── lib/               # API client, types, utils
│
├── docker-compose.yml         # Local dev: app + worker + postgres + redis
└── Dockerfile                 # Multi-stage: target=app and target=worker
```

---

## Local Setup

**Requirements:** Docker and Docker Compose

```bash
git clone https://github.com/yourusername/statusping.git
cd statusping

cp .env.example .env
# Fill in: AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, RESEND_API_KEY

docker compose up --build
```

The seed script runs automatically and populates 3 demo monitors with 30 days of realistic ping history. Open `http://localhost:3000` — the dashboard is ready immediately.

```
App:      http://localhost:3000
Status:   http://localhost:3000/status
Worker:   running as a separate container
Postgres: localhost:5432
Redis:    localhost:6379
```

---

## Environment Variables

```bash
# .env.example

DATABASE_URL="postgresql://statusping:password@postgres:5432/statusping"
REDIS_URL="redis://redis:6379"

AUTH_SECRET=""                  # openssl rand -base64 32
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""

RESEND_API_KEY=""
RESEND_FROM_EMAIL="alerts@yourdomain.com"

WEBHOOK_ENCRYPTION_KEY=""       # openssl rand -base64 32
NEXT_PUBLIC_APP_URL="http://localhost:3000"

PING_WORKER_CONCURRENCY="10"
NOTIFICATION_COOLDOWN_SECONDS="1800"
PING_LOG_RETENTION_DAYS="30"
```

---

## Database

```bash
# Apply schema
npx prisma migrate deploy

# Seed demo data
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

Schema highlights:
- `ping_logs` partitioned by month — old partitions are dropped wholesale, not row-by-row
- Partial unique index on `incidents(monitor_id) WHERE status = 'open'` — prevents duplicate incidents at the database level under concurrent workers
- `duration_seconds` on incidents is a generated column — computed automatically on resolve

---

## Testing

```bash
cd backend

# Unit tests (pure functions — no DB, no Redis)
npm run test:unit

# Integration tests (requires running Postgres + Redis)
npm run test:integration

# Coverage report
npm run test:coverage
```

Unit test coverage targets:

| Module | Coverage |
|---|---|
| Uptime % calculation | 100% |
| Incident trigger/resolve logic | 100% |
| HMAC signature | 100% |
| Notification cooldown | 100% |
| SSRF blocklist | 90% |
| SSL expiry evaluation | 90% |

```bash
cd frontend

# E2E tests (requires full stack running)
npx playwright test
```

---

## API Reference

All authenticated endpoints require a valid Auth.js session. All timestamps are ISO 8601 UTC. Rate limit: 100 requests/minute per user — exceeded requests receive `429` with a `Retry-After` header.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/monitors` | List all monitors (paginated) |
| POST | `/api/monitors` | Create monitor |
| GET | `/api/monitors/:id` | Monitor detail with recent pings |
| PATCH | `/api/monitors/:id` | Update / pause / resume |
| DELETE | `/api/monitors/:id` | Soft-delete |
| GET | `/api/monitors/:id/ping-logs` | Ping history |
| GET | `/api/monitors/:id/incidents` | Incident history |
| GET | `/api/monitors/:id/response-times` | P50/P95/P99 chart data |
| POST | `/api/monitors/:id/notifications` | Add email or webhook config |
| GET | `/api/status` | Public status data (no auth) |
| GET | `/api/health` | Service health check |
| GET | `/api/monitors/:id/report/sla` | Download SLA PDF |

Full OpenAPI spec available at `/api/docs`.

---

## Deployment (Railway)

Two Railway services, one monorepo:

```bash
# Service 1 — Next.js app
railway up --service app

# Service 2 — BullMQ worker
railway up --service worker
```

The Dockerfile uses multi-stage builds. Both services share the same Railway PostgreSQL and Redis add-ons. On worker startup, it reads all active monitors from PostgreSQL and re-registers BullMQ repeatable jobs — Redis data loss does not require manual intervention.

CI/CD via GitHub Actions: push to `main` → Vitest + Playwright → Docker build → Railway deploy. Failing tests block the merge.

---

## Design Decisions

**Why a separate Railway service for the worker?**
BullMQ requires a long-running Node.js process. Vercel/serverless functions time out at 10 seconds and cannot run persistent background jobs. Separating the worker also means a slow batch of HTTP checks never blocks dashboard API responses.

**Why BullMQ over `node-cron` or `setTimeout`?**
BullMQ jobs are persisted in Redis. A worker crash does not lose scheduled jobs — BullMQ re-enqueues any job whose lock expires. `node-cron` jobs vanish on restart, cannot be distributed across workers, and have no retry or dead-letter capability.

**Why PostgreSQL table partitioning for `ping_logs`?**
At 100 monitors × 1 ping/min, logs grow by 52 million rows per year. `DELETE FROM ping_logs WHERE checked_at < '30 days ago'` would scan and lock millions of rows. `DROP TABLE ping_logs_2024_10` is a single metadata operation — instant, no contention.

**Why Redis for rate limiting instead of an in-process counter?**
An in-memory counter resets on every worker restart and cannot be shared across multiple instances of the dashboard service. Redis `INCR` + `EXPIRE` implements a sliding window that survives restarts and works correctly whether one or ten dashboard instances are running. The counter key is `ratelimit:{userId}:{windowStart}` with a 60-second TTL — no cleanup job required.

**Why a partial unique index on `incidents`?**
`CREATE UNIQUE INDEX ON incidents(monitor_id) WHERE status = 'open'` enforces at most one open incident per monitor at the database level. Two concurrent workers detecting the same failure will race to INSERT; one succeeds, the other gets a `23505` constraint violation and skips gracefully — no application-level locking needed.

---

## License

MIT
