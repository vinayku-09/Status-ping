
---

## 16. Testing Strategy

### 16.1 Philosophy

Testing in StatusPing is organized around the **testing pyramid**: many fast unit tests at the base, a moderate number of integration tests in the middle, and a small number of E2E tests at the top. The goal is not 100% coverage — it's **confidence in the business logic that cannot be wrong**.

The three most critical paths to test exhaustively:
1. **Uptime percentage calculation** — incorrect math means incorrect SLA reports
2. **Incident trigger/resolution logic** — incorrect logic means missed alerts or false alarms
3. **Notification cooldown** — incorrect logic means alert storms or missed notifications

---

### 16.2 Unit Tests (Vitest)

Unit tests are pure function tests — no database, no Redis, no HTTP. Fast. Deterministic. Run in < 5 seconds.

#### Coverage targets

| Module | Target |
|---|---|
| Uptime calculation | 100% |
| Incident engine logic | 100% |
| HMAC signature computation | 100% |
| Notification cooldown logic | 100% |
| SSL expiry evaluation | 100% |
| Response time percentile computation | 90% |
| URL validation / SSRF blocklist | 90% |

#### Test cases — uptime calculation

```typescript
describe('calculateUptimePercent', () => {
  it('returns 100% when all checks pass', () => {
    expect(calculateUptimePercent(1440, 1440)).toBe(100);
  });
  it('returns 99.03% for 1440 checks with 14 failures', () => {
    expect(calculateUptimePercent(1426, 1440)).toBeCloseTo(99.03, 2);
  });
  it('returns 0% when all checks fail', () => {
    expect(calculateUptimePercent(0, 1440)).toBe(0);
  });
  it('handles zero total checks without dividing by zero', () => {
    expect(calculateUptimePercent(0, 0)).toBe(null);
  });
});
```

#### Test cases — incident trigger

```typescript
describe('shouldCreateIncident', () => {
  it('creates incident after 2 consecutive failures (threshold=2)', () => {
    expect(shouldCreateIncident({
      consecutiveFailures: 2,
      failureThreshold: 2,
      hasOpenIncident: false
    })).toBe(true);
  });
  it('does NOT create if threshold not yet reached', () => {
    expect(shouldCreateIncident({ consecutiveFailures: 1, failureThreshold: 2, hasOpenIncident: false }))
      .toBe(false);
  });
  it('does NOT create if open incident already exists', () => {
    expect(shouldCreateIncident({ consecutiveFailures: 3, failureThreshold: 2, hasOpenIncident: true }))
      .toBe(false);
  });
  it('does NOT create on single failure then recovery then failure', () => {
    // This tests that consecutive_failures resets on success
    // consecutiveFailures = 1 after second failure in alternating sequence
    expect(shouldCreateIncident({ consecutiveFailures: 1, failureThreshold: 2, hasOpenIncident: false }))
      .toBe(false);
  });
});
```

#### Test cases — SSL expiry

```typescript
describe('shouldAlertSslExpiry', () => {
  it('alerts when 25 days remaining', () => {
    const cert = { daysRemaining: 25 };
    expect(shouldAlertSslExpiry(cert, { lastAlertDaysAgo: 8 })).toBe(true);
  });
  it('does NOT alert when 35 days remaining', () => {
    expect(shouldAlertSslExpiry({ daysRemaining: 35 }, { lastAlertDaysAgo: null })).toBe(false);
  });
  it('does NOT alert if already alerted within 7 days', () => {
    expect(shouldAlertSslExpiry({ daysRemaining: 10 }, { lastAlertDaysAgo: 3 })).toBe(false);
  });
});
```

---

### 16.3 Integration Tests

Integration tests exercise a component with its real dependencies (PostgreSQL, Redis) but mock external services (Resend, webhook targets, monitored URLs).

**Test environment:** Docker Compose spins up PostgreSQL + Redis in CI. Prisma `db push` applies the schema. Each test file runs in a transaction that rolls back after the test (or uses a separate test database schema per test run).

#### Test cases — ping worker

```typescript
describe('Ping Worker Integration', () => {
  it('writes ping_log row when target returns 200', async () => {
    const monitor = await createTestMonitor({ url: 'http://mock-target:3999/health' });
    mockHttpServer.get('/health').reply(200, 'ok', { 'content-type': 'text/plain' });

    await executePingJob({ monitorId: monitor.id });

    const log = await db.ping_logs.findFirst({ where: { monitor_id: monitor.id } });
    expect(log.is_up).toBe(true);
    expect(log.status_code).toBe(200);
    expect(log.response_time_ms).toBeGreaterThan(0);
  });

  it('writes error_type=TIMEOUT when target times out', async () => {
    mockHttpServer.get('/health').delay(15000).reply(200); // exceeds 10s timeout
    await executePingJob({ monitorId: monitor.id, timeoutSeconds: 10 });
    const log = await db.ping_logs.findFirst({ where: { monitor_id: monitor.id } });
    expect(log.is_up).toBe(false);
    expect(log.error_type).toBe('TIMEOUT');
  });

  it('creates incident after 2 consecutive failures', async () => {
    mockHttpServer.get('/health').twice().reply(503);
    await executePingJob({ monitorId: monitor.id }); // failure 1
    await executePingJob({ monitorId: monitor.id }); // failure 2
    const incident = await db.incidents.findFirst({ where: { monitor_id: monitor.id, status: 'open' } });
    expect(incident).not.toBeNull();
  });
});
```

#### Test cases — notification

```typescript
describe('Notification Worker Integration', () => {
  it('sends email via Resend mock on incident open', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 're_test' });
    vi.mock('@resend/node', () => ({ Resend: vi.fn(() => ({ emails: { send: sendMock } })) }));

    await deliverNotification({ incidentId, eventType: 'opened', notificationConfigId });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'dev@example.com',
      subject: expect.stringContaining('down'),
    }));
  });

  it('suppresses notification when cooldown key active', async () => {
    await redis.set(`cooldown:${monitorId}:${notifConfigId}`, '1', 'EX', 1800);
    await deliverNotification({ incidentId, eventType: 'opened', notificationConfigId });
    expect(sendMock).not.toHaveBeenCalled();
  });
});
```

#### Test cases — RBAC

```typescript
describe('API Authorization', () => {
  it('returns 403 when user accesses another user\'s monitor', async () => {
    const [userA, userB] = await createTestUsers(2);
    const monitor = await createTestMonitor({ userId: userA.id });

    const res = await apiRequest('GET', `/api/monitors/${monitor.id}`, { session: userB.session });
    expect(res.status).toBe(403);
  });
});
```

---

### 16.4 E2E Tests (Playwright)

E2E tests exercise the full stack (Next.js app + worker + PostgreSQL + Redis) in a Docker Compose test environment.

#### Test cases

```typescript
test('Create monitor → first ping appears in dashboard', async ({ page }) => {
  await page.goto('/');
  await loginWithGitHub(page); // mocked OAuth in test env
  await page.click('[data-testid="add-monitor-btn"]');
  await page.fill('[name="name"]', 'Test Monitor');
  await page.fill('[name="url"]', 'https://httpbin.org/status/200');
  await page.selectOption('[name="interval"]', '1');
  await page.click('[type="submit"]');
  await expect(page.locator('[data-testid="monitor-status"]')).toContainText('Up', { timeout: 90000 });
});

test('Status page shows monitors without authentication', async ({ page }) => {
  await page.goto('/status');
  await expect(page.locator('[data-testid="overall-status"]')).toBeVisible();
  // Verify no login prompt appeared
  await expect(page.locator('[data-testid="login-btn"]')).not.toBeVisible();
});

test('Incident banner appears on status page after monitor failure', async ({ page }) => {
  await triggerMonitorFailure(testMonitor.id); // inject 2 ping failures via test API
  await page.goto('/status');
  await expect(page.locator('[data-testid="incident-banner"]')).toBeVisible({ timeout: 30000 });
});

test('SLA PDF download contains filename with month and year', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-sla-btn"]')
  ]);
  expect(download.suggestedFilename()).toMatch(/statusping-sla-\d{4}-\d{2}/);
});
```

---

### 16.5 Load Testing

**Tool:** `k6` or `autocannon`

**Scenarios to test:**

| Scenario | Load | Success Criterion |
|---|---|---|
| Dashboard API under load | 100 concurrent users, 60 seconds | P95 < 200ms, 0 errors |
| Status page under load | 500 concurrent visitors, 60 seconds | P95 < 500ms, 0 errors |
| Ping worker throughput | 500 monitors active simultaneously | 100% jobs complete within interval |

**Ping worker throughput test:** Use `docker compose` to spin up 500 monitors (via seed script). Observe BullMQ queue depth in Redis. A healthy worker at concurrency=10 should maintain near-zero queue depth.

---

### 16.6 Chaos Testing

**Scenario 1: Kill Redis mid-ping-cycle**
```bash
docker compose stop redis
# Worker should log errors but not crash
# Ping worker falls back to degraded mode
# Restart Redis after 60s
docker compose start redis
# BullMQ reconnects automatically
# Startup routine re-registers jobs
```

**Scenario 2: Kill PostgreSQL mid-incident-creation**
```bash
# Trigger a monitor failure
# Immediately after: docker compose stop postgres
# Incident worker should fail, BullMQ retries
# Restart postgres after 30s
# Incident creation completes on retry
```

**Scenario 3: Worker restart with active jobs**
```bash
docker compose restart worker
# Existing active BullMQ jobs re-queue after lockDuration
# No duplicate ping_logs (at-most-once concern)
# Startup routine re-registers any lost repeatable jobs
```

---

### 16.7 Mock Strategy

| Dependency | Mock Tool | Notes |
|---|---|---|
| External HTTP targets | `nock` or `msw` | Mock specific status codes, timeouts, redirects |
| Resend API | `vi.mock` | Return fake email ID; test error paths |
| Auth session | `unstable_mockSession` (Auth.js test util) | Inject test user session |
| BullMQ | Real BullMQ + test Redis | Don't mock the queue — test real queue behavior |
| PostgreSQL | Real PostgreSQL + test database | Use transactions or separate schemas per test |
| Redis | Real Redis + separate DB index | `redis.select(1)` for test isolation |

---

### 16.8 CI Coverage Goals

| Suite | Coverage Target | Metric |
|---|---|---|
| Unit tests | 100% of pure functions | Line + branch coverage |
| Integration tests | Critical paths | Function coverage |
| E2E tests | Core user journeys | Path coverage |
| **Overall business logic** | **≥ 75%** | **Lines covered** |

---

## 17. Deployment

### 17.1 Local Development (Docker Compose)

**`docker-compose.yml` services:**

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://statusping:password@postgres:5432/statusping
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]

  worker:
    build:
      context: .
      target: worker
    environment:
      DATABASE_URL: postgres://statusping:password@postgres:5432/statusping
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis, app]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: statusping
      POSTGRES_USER: statusping
      POSTGRES_PASSWORD: password
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
```

**Start command:**
```bash
docker compose up --build
# App: http://localhost:3000
# Worker: running in background
# Postgres: localhost:5432
# Redis: localhost:6379
```

**Seed script:**
```bash
npm run db:seed
# Creates 3 demo monitors (GitHub, Railway, your own API)
# Inserts 30 days of fake ping_logs (realistic uptime patterns)
# Creates 2 sample incidents (one open, one resolved)
```

The seed script is critical: it ensures a recruiter visiting the live demo URL sees a populated dashboard with real-looking data immediately.

---

### 17.2 Production (Railway)

**Service topology:**

```
Railway Project: StatusPing
├── Service 1: app (Next.js)
│   └── Build: Dockerfile, target=app
│   └── Port: 3000
│   └── Health check: GET /api/health
├── Service 2: worker (Node.js)
│   └── Build: Dockerfile, target=worker
│   └── Start: node dist/worker/index.js
│   └── Health check: GET localhost:3001/health
├── Add-on: PostgreSQL (Railway managed)
└── Add-on: Redis (Railway managed)
```

**Why two separate Railway services from one monorepo?**

Railway supports multi-service monorepos via Dockerfile build targets. The `Dockerfile` has two targets:

```dockerfile
FROM node:20-alpine AS base
# ... shared setup ...

FROM base AS app
CMD ["node", "server.js"]

FROM base AS worker
CMD ["node", "dist/worker/index.js"]
```

Service 1 deploys with `--target app`; Service 2 with `--target worker`. They share the same PostgreSQL and Redis add-ons via Railway's internal networking.

---

### 17.3 Environment Variables

```bash
# .env.example — all variables documented, no secrets

# Database
DATABASE_URL="postgresql://user:password@host:5432/statusping"

# Redis
REDIS_URL="redis://host:6379"

# Auth.js
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GITHUB_ID="your-github-oauth-app-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-app-secret"

# Resend
RESEND_API_KEY="re_your_key"
RESEND_FROM_EMAIL="alerts@your-domain.com"

# Webhooks
WEBHOOK_ENCRYPTION_KEY="generate-with-openssl-rand-base64-32"

# App
NEXT_PUBLIC_APP_URL="https://your-app.railway.app"
NODE_ENV="production"

# Worker
PING_WORKER_CONCURRENCY="10"
NOTIFICATION_COOLDOWN_SECONDS="1800"
PING_LOG_RETENTION_DAYS="30"
```

---

### 17.4 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml

name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: statusping_test
          POSTGRES_USER: statusping
          POSTGRES_PASSWORD: password
      redis:
        image: redis:7-alpine

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx prisma db push
        env: { DATABASE_URL: "..." }
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - run: npx playwright install --with-deps
      - run: docker compose -f docker-compose.test.yml up -d
      - run: npm run test:e2e
      - run: docker compose -f docker-compose.test.yml down

  deploy:
    runs-on: ubuntu-latest
    needs: [test, e2e]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: railwayapp/cli@v3
        with:
          command: up --service app
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      - uses: railwayapp/cli@v3
        with:
          command: up --service worker
```

**Policy:** Failing tests block the merge. The `deploy` job only runs on `main` after all tests pass. PRs run tests only — no deploy.

---

### 17.5 Database Migration Strategy

**Tool:** Prisma Migrate

**Development workflow:**
```bash
# After schema change
npx prisma migrate dev --name "add_ssl_check_alert_sent_at"
# Creates migration file in prisma/migrations/
# Applies to local DB
# Generates Prisma client
```

**Production deploy:**
```bash
# In Railway deploy command (before app starts)
npx prisma migrate deploy
# Applies any pending migrations in order
# Idempotent — already-applied migrations are skipped
```

**Partition creation:** Monthly ping_logs partitions must be created before the month begins. A BullMQ cron job (`0 0 25 * *` — 25th of each month) creates the next month's partition. This runs in the worker.

---

### 17.6 Rollback Strategy

**Application rollback:** Railway supports one-click service rollback to any previous deploy. No code changes required.

**Database rollback:** Prisma does not auto-generate rollback migrations. Before every production migration:
1. Take a PostgreSQL backup (Railway dashboard → point-in-time restore)
2. Write a down migration manually if the change is destructive (column drop, table drop)
3. For additive changes (new table, new column with default): no rollback needed — the previous app version ignores unknown columns

---

## 18. Monitoring & Observability

> *StatusPing monitors other services. Who monitors StatusPing?*

### 18.1 Health Endpoints

| Service | Endpoint | Checks |
|---|---|---|
| Dashboard | `GET /api/health` | PostgreSQL connectivity, Redis connectivity, version |
| Worker | `GET localhost:3001/health` | Queue counts per queue, PostgreSQL, Redis |

Railway uses the health endpoint for zero-downtime deploys: the new instance must return 200 before Railway cuts traffic from the old instance.

---

### 18.2 Structured Logging

Every log entry is JSON (structured), not plain text. This enables filtering in Railway's log viewer and future integration with Datadog/Loki.

```json
{
  "timestamp": "2025-01-15T10:30:00.123Z",
  "level": "INFO",
  "service": "worker",
  "component": "ping-worker",
  "trace_id": "abc123def456",
  "monitor_id": "mon_xyz789",
  "message": "Ping complete: 200 OK in 287ms",
  "metadata": {
    "status_code": 200,
    "response_time_ms": 287,
    "is_up": true
  }
}
```

**Log levels:**
- `DEBUG`: Job dequeue, cache hit/miss
- `INFO`: Ping result, incident created/resolved, notification sent
- `WARN`: Cooldown suppressed notification, Redis reconnecting, high queue depth
- `ERROR`: Job failed, PostgreSQL error, Resend API error (with stack trace)

---

### 18.3 Application Metrics (Worker)

The worker tracks counters and gauges in memory, exposed via the `/metrics` health endpoint:

| Metric | Type | Description |
|---|---|---|
| `pings_executed_total` | Counter | Total ping jobs completed |
| `pings_failed_total` | Counter | Total ping jobs that resulted in is_up=false |
| `incidents_opened_total` | Counter | Total incidents created |
| `incidents_resolved_total` | Counter | Total incidents resolved |
| `notifications_sent_total` | Counter | Total emails delivered |
| `notifications_suppressed_total` | Counter | Total notifications skipped by cooldown |
| `queue_depth_ping` | Gauge | Current waiting jobs in ping-queue |
| `worker_memory_rss_bytes` | Gauge | Worker process RSS memory |

---

### 18.4 BullMQ Queue Monitoring

BullMQ exposes queue metrics natively. The worker health endpoint aggregates:

```json
{
  "queues": {
    "ping-queue": { "waiting": 0, "active": 7, "completed": 14400, "failed": 3 },
    "incident-queue": { "waiting": 0, "active": 0, "completed": 12, "failed": 0 },
    "notification-queue": { "waiting": 2, "active": 1, "completed": 24, "failed": 0 }
  }
}
```

**Alert thresholds (internal):**
- `ping-queue.waiting > 100` → Worker falling behind; consider increasing concurrency
- `notification-queue.failed > 0` → Notification delivery issue; check Resend API key
- `worker_memory_rss_bytes > 512MB` → Potential memory leak; investigate

---

### 18.5 Database Metrics

Key PostgreSQL queries to watch (via `pg_stat_statements` extension):

| Query | Concern | Action |
|---|---|---|
| `INSERT INTO ping_logs` | Write latency > 20ms | Check PostgreSQL disk I/O |
| `SELECT FROM ping_logs WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT 100` | Seq scan (no index used) | Verify composite index exists |
| `SELECT FROM daily_stats WHERE monitor_id = ? AND stat_date >= ?` | Slow for status page | Check `idx_daily_stats_monitor_date` |

**Connection pool monitoring:** If active connections approach the pool limit (`DATABASE_POOL_SIZE` × worker instances), increase pool size or reduce worker concurrency.

---

### 18.6 Alerting for StatusPing Itself

For production deployments, the irony of a monitoring service needing to be monitored is intentional and instructive. Two options:

1. **Self-monitoring:** Add StatusPing itself (`/api/health`) as a monitor — if it goes down, no alerts are sent (it can't alert itself). This covers only infrastructure failures.

2. **External watchdog:** Use UptimeRobot (free) or Freshping to monitor StatusPing's `/api/health` endpoint. This is the production pattern: StatusPing monitors your services; an external service monitors StatusPing.

---

## 19. Future Improvements

These are not included in v1.0 but represent natural architectural evolution:

### Infrastructure

| Improvement | Rationale |
|---|---|
| **Prometheus + Grafana** | Export worker metrics in Prometheus format; visualize queue health, ping success rates, MTTD trends |
| **OpenTelemetry distributed tracing** | Trace a ping job end-to-end across worker → incident engine → notification worker with span IDs |
| **Kafka (replaces BullMQ for high-volume)** | For > 10,000 monitors, Kafka's log-based architecture provides better throughput than Redis lists; enables consumer groups, replay, and stream processing |
| **Kubernetes + Horizontal Pod Autoscaler** | Scale ping workers based on queue depth; zero-downtime rolling updates |
| **Multi-region probe distribution** | Run ping workers in 3+ regions (US, EU, Asia); a monitor is "down" only if multiple regions confirm failure — eliminates regional network blip false positives |

### Notifications

| Channel | Complexity | Notes |
|---|---|---|
| Slack | Low | Use Slack Incoming Webhooks; same webhook delivery infrastructure |
| Microsoft Teams | Low | Adaptive Cards format |
| PagerDuty | Medium | PagerDuty Events API v2 integration |
| SMS (Twilio/Vonage) | Medium | Per-SMS cost; add rate limiting |
| Discord | Low | Discord webhook format |

### Product Features

| Feature | Backend Impact |
|---|---|
| **RBAC** | Add `roles` table; monitors can be shared across team members; API enforces role-based access |
| **Public API keys** | Add `api_keys` table; allow programmatic monitor creation without browser session |
| **SLO management** | Users define SLO targets (99.9%); system tracks budget burn rate; alert when error budget < 20% |
| **Custom domains for status pages** | Store `custom_domain` in `users` table; Railway/Cloudflare CNAME configuration; cert provisioning via Let's Encrypt |
| **TCP/UDP port monitoring** | New `protocol` field on monitors; separate TCP/UDP worker (requires raw socket access) |
| **Multi-tenant architecture** | `organizations` table; `user_organizations` join table; all resources scoped to organization not user |

---

## 20. Engineering Decisions

### ED-001 — BullMQ vs. Node-Cron

| | BullMQ | node-cron |
|---|---|---|
| **Job persistence** | ✅ Redis-backed — survives restarts | ❌ In-memory — lost on crash |
| **Distributed workers** | ✅ Multiple workers, no duplication | ❌ Each instance runs its own cron |
| **Dead-letter queue** | ✅ Built-in | ❌ None |
| **Retry logic** | ✅ Configurable backoff | ❌ Manual |
| **Job priority** | ✅ Yes | ❌ No |
| **Visibility** | ✅ Queue depth, active jobs visible | ❌ Black box |
| **Complexity** | Higher — requires Redis | Lower — no external dependency |

**Decision:** BullMQ. The persistence and retry guarantees are non-negotiable for a monitoring system. A ping that silently disappears because the worker restarted is unacceptable. The Redis dependency is justified by the operational guarantees it provides.

---

### ED-002 — PostgreSQL vs. MongoDB

| | PostgreSQL | MongoDB |
|---|---|---|
| **Relational integrity** | ✅ Foreign keys, constraints | ❌ Application-enforced only |
| **Partial unique indexes** | ✅ (critical for incident deduplication) | ❌ Limited |
| **Time-series queries** | ✅ With composite indexes | ✅ With appropriate schema |
| **Table partitioning** | ✅ Native PARTITION BY RANGE | ❌ Not native |
| **ACID transactions** | ✅ Full | ✅ (since 4.0, single-node only) |
| **Joins** | ✅ Efficient | ❌ `$lookup` is slow at scale |
| **JSON columns** | ✅ JSONB with indexing | ✅ Native |

**Decision:** PostgreSQL. The partial unique index for incident deduplication is a PostgreSQL-specific feature that solves a critical correctness problem at the database layer — not the application layer. Every workaround in MongoDB would require application-level coordination with distributed lock semantics.

---

### ED-003 — Next.js API Routes vs. Separate Express Server

| | Next.js API Routes | Separate Express |
|---|---|---|
| **Monorepo simplicity** | ✅ One project, one deploy | ❌ Two projects, two deploys |
| **Shared types** | ✅ Frontend + API share TypeScript | ❌ Requires shared package |
| **Long-running processes** | ❌ Not supported (serverless model) | ✅ Yes |
| **Middleware ecosystem** | Limited | Rich (Express ecosystem) |
| **Learning curve** | Lower for Next.js-familiar devs | Higher |

**Decision:** Next.js API routes for the dashboard/API. The ping worker is a separate Node.js process precisely because it needs long-running processes — this is not possible in Next.js route handlers. The separation is intentional: the API layer is thin (CRUD), and the business logic lives in the worker.

---

### ED-004 — Prisma ORM vs. Drizzle ORM

| | Prisma | Drizzle |
|---|---|---|
| **Schema definition** | Prisma Schema Language (.prisma) | TypeScript code |
| **Type safety** | ✅ Generated client | ✅ Excellent |
| **Migration system** | ✅ Mature, versioned | ✅ Growing |
| **Query performance** | Good — generates efficient SQL | Better — closer to raw SQL |
| **Partition awareness** | ❌ Not aware of partitions | ❌ Not aware of partitions |
| **Raw SQL escape hatch** | `prisma.$queryRaw` | Native |
| **Ecosystem maturity** | Very mature (3M+ weekly downloads) | Growing rapidly |
| **Bundle size** | Larger | Smaller |

**Decision:** Prisma. For a portfolio project, Prisma's DX and ecosystem maturity reduce implementation time significantly. The generated client catches type errors at compile time. Drizzle would be a valid choice for production systems where raw SQL performance matters, but for StatusPing's scale, Prisma's overhead is negligible.

---

### ED-005 — Redis for Cooldown vs. PostgreSQL

**Alternative:** Store notification cooldown as a `last_notified_at` column in `notification_configs`. Check if `NOW() - last_notified_at > cooldown_interval`.

**Problems with PostgreSQL approach:**
1. Every notification check requires a database read + conditional write (UPDATE `last_notified_at`)
2. Race condition: two concurrent notification workers could both read "no cooldown" and both send
3. Redis TTL is atomic and requires zero application logic — SET with EX is one operation

**Decision:** Redis with TTL. The `SETNX` + `EXPIRE` pattern is purpose-built for this exact use case. No race condition, no cleanup job required (TTL handles expiry automatically), no database load.

---

### ED-006 — Raw Log Retention vs. Infinite Storage

**Alternative:** Keep all ping logs forever. Storage is cheap.

**Why this fails at scale:**
```
100 monitors × 1 ping/min × 1 year = 52,560,000 rows
PostgreSQL table: ~10 GB
Query "last 100 pings for this monitor": full scan of 52M rows (without precise index)
Vacuum and autovacuum overhead: grows proportionally
```

**Actual cost:** AWS RDS PostgreSQL t3.medium (2 vCPU, 4 GB RAM) starts slowing down on sequential scans above ~100M rows. For a free-tier Railway PostgreSQL instance, performance degrades much sooner.

**Decision:** 30-day raw retention + indefinite daily aggregation. The status page's 90-day uptime bar reads from `daily_stats` (90 rows, instant). The dashboard's response time chart reads from `daily_stats` (30 rows). Raw logs are only needed for the "recent pings" table in the monitor detail view — a 24-hour window is sufficient.

---

### ED-007 — Aggregation Strategy: P50/P95/P99 vs. Average

**Why not just store average response time?**

Average response time is mathematically misleading for latency:
- If 99 pings complete in 100ms and 1 ping takes 10,000ms: average = 199ms
- P99 = 10,000ms (the true tail latency)

Users of slow endpoints experience the tail, not the average. Every professional APM tool (Datadog, New Relic, Grafana) presents percentile bands, not averages. Using percentiles correctly and explaining the distinction in an interview signals genuine backend maturity.

**PostgreSQL percentile computation:**
```sql
SELECT
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) AS p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) AS p99
FROM ping_logs
WHERE monitor_id = $1 AND DATE(checked_at) = $2;
```

---

## 21. Learning Guide

This section maps each StatusPing module to the backend concepts you need to understand before implementing it. The modules are ordered by build sequence — implement in this order for the smoothest learning curve.

---

### Module 1: Database Setup + Prisma

**Build first.** Everything else depends on this.

| | Details |
|---|---|
| **Required Knowledge** | SQL basics, relational data modeling, foreign keys, indexes |
| **Concepts to learn** | Prisma schema syntax, `prisma migrate dev`, connection strings, `DATABASE_URL` format, `prisma generate` |
| **Key resources** | Prisma docs: [prisma.io/docs](https://prisma.io/docs), "Designing Data-Intensive Applications" (Kleppmann) Ch. 2 |
| **Difficulty** | ⭐⭐ |
| **Estimated time** | 2–3 days |

**What to implement:** All tables from Section 9. Run `prisma migrate dev`. Write a seed script. Verify data with `prisma studio`.

---

### Module 2: Auth (GitHub OAuth)

| | Details |
|---|---|
| **Required Knowledge** | HTTP cookies, session management, OAuth 2.0 flow |
| **Concepts to learn** | OAuth authorization code flow, Auth.js v5 adapters, Prisma adapter, `httpOnly` cookies, `AUTH_SECRET` |
| **Key resources** | Auth.js docs: [authjs.dev](https://authjs.dev), OAuth RFC 6749 (skim sections 1-4) |
| **Difficulty** | ⭐⭐ |
| **Estimated time** | 1–2 days |

---

### Module 3: Monitor CRUD API

| | Details |
|---|---|
| **Required Knowledge** | REST API design, HTTP methods, JSON, server-side validation |
| **Concepts to learn** | Zod schema validation, Next.js Route Handlers, Prisma CRUD operations, SSRF attack vectors |
| **Key resources** | Zod docs, OWASP SSRF prevention cheat sheet |
| **Difficulty** | ⭐⭐ |
| **Estimated time** | 2 days |

---

### Module 4: BullMQ + Redis — Ping Queue

**This is the core differentiator. Spend the most time here.**

| | Details |
|---|---|
| **Required Knowledge** | Node.js async/await, `ioredis` basics, what a job queue is conceptually |
| **Concepts to learn** | BullMQ `Queue`, `Worker`, `QueueScheduler`, repeatable jobs, `jobId` idempotency, `removeOnComplete`, `concurrency`, `lockDuration` |
| **Key resources** | BullMQ docs: [docs.bullmq.io](https://docs.bullmq.io), "Understanding BullMQ" (BullMQ GitHub wiki) |
| **Difficulty** | ⭐⭐⭐⭐ |
| **Estimated time** | 4–5 days |

**What to implement first:** Get a BullMQ repeatable job running every 60 seconds that logs "ping" to the console. Then add the HTTP fetch. Then add the PostgreSQL write. Do NOT build the dashboard yet.

---

### Module 5: HTTP Health Check Worker

| | Details |
|---|---|
| **Required Knowledge** | HTTP protocol, status codes, fetch API, TCP timeouts |
| **Concepts to learn** | `AbortController` for timeouts, redirect chains, `fetch` response lifecycle, TLS certificate inspection via Node.js `tls.connect()` |
| **Key resources** | MDN Fetch API docs, Node.js `tls` module docs, RFC 7231 (HTTP semantics) |
| **Difficulty** | ⭐⭐⭐ |
| **Estimated time** | 2–3 days |

**Edge cases to implement:** timeout handling, redirect counting, keyword check, error type classification (TIMEOUT vs DNS_FAILURE vs HTTP_ERROR).

---

### Module 6: Incident Engine

| | Details |
|---|---|
| **Required Knowledge** | PostgreSQL transactions, ACID properties, race conditions |
| **Concepts to learn** | PostgreSQL partial unique indexes, `ON CONFLICT`, Prisma `$transaction`, handling `P2002` error code, distributed systems idempotency |
| **Key resources** | PostgreSQL docs: partial indexes, "Designing Data-Intensive Applications" Ch. 7 (transactions) |
| **Difficulty** | ⭐⭐⭐⭐ |
| **Estimated time** | 3 days |

**The key insight to understand:** Why does the partial unique index `WHERE status = 'open'` prevent duplicate incidents at the database level, and why is this better than application-level locking?

---

### Module 7: Notification System

| | Details |
|---|---|
| **Required Knowledge** | HTTP APIs, Redis commands (`SET`, `GET`, `DEL`, `EXPIRE`) |
| **Concepts to learn** | Resend API, `ioredis` key-value operations, TTL-based cooldowns, exponential backoff pattern, HMAC-SHA256 |
| **Key resources** | Resend docs: [resend.com/docs](https://resend.com/docs), Redis commands reference, HMAC RFC 2104 |
| **Difficulty** | ⭐⭐⭐ |
| **Estimated time** | 3 days |

---

### Module 8: Public Status Page

| | Details |
|---|---|
| **Required Knowledge** | Next.js Server Components, HTTP caching |
| **Concepts to learn** | Next.js `async` Server Components, Redis caching with TTL, `revalidate` configuration, Lighthouse performance scoring |
| **Key resources** | Next.js App Router docs: [nextjs.org/docs](https://nextjs.org/docs/app), Web.dev (Lighthouse scoring) |
| **Difficulty** | ⭐⭐ |
| **Estimated time** | 2 days |

---

### Module 9: Dashboard UI + Charts

| | Details |
|---|---|
| **Required Knowledge** | React, basic data fetching patterns |
| **Concepts to learn** | shadcn/ui component installation, Recharts `LineChart`, data formatting for percentile charts |
| **Key resources** | shadcn/ui docs, Recharts docs |
| **Difficulty** | ⭐⭐ |
| **Estimated time** | 3 days |

---

### Module 10: Data Retention Worker

| | Details |
|---|---|
| **Required Knowledge** | PostgreSQL table partitioning, aggregate functions |
| **Concepts to learn** | `PARTITION BY RANGE`, `PERCENTILE_CONT`, `DROP TABLE` for partitions, BullMQ cron syntax, `UPSERT` with `ON CONFLICT DO NOTHING` |
| **Key resources** | PostgreSQL partitioning docs, "PostgreSQL: Up and Running" |
| **Difficulty** | ⭐⭐⭐⭐ |
| **Estimated time** | 3 days |

---

### Module 11: Testing Suite

| | Details |
|---|---|
| **Required Knowledge** | JavaScript testing basics, mocking concepts |
| **Concepts to learn** | Vitest `describe`/`it`, `vi.mock`, `vi.fn()`, Docker Compose for test environments, Playwright `page.goto`, `test.beforeEach` |
| **Key resources** | Vitest docs, Playwright docs |
| **Difficulty** | ⭐⭐⭐ |
| **Estimated time** | 4 days |

---

### Module 12: CI/CD + Docker

| | Details |
|---|---|
| **Required Knowledge** | Docker basics (FROM, RUN, COPY, CMD) |
| **Concepts to learn** | Multi-stage Docker builds (separate `app` and `worker` targets), GitHub Actions YAML, Railway CLI, `prisma migrate deploy` in production |
| **Key resources** | Docker multi-stage builds docs, GitHub Actions quickstart, Railway docs |
| **Difficulty** | ⭐⭐⭐ |
| **Estimated time** | 2 days |

---

### Recommended Build Order

```mermaid
graph LR
    A[1. DB + Prisma] --> B[2. Auth]
    B --> C[3. Monitor CRUD API]
    C --> D[4. BullMQ Setup]
    D --> E[5. HTTP Worker]
    E --> F[6. Incident Engine]
    F --> G[7. Notifications]
    G --> H[8. Status Page]
    H --> I[9. Dashboard UI]
    I --> J[10. Retention Worker]
    J --> K[11. Tests]
    K --> L[12. CI/CD]
```

**The single most important rule:** Complete Module 4 (BullMQ) and Module 5 (HTTP Worker) before touching the dashboard UI. A working BullMQ worker that pings and logs to PostgreSQL — even with no frontend at all — is more impressive and more technically significant than a beautiful dashboard with fake data behind it.

---

### Key Background Reading

Before starting, read or skim these resources:

| Resource | Why |
|---|---|
| "Designing Data-Intensive Applications" (Kleppmann) | Database transactions, distributed systems, message queues — the conceptual foundation for everything in this project |
| BullMQ documentation (full) | The queue architecture drives the entire backend |
| PostgreSQL documentation: Partitioning | The retention strategy is non-obvious without understanding partitions |
| OWASP Top 10 (relevant sections) | SSRF (A10), broken access control (A01) are directly applicable |
| Stripe Engineering Blog | "How we designed our payment infrastructure" — see how production systems use queues and idempotency keys |

---

*End of StatusPing Technical Documentation — v1.0.0*

---

> **Document maintained by:** Architecture Team  
> **Last updated:** 2025  
> **Status:** Ready for implementation
