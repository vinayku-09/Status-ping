# StatusPing — Complete Technical Documentation

> **Version:** 1.0.0 | **Status:** Architecture Draft | **Audience:** Backend Engineers

---

## Table of Contents

1. [Project Introduction](#1-project-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Product Requirement Document (PRD)](#3-product-requirement-document-prd)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [User Flow](#6-user-flow)
7. [Application Flow](#7-application-flow)
8. [System Architecture](#8-system-architecture)
9. [Database Design](#9-database-design)
10. [Business Rules](#10-business-rules)
11. [REST API Contract](#11-rest-api-contract)
12. [Queue Architecture](#12-queue-architecture)
13. [Worker Design](#13-worker-design)
14. [Failure Scenarios](#14-failure-scenarios)
15. [Sequence Diagrams](#15-sequence-diagrams)
16. [Testing Strategy](#16-testing-strategy)
17. [Deployment](#17-deployment)
18. [Monitoring & Observability](#18-monitoring--observability)
19. [Future Improvements](#19-future-improvements)
20. [Engineering Decisions](#20-engineering-decisions)
21. [Learning Guide](#21-learning-guide)

---

## 1. Project Introduction

### What is StatusPing?

StatusPing is a **self-hosted uptime monitoring and public status page platform** — a system that continuously checks whether web services are reachable, measures their response times, detects failures, automatically opens and resolves incidents, delivers notifications to operators, and exposes a public-facing status page that end users can consult without authentication.

Think of it as the backend machinery behind products like UptimeRobot, Better Stack, or Pingdom — except you own every layer of the stack, you control every engineering decision, and you can reason about every component in an interview room.

---

### Why Does Uptime Monitoring Exist?

Every software service on the internet can fail. A web server crashes. A database runs out of disk. A CDN misconfigures a routing rule. A developer deploys a breaking change on Friday at 5pm. From the outside, all of these failures look identical: the URL stops responding.

The naive approach to detecting failure is to wait for a customer to report it. By the time a support ticket arrives, a blog post goes up, or a tweet goes viral, you have already lost 20-40 minutes of revenue-generating time — and every minute of that downtime has a calculable cost.

Uptime monitoring replaces human error reporting with an automated, deterministic, low-latency detection loop: a worker pings your endpoint every 60 seconds; if it fails twice in a row, an incident is opened and notifications are dispatched immediately.

---

### Real-World Problems It Solves

| Problem | Without Monitoring | With StatusPing |
|---|---|---|
| Service outage | Discovered by customers | Detected within 1 check interval |
| SSL cert expiry | Site shows browser security warning | Alert sent 30 days in advance |
| Slow API regression | Users report "app feels sluggish" | P95 latency spike visible on dashboard |
| Incident duration | Unknown, estimated in post-mortem | MTTD and MTTR computed automatically |
| SLA reporting | Manual spreadsheet per quarter | PDF report generated on demand |
| Vendor accountability | Verbal agreement | Public status page with 90-day history |

---

### Why Companies Use Monitoring

**Revenue protection.** For an e-commerce site generating $100,000/day, a 30-minute outage costs ~$2,100. Monitoring that detects the failure in 60 seconds vs. 30 minutes reduces revenue loss by 96%.

**SLA compliance.** Enterprise contracts specify uptime SLAs — typically 99.9% (8.7 hours downtime/year) or 99.95% (4.4 hours/year). Violating an SLA triggers financial penalties. Monitoring provides the evidence needed to track compliance.

**Operational confidence.** Engineering teams deploy more confidently when a monitoring system will catch regressions within seconds.

**Customer trust.** A public status page is a trust signal. It says: "We acknowledge failures transparently, in real time, rather than hiding them." Companies like GitHub, Stripe, and Cloudflare operate public status pages as first-class engineering products.

---

### Why Startups Need It

Early-stage startups often operate without dedicated SRE teams. A single engineer owns the entire backend. When the service goes down at 2am, nobody knows until a paying customer tweets. StatusPing gives a zero-ops team the detection capability of a mature SRE function.

The public status page also has a sales motion: prospects evaluating your API ask, "Do you have a status page?" A polished, real-time status page signals operational maturity beyond your headcount.

---

### Monitoring vs. Logging vs. Observability

These three terms are often conflated. They are distinct.

| Concept | What It Answers | Example |
|---|---|---|
| **Monitoring** | "Is the system up right now?" | Uptime check passes/fails; alert fires |
| **Logging** | "What happened and when?" | Request log: `POST /api/checkout 500 230ms` |
| **Observability** | "Why is the system behaving this way?" | Distributed trace showing DB query taking 8s |

StatusPing is a **monitoring** system. It does not replace a logging platform (Datadog, Loki) or a distributed tracing system (Jaeger, Tempo). It answers the binary question — up or down — with precision and speed, and it keeps a historical record of that answer.

---

### Who Uses This Software?

- **Indie developers** who need a self-hosted alternative to UptimeRobot
- **Startups** that want a status page without paying $30/month to Better Stack
- **Platform engineering teams** evaluating internal uptime tooling
- **DevOps engineers** who need webhook delivery into PagerDuty or Slack

---

### Competitive Landscape

| Product | Pricing | Self-hosted | Workers | Webhook | Status Page |
|---|---|---|---|---|---|
| UptimeRobot | Free / $7/mo | ❌ | ✅ | ✅ | ✅ |
| Better Stack | Free / $24/mo | ❌ | ✅ | ✅ | ✅ |
| Pingdom | $10/mo | ❌ | ✅ | ✅ | ✅ |
| Freshping | Free / $11/mo | ❌ | ✅ | ✅ | ✅ |
| **StatusPing** | **Free (self-hosted)** | **✅** | **✅** | **✅** | **✅** |

StatusPing's differentiator is **full ownership**: the schema, the retention policy, the notification logic, the status page branding — every layer is inspectable and modifiable.

---

### Why This Project Wins Backend Engineering Interviews

StatusPing demonstrates backend maturity that college projects almost never demonstrate:

1. **Async job processing with BullMQ** — Hiring managers at mid/senior levels consider job queues a basic professional competency. Most fresher portfolios have none.
2. **Distributed system reasoning** — Two Railway services, a Redis job store, and a PostgreSQL write path with race condition prevention.
3. **Production-grade schema design** — Partitioning strategy, composite indexes, retention policies, soft deletes.
4. **Reliability engineering vocabulary** — MTTD, MTTR, P95 latency, SLA, dead-letter queues. Using these terms correctly signals engineering seniority.
5. **Live demo without signup** — The public `/status` page is immediately visible to a recruiter without an account. That is rare.

---

## 2. Problem Statement

### Current Problems

#### 2.1 Manual Monitoring Fails

The absence of automated monitoring forces teams into one of two failure modes:

**Reactive discovery:** Customers report outages via support tickets, social media, or app store reviews. By the time the engineering team is notified, formulates a response, and resolves the incident, 30–90 minutes have elapsed.

**Polling theater:** An engineer manually checks services in a browser, periodically, inconsistently. This is error-prone, doesn't scale beyond 5–10 services, provides zero historical record, and creates no repeatable incident process.

#### 2.2 Pain Points by Stakeholder

**Engineering teams:**
- No automated detection → slow MTTD (Mean Time to Detect)
- No incident history → repeated post-mortems without data
- No structured on-call flow → engineers must check manually on weekends
- No SLA evidence → finance and legal cannot produce compliance reports

**Product and business:**
- Customer trust erodes during unannounced outages
- No public status page → customers assume the worst and churn
- No MTTR data → cannot quantify the cost of reliability investment

**End users:**
- No transparency about known issues → flood support channels with duplicate tickets
- No estimated resolution time → uncertainty breeds frustration

#### 2.3 Business Impact

| Metric | Without Monitoring | With Monitoring |
|---|---|---|
| MTTD | 20–60 min | < 2 min (one check interval) |
| MTTR | Unknown baseline | Measurable; drives improvement |
| Customer churn due to downtime | Unquantified | Correlatable with incident history |
| SLA penalty exposure | High | Measurable and manageable |

#### 2.4 Why Automated Monitoring Is Needed

Human attention is expensive, inconsistent, and non-scalable. A BullMQ worker running on a Railway container costs ~$0/month on the free tier and checks 100 monitors every 60 seconds, 24 hours a day, 365 days a year, without sick days or cognitive load.

---

### Success Criteria

A successful StatusPing deployment satisfies these measurable outcomes:

| Criterion | Target |
|---|---|
| MTTD for total outage | ≤ 1 check interval (60s default) |
| Notification latency | ≤ 30s from incident creation |
| False positive rate | < 0.1% (require N=2 consecutive failures) |
| Status page availability | ≥ 99.5% (SSR + edge caching) |
| Ping log retention | 30 days raw; indefinite aggregated |
| API response time (P95) | < 200ms for dashboard queries |

---

## 3. Product Requirement Document (PRD)

### Vision

StatusPing is the self-hosted monitoring platform that gives solo developers and small engineering teams the uptime visibility and public transparency of enterprise SRE tooling — without vendor lock-in, without per-seat pricing, and without surrendering operational control.

---

### Goals

**Primary goal:** Detect service failures faster than any user will report them, and notify the right people immediately.

**Secondary goal:** Provide public-facing uptime history that builds customer trust.

**Tertiary goal:** Produce auditable SLA data for compliance and engineering retrospectives.

---

### Target Users

**Primary:** Solo developers and small engineering teams (1–10 engineers) who manage 5–50 HTTP/HTTPS endpoints and need automated failure detection with notification delivery.

**Secondary:** DevOps and platform engineering teams evaluating self-hosted alternatives to SaaS monitoring tools.

**Tertiary:** Open source project maintainers who want a status page for their hosted services.

---

### User Personas

**Persona A — Alex, Full-Stack Startup Founder**
- Runs a SaaS app with 3 backend services and a Stripe webhook receiver
- Has been paged by customers twice for outages he didn't know about
- Wants email + webhook notification to a Slack channel when any service goes down
- Needs a public status page URL to send to enterprise prospects

**Persona B — Priya, Platform Engineer at a 15-person company**
- Manages 20 internal and external API endpoints
- Needs incident history for quarterly SLA reviews
- Wants HMAC-signed webhooks that push to PagerDuty
- Cares about data retention and storage cost

**Persona C — Marcus, Indie Developer**
- Deploys on Railway, uses free tier wherever possible
- Runs 5 side projects, wants monitoring without paying $25/month
- Happy to self-host; needs docker-compose setup to be simple

---

### Use Cases

| ID | Use Case | Actor |
|---|---|---|
| UC-01 | Register with GitHub OAuth | New user |
| UC-02 | Create an HTTP monitor | Authenticated user |
| UC-03 | Configure check interval | Authenticated user |
| UC-04 | Pause and resume a monitor | Authenticated user |
| UC-05 | View incident history | Authenticated user |
| UC-06 | Configure email notification | Authenticated user |
| UC-07 | Configure webhook delivery | Authenticated user |
| UC-08 | View public status page | Anonymous visitor |
| UC-09 | Export SLA PDF report | Authenticated user |
| UC-10 | Delete a monitor with history | Authenticated user |

---

### MVP Scope

The MVP is the smallest set of features that produces a demonstrable, end-to-end working monitoring system:

1. **Monitor CRUD** — Create, read, update (pause/resume), delete HTTP/HTTPS monitors
2. **BullMQ ping worker** — Scheduled HTTP health checks with configurable intervals
3. **Ping log storage** — Persist status code, response time, error type per check
4. **Incident engine** — Auto-create/resolve incidents on consecutive failures
5. **Email notifications** — Resend on incident open and resolve
6. **Public status page** — Server-rendered `/status` route with 90-day history
7. **Dashboard** — Monitor list with uptime %, last check time, incident count
8. **Auth** — GitHub OAuth via Auth.js v5

---

### Advanced Scope

After MVP is stable:

1. Response time P50/P95/P99 percentile tracking per day
2. SSL certificate expiry monitoring and alerting
3. HMAC-signed webhook delivery with retry and dead-letter queue
4. SLA PDF report export (Puppeteer)
5. Custom status page branding (logo, domain, headline)
6. Data retention worker (aggregate old ping logs)
7. Dead-letter queue inspection endpoint
8. Monitor keyword check (assert response body contains string)

---

### Out of Scope (v1.0)

- TCP/UDP port monitoring
- DNS record monitoring
- Multi-region probe distribution
- Prometheus/Grafana integration
- Slack / Teams / PagerDuty native integrations
- RBAC beyond single-user ownership
- Public API key authentication
- Kubernetes deployment

---

### Assumptions

1. Check intervals are per-minute granularity (1, 5, 15, 30, 60 minutes)
2. Each user owns their monitors; no sharing between users in v1
3. The BullMQ worker runs as a separate Railway service
4. Redis is managed (Railway add-on); no Redis Sentinel/Cluster in v1
5. All timestamps stored as UTC epoch milliseconds

---

### Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Ping worker throughput | ≥ 60 monitors/min on 1 worker | BullMQ queue metrics |
| Incident detection latency | ≤ 1 check interval | `incident.created_at - ping_log.checked_at` |
| Notification latency | ≤ 30s from incident creation | `notification_log.sent_at - incident.created_at` |
| Status page Lighthouse score | ≥ 95 | CI Lighthouse audit |
| Test coverage (business logic) | ≥ 75% | Vitest coverage report |
| API P95 response time | ≤ 200ms | Server timing headers |

---

## 4. Functional Requirements

> Each requirement follows the format: ID, Description, Priority (P0=must-have, P1=should-have, P2=nice-to-have), Input, Output, Business Logic, Validation Rules, Acceptance Criteria.

---

### Monitor Management

#### FR-001 — Create Monitor

| Field | Value |
|---|---|
| **ID** | FR-001 |
| **Description** | Authenticated user creates an HTTP/HTTPS monitor |
| **Priority** | P0 |
| **Input** | `name`, `url`, `check_interval_minutes`, `failure_threshold`, `timeout_seconds`, `keyword_check` (optional) |
| **Output** | Monitor record persisted; BullMQ repeatable job registered |
| **Business Logic** | Validate URL scheme is `http://` or `https://`. Normalize URL (strip trailing slash). Set `status = 'pending'`. Immediately enqueue first ping to reduce initial detection delay. Register BullMQ repeatable job with `jobId = monitor:{id}`. |
| **Validation Rules** | URL must be valid RFC 3986. `check_interval_minutes` ∈ {1, 5, 15, 30, 60}. `timeout_seconds` ∈ [5, 30]. `failure_threshold` ∈ [1, 5]. `name` max 100 chars. |
| **Acceptance Criteria** | Monitor appears in dashboard. BullMQ job visible in Redis. First ping executes within `check_interval_minutes`. |

#### FR-002 — Pause Monitor

| Field | Value |
|---|---|
| **ID** | FR-002 |
| **Description** | User pauses a monitor; pings stop until resumed |
| **Priority** | P0 |
| **Input** | `monitor_id` |
| **Output** | `monitor.status = 'paused'`; BullMQ repeatable job removed |
| **Business Logic** | Remove BullMQ repeatable job by `jobId`. Set `monitor.status = 'paused'`. Do NOT delete ping history. Any in-flight job completes normally. |
| **Validation Rules** | Monitor must belong to authenticated user. Monitor must be in `active` or `degraded` or `down` state. |
| **Acceptance Criteria** | No new pings execute after pause. Existing ping logs retained. Dashboard shows "Paused" badge. |

#### FR-003 — Resume Monitor

| Field | Value |
|---|---|
| **ID** | FR-003 |
| **Description** | User resumes a paused monitor |
| **Priority** | P0 |
| **Input** | `monitor_id` |
| **Output** | `monitor.status = 'active'`; BullMQ repeatable job re-registered |
| **Business Logic** | Re-register BullMQ repeatable job with same `jobId`. Reset `consecutive_failures = 0`. Enqueue immediate first ping. |
| **Validation Rules** | Monitor must be in `paused` state. Monitor must belong to authenticated user. |
| **Acceptance Criteria** | Pings resume at configured interval. Dashboard shows "Active" badge. |

#### FR-004 — Delete Monitor

| Field | Value |
|---|---|
| **ID** | FR-004 |
| **Description** | User permanently deletes a monitor and all associated data |
| **Priority** | P1 |
| **Input** | `monitor_id` |
| **Output** | Monitor soft-deleted; BullMQ job removed; associated records cascade soft-delete |
| **Business Logic** | Set `monitor.deleted_at = now()`. Remove BullMQ repeatable job. Soft-delete associated `incidents`, `ping_logs`, `notification_configs`. Hard delete happens via retention worker after 30 days. Any in-flight BullMQ job checks for `deleted_at` before writing result; discards if set. |
| **Validation Rules** | Monitor must belong to authenticated user. Cannot delete monitor with an open incident — must resolve first or force-delete with `?force=true`. |
| **Acceptance Criteria** | Monitor absent from dashboard. BullMQ job absent from Redis. Data recoverable within 30 days via admin endpoint (future scope). |

#### FR-005 — Update Monitor

| Field | Value |
|---|---|
| **ID** | FR-005 |
| **Description** | User updates monitor configuration |
| **Priority** | P1 |
| **Input** | `monitor_id`, partial update payload |
| **Output** | Updated monitor; BullMQ job re-registered if interval changed |
| **Business Logic** | If `check_interval_minutes` changed: remove old BullMQ repeatable job, register new one. If `url` changed: reset `consecutive_failures = 0`. Patch only provided fields (PATCH semantics). |
| **Validation Rules** | Same validation as FR-001 for each provided field. Cannot change `user_id`. |
| **Acceptance Criteria** | New check interval takes effect within one cycle. URL change triggers fresh ping history bucket. |

---

### Ping Execution

#### FR-006 — Execute HTTP Health Check

| Field | Value |
|---|---|
| **ID** | FR-006 |
| **Description** | BullMQ worker executes HTTP/HTTPS check for a monitor |
| **Priority** | P0 |
| **Input** | `monitor_id`, `url`, `timeout_seconds`, `keyword_check` |
| **Output** | `ping_log` row written to PostgreSQL |
| **Business Logic** | Issue HTTP GET with `timeout_seconds`. Follow up to 3 redirects; mark `degraded` if final URL differs from original. Record `status_code`, `response_time_ms`, `error_type` (null if successful), `is_up`. If `keyword_check` is set, assert response body contains the string. SSL expiry check on HTTPS targets. |
| **Validation Rules** | Timeout must not exceed 30s. Redirect chain must not exceed 3 hops. Response body keyword check is case-sensitive. |
| **Acceptance Criteria** | Every BullMQ job execution produces exactly one `ping_log` row. Timeout produces `error_type = 'TIMEOUT'`. DNS failure produces `error_type = 'DNS_FAILURE'`. |

#### FR-007 — Evaluate Incident Trigger

| Field | Value |
|---|---|
| **ID** | FR-007 |
| **Description** | Incident engine evaluates whether to open a new incident after a failed ping |
| **Priority** | P0 |
| **Input** | `monitor_id`, latest ping result, `consecutive_failures` counter |
| **Output** | Incident record created (if threshold reached), or `consecutive_failures` incremented |
| **Business Logic** | Increment `monitor.consecutive_failures` on each failure. If `consecutive_failures >= monitor.failure_threshold` AND no open incident exists: create incident, enqueue notification job, reset `monitor.status = 'down'`. Use PostgreSQL unique constraint on `(monitor_id, status='open')` to prevent duplicate incidents. |
| **Validation Rules** | `failure_threshold` default = 2. Never create more than one open incident per monitor. |
| **Acceptance Criteria** | Exactly one incident created after `failure_threshold` consecutive failures. Single failure followed by success does not create incident. |

#### FR-008 — Auto-Resolve Incident

| Field | Value |
|---|---|
| **ID** | FR-008 |
| **Description** | Incident engine auto-resolves open incident when monitor recovers |
| **Priority** | P0 |
| **Input** | `monitor_id`, successful ping result |
| **Output** | Open incident marked `resolved`; resolve notification enqueued |
| **Business Logic** | On successful ping: reset `monitor.consecutive_failures = 0`, set `monitor.status = 'active'`. If open incident exists: set `incident.status = 'resolved'`, `incident.resolved_at = now()`. Compute `incident.duration_seconds`. Enqueue resolution notification. |
| **Validation Rules** | Only resolve the most recent open incident for this monitor. |
| **Acceptance Criteria** | Incident shows `resolved` status with correct `resolved_at`. Dashboard shows monitor as operational. Recovery email sent. |

---

### Notifications

#### FR-009 — Email Notification

| Field | Value |
|---|---|
| **ID** | FR-009 |
| **Description** | Send email via Resend on incident open and resolve |
| **Priority** | P0 |
| **Input** | `incident_id`, event type (`opened` / `resolved`) |
| **Output** | Email delivered via Resend API; `notification_log` row written |
| **Business Logic** | Check notification cooldown via Redis key `cooldown:{monitor_id}:{notification_channel_id}`. If cooldown active and event is `opened` (not a first-time open): skip. Cooldown TTL = 30 minutes. Resolution emails always send regardless of cooldown. |
| **Validation Rules** | Must have valid email in `notification_config`. Resend API errors → retry with exponential backoff (max 5 attempts). |
| **Acceptance Criteria** | Email received within 30s of incident creation. Duplicate emails for same incident suppressed by cooldown. Resolution email always sent. |

#### FR-010 — Webhook Delivery

| Field | Value |
|---|---|
| **ID** | FR-010 |
| **Description** | POST signed webhook payload to configured URL on status change |
| **Priority** | P1 |
| **Input** | `webhook_config`, incident event |
| **Output** | HMAC-SHA256-signed POST request; delivery logged |
| **Business Logic** | Compute HMAC-SHA256 of JSON payload using `webhook_config.secret`. Include signature in `X-StatusPing-Signature` header. POST to `webhook_config.url`. On non-2xx response: retry with backoff (1s → 2s → 4s → 8s → 16s, max 5 attempts). On exhausted retries: write to dead-letter table. |
| **Validation Rules** | Webhook URL must be HTTPS. Payload max size 10KB. |
| **Acceptance Criteria** | Recipient can verify signature. Failed deliveries appear in dead-letter table. Retry attempts logged with HTTP status code. |

---

### Status Page

#### FR-011 — Public Status Page

| Field | Value |
|---|---|
| **ID** | FR-011 |
| **Description** | Server-rendered public status page accessible without authentication |
| **Priority** | P0 |
| **Input** | None (no auth required) |
| **Output** | HTML page with current status and 90-day uptime history |
| **Business Logic** | Read all non-deleted monitors for the account. For each monitor: compute current status, last check time, uptime % for past 90 days. Render 90 colored squares (one per day). Show active incident banner if any monitor is `down`. Cache query result for 60 seconds in Redis. |
| **Validation Rules** | Only show monitors where `status_page_visible = true`. |
| **Acceptance Criteria** | Page loads under 1s. Lighthouse score ≥ 95. No cookie or session required. Active incident banner updates within 2 check intervals. |

---

### Reporting

#### FR-012 — SLA PDF Export

| Field | Value |
|---|---|
| **ID** | FR-012 |
| **Description** | Generate and download monthly SLA PDF for a monitor |
| **Priority** | P2 |
| **Input** | `monitor_id`, `year`, `month` |
| **Output** | PDF file download |
| **Business Logic** | Aggregate: total checks, successful checks, uptime %, longest incident duration, MTTD, MTTR. Generate HTML template. Convert to PDF via Puppeteer. Stream to client. |
| **Validation Rules** | Requested month must be in the past. Monitor must belong to authenticated user. |
| **Acceptance Criteria** | PDF filename includes monitor name and month. All six metrics present. |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target | Rationale |
|---|---|---|
| Dashboard API P95 response time | ≤ 200ms | Users expect interactive dashboard to feel snappy |
| Ping execution latency (worker overhead) | ≤ 50ms | The HTTP check itself dominates; worker overhead must be negligible |
| Status page First Contentful Paint | ≤ 800ms | SEO and user trust; SSR makes this achievable |
| Notification delivery (incident → email) | ≤ 30s | Beyond 30s, the on-call engineer may not wake in time |
| BullMQ job scheduling precision | ± 5 seconds | Cron jobs drift; ± 5s is acceptable for minute-level intervals |

---

### 5.2 Scalability

**Horizontal worker scaling:** The ping worker is stateless (it reads monitors from PostgreSQL, pings, writes results). Multiple worker instances can run concurrently — BullMQ handles job deduplication via Redis. To scale from 100 to 10,000 monitors, increase worker concurrency or deploy additional worker instances without code changes.

**Database growth projection:**
```
1 monitor × 1 ping/min × 60 min × 24 hr × 365 days = 525,600 rows/year
100 monitors = 52,560,000 rows/year
```

This is manageable with the retention strategy (keep raw logs 30 days; aggregate to daily summaries indefinitely). Without retention, PostgreSQL performance degrades within 12–18 months for even modest deployments.

**Queue depth:** BullMQ backed by Redis. Under normal load, queue depth should be near zero (jobs complete faster than they are enqueued). Queue depth > 100 indicates worker is falling behind; trigger alert and scale worker concurrency.

---

### 5.3 Reliability

**At-least-once ping delivery:** BullMQ guarantees job delivery with retry. A ping job may execute twice if the worker crashes mid-execution and the job is re-enqueued. Idempotency is handled by allowing duplicate `ping_logs` — the incident engine reads the most recent N logs, so a duplicate does not affect incident logic.

**Incident deduplication:** PostgreSQL unique constraint on `(monitor_id)` where `status = 'open'` ensures exactly one open incident per monitor regardless of worker concurrency.

**Worker crash recovery:** BullMQ's Redis-backed job state means in-progress jobs are re-enqueued on worker restart. No pings are lost permanently.

---

### 5.4 Availability

**Target:** The monitoring service itself targeting ≥ 99% uptime on Railway free tier (realistic expectation). Production deployments would use Railway Pro with redundant workers.

**Status page availability:** Higher than the dashboard. The status page reads from PostgreSQL (and Redis cache). It can be served from Next.js Edge Runtime for global distribution.

**Graceful degradation:** If Redis is unavailable, the ping worker falls back to in-memory scheduling (degraded mode — no job persistence, single-worker only). Logged and alerted.

---

### 5.5 Maintainability

- All environment variables documented in `.env.example`
- Prisma migrations committed to version control — full schema history auditable
- BullMQ queue names defined in a single constants file — changing a queue name is a one-line change
- Worker and API server share the same monorepo; Prisma client is shared
- OpenAPI spec auto-generated from Zod schemas via `zod-to-openapi`

---

### 5.6 Security

| Concern | Mitigation |
|---|---|
| SSRF (Server-Side Request Forgery) | Validate monitor URLs against a blocklist: `localhost`, `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, link-local ranges |
| Webhook secret exposure | Store webhook secrets hashed (SHA-256); compare HMAC at delivery time using stored hash |
| Auth token leakage | Auth.js v5 uses encrypted JWT; session tokens never logged |
| SQL injection | Prisma parameterizes all queries; no raw string concatenation |
| Rate limiting | API routes limited to 100 req/min per user via Redis sliding window |
| Monitor ownership | Every API handler verifies `monitor.user_id === session.user.id` before any operation |

---

### 5.7 Latency Budget

For a full ping cycle (enqueue → execute → write → incident → notify):

| Stage | Budget |
|---|---|
| BullMQ job scheduling delay | ≤ 5s |
| HTTP health check (external) | ≤ 30s (timeout) |
| Write `ping_log` to PostgreSQL | ≤ 20ms |
| Incident evaluation | ≤ 10ms |
| Notification enqueue | ≤ 5ms |
| Email delivery via Resend | ≤ 15s |
| **Total end-to-end (incident open → email)** | **≤ 60s** |

---

### 5.8 Recovery Objectives

| Objective | Target |
|---|---|
| Recovery Point Objective (RPO) | ≤ 5 minutes (Railway PostgreSQL backup frequency) |
| Recovery Time Objective (RTO) | ≤ 15 minutes (Railway service redeploy time) |
| Data loss on worker crash | Zero (BullMQ re-enqueues incomplete jobs from Redis) |

---

### 5.9 Logging

Every log entry must include: `timestamp` (UTC ISO 8601), `level` (DEBUG/INFO/WARN/ERROR), `service` (`dashboard` / `worker`), `trace_id` (UUID per job execution), `monitor_id` (where applicable), `message`.

No PII in logs. No plaintext secrets in logs. Ping results logged at INFO level. Worker errors logged at ERROR with full stack trace.

---

### 5.10 Rate Limits

| Resource | Limit | Reset |
|---|---|---|
| API endpoints (authenticated) | 100 req/min/user | Rolling 60s window |
| Monitor creation | 50 monitors/user | Hard limit, not rate limit |
| Webhook delivery attempts | 5 attempts/incident | Per-delivery, exponential backoff |
| Resend email | 3,000 emails/month | Resend free tier |

---

### 5.11 Database Growth and Storage

| Table | Row estimate (1 year, 10 monitors, 1 ping/min) | Size estimate |
|---|---|---|
| `ping_logs` (raw, 30-day retention) | 432,000 | ~86 MB |
| `daily_stats` (aggregated) | 3,650 | < 1 MB |
| `incidents` | ~50/year | < 1 MB |
| `notification_logs` | ~100/year | < 1 MB |

The retention worker is the primary defense against unbounded `ping_logs` growth.

---

### 5.12 Concurrency

**Worker concurrency:** BullMQ `concurrency` option controls how many jobs execute simultaneously per worker process. Default: 10. At concurrency 10 and an average ping time of 500ms, one worker processes ~20 monitors/second = 1,200 monitors/minute. This comfortably covers 100–500 monitors on a single Railway worker instance.

**Database connection pooling:** Prisma uses a connection pool. Worker process should not open more connections than `pool_size` (default 10 in Prisma). Worker concurrency and DB pool size should be tuned together.

---

### 5.13 Disaster Recovery

**Scenario: Redis total data loss**
- Impact: All BullMQ job state lost. All scheduled repeatable jobs disappear.
- Recovery: On worker startup, read all `active` monitors from PostgreSQL. Re-register repeatable BullMQ jobs. This is the worker's `startup` phase — always executes on boot.

**Scenario: PostgreSQL data loss**
- Impact: All monitor config, ping logs, incidents lost.
- Recovery: Restore from Railway backup. Re-seed monitors from user input. Historical ping logs are lost (RPO = last backup).

**Scenario: Worker process crash**
- Impact: In-flight jobs in BullMQ `active` state are re-enqueued after a lock expiry timeout (BullMQ `lockDuration`, default 30s).
- Recovery: Automatic. No operator intervention needed.

---

---

## 6. User Flow

### 6.1 New User Registration

```mermaid
flowchart TD
    A([User visits app]) --> B[Click 'Sign in with GitHub']
    B --> C[GitHub OAuth redirect]
    C --> D{First time user?}
    D -- Yes --> E[Create user record in PostgreSQL]
    D -- No --> F[Load existing session]
    E --> G[Redirect to dashboard]
    F --> G
    G --> H[Dashboard: 'No monitors yet — Add one']
```

---

### 6.2 Create Monitor Flow

```mermaid
flowchart TD
    A([Authenticated user]) --> B[Click 'Add Monitor']
    B --> C[Fill form: name, URL, interval, threshold]
    C --> D[POST /api/monitors]
    D --> E{Validate input}
    E -- Invalid --> F[Return 422 with field errors]
    E -- Valid --> G[Create monitor in PostgreSQL]
    G --> H[Register BullMQ repeatable job]
    H --> I[Enqueue immediate first ping]
    I --> J[Return 201 with monitor object]
    J --> K[Dashboard updates: new monitor in list]
    K --> L[First ping executes within 60s]
    L --> M[Monitor shows first status: Up/Down]
```

---

### 6.3 Incident Flow — User Perspective

```mermaid
flowchart TD
    A([Monitor starts failing]) --> B[Consecutive failures increment]
    B --> C{Threshold reached?}
    C -- No --> B
    C -- Yes --> D[Incident created automatically]
    D --> E[User receives email: 'Monitor X is down']
    E --> F[User checks dashboard]
    F --> G[Dashboard shows red badge + incident banner]
    G --> H[User investigates and fixes service]
    H --> I[Next ping succeeds]
    I --> J[Incident auto-resolved]
    J --> K[User receives email: 'Monitor X recovered']
    K --> L[Dashboard returns to green]
```

---

### 6.4 Public Status Page Visitor Flow

```mermaid
flowchart TD
    A([Anonymous visitor]) --> B[Load /status page]
    B --> C[Server-side render: read PostgreSQL + Redis cache]
    C --> D{Any active incidents?}
    D -- Yes --> E[Show red incident banner at top]
    D -- No --> F[Show green 'All systems operational' banner]
    E --> G[Show monitor list with status]
    F --> G
    G --> H[Each monitor shows 90-day uptime bar]
    H --> I[Each monitor shows current status badge]
    I --> J[No login required — visitor done]
```

---

### 6.5 Pause / Resume Monitor

```mermaid
flowchart TD
    A([User on dashboard]) --> B[Click 'Pause' on monitor]
    B --> C[PATCH /api/monitors/:id — body: status=paused]
    C --> D[Remove BullMQ repeatable job]
    D --> E[Set monitor.status = paused in PostgreSQL]
    E --> F[Dashboard: monitor shows 'Paused' badge]
    F --> G{User wants to resume?}
    G -- Yes --> H[Click 'Resume']
    H --> I[PATCH /api/monitors/:id — body: status=active]
    I --> J[Re-register BullMQ repeatable job]
    J --> K[Enqueue immediate ping]
    K --> L[Dashboard: monitor shows live status]
    G -- No --> M([Done])
```

---

## 7. Application Flow

### 7.1 Complete Ping Cycle — Backend Flow

```mermaid
sequenceDiagram
    participant CRON as BullMQ Scheduler
    participant WORKER as Ping Worker
    participant HTTP as Target Endpoint
    participant DB as PostgreSQL
    participant INC as Incident Engine
    participant NQUEUE as Notification Queue
    participant NOTIFY as Notification Worker
    participant EMAIL as Resend API

    CRON->>WORKER: Dequeue ping job {monitor_id}
    WORKER->>DB: Fetch monitor config
    DB-->>WORKER: {url, timeout, threshold, consecutive_failures}
    WORKER->>HTTP: GET {url} with timeout
    alt HTTP success (2xx)
        HTTP-->>WORKER: 200 OK, response_time_ms
        WORKER->>DB: INSERT ping_log {status='up', response_time_ms}
        WORKER->>INC: Evaluate recovery
        INC->>DB: Check for open incident
        DB-->>INC: Open incident exists
        INC->>DB: UPDATE incident SET status='resolved', resolved_at=now()
        INC->>DB: UPDATE monitor SET consecutive_failures=0, status='active'
        INC->>NQUEUE: Enqueue notification {type='resolved'}
    else HTTP failure or timeout
        HTTP-->>WORKER: 503 or timeout
        WORKER->>DB: INSERT ping_log {status='down', error_type}
        WORKER->>INC: Evaluate incident trigger
        INC->>DB: UPDATE monitor SET consecutive_failures += 1
        INC->>DB: Check threshold
        DB-->>INC: consecutive_failures >= threshold AND no open incident
        INC->>DB: INSERT incident {status='open', started_at=now()}
        INC->>DB: UPDATE monitor SET status='down'
        INC->>NQUEUE: Enqueue notification {type='opened'}
    end
    NQUEUE->>NOTIFY: Dequeue notification job
    NOTIFY->>EMAIL: POST /send {to, subject, html}
    EMAIL-->>NOTIFY: 200 OK {id}
    NOTIFY->>DB: INSERT notification_log {sent_at, status='delivered'}
```

---

### 7.2 Monitor Creation Flow

```mermaid
sequenceDiagram
    participant CLIENT as Browser
    participant API as Next.js API Route
    participant DB as PostgreSQL
    participant QUEUE as BullMQ / Redis

    CLIENT->>API: POST /api/monitors {name, url, interval...}
    API->>API: Validate with Zod
    API->>API: Check auth session
    API->>API: SSRF blocklist check on URL
    API->>DB: INSERT monitor {user_id, url, status='pending'}
    DB-->>API: monitor {id}
    API->>QUEUE: Register repeatable job {key: monitor:{id}, every: interval_ms}
    QUEUE-->>API: Job registered
    API->>QUEUE: Enqueue immediate first ping {monitor_id}
    QUEUE-->>API: First job queued
    API-->>CLIENT: 201 {monitor object}
```

---

### 7.3 Data Retention Flow

```mermaid
flowchart LR
    A[Daily Retention Worker] --> B[Find ping_logs older than 30 days]
    B --> C[Aggregate to daily_stats: uptime%, p50, p95, p99]
    C --> D[INSERT daily_stats rows]
    D --> E[DELETE raw ping_logs older than 30 days]
    E --> F[Log rows deleted + storage freed]
```

---

## 8. System Architecture

### 8.1 Architecture Overview

```mermaid
C4Context
    title StatusPing — System Context

    Person(user, "User", "Engineer or developer who creates monitors")
    Person(visitor, "Anonymous Visitor", "Views public status page")

    System(dashboard, "StatusPing Dashboard", "Next.js 15 App — monitor management, incident view, metrics")
    System(worker, "Ping Worker", "Node.js + BullMQ — executes health checks on schedule")
    SystemDb(postgres, "PostgreSQL", "Primary data store — monitors, ping_logs, incidents")
    SystemDb(redis, "Redis", "Job store for BullMQ, cooldown keys, status cache")
    System_Ext(resend, "Resend", "Transactional email delivery")
    System_Ext(webhooks, "Webhook Endpoints", "User-configured external URLs")
    System_Ext(targets, "Monitored Endpoints", "External websites and APIs being checked")

    Rel(user, dashboard, "Manages monitors, views incidents")
    Rel(visitor, dashboard, "Views /status page (no auth)")
    Rel(dashboard, postgres, "CRUD operations")
    Rel(dashboard, redis, "Status cache reads")
    Rel(worker, postgres, "Reads monitor config, writes ping_logs, incidents")
    Rel(worker, redis, "BullMQ job queue")
    Rel(worker, targets, "HTTP GET health checks")
    Rel(worker, resend, "Sends email notifications")
    Rel(worker, webhooks, "POST signed webhook payloads")
```

---

### 8.2 Component Responsibilities

#### Dashboard (Railway Service 1)

**Technology:** Next.js 15 App Router, TypeScript, Prisma, Auth.js v5

**Responsibilities:**
- Serve the authenticated dashboard (SSR + client components)
- Handle all REST API routes (`/api/*`)
- Render the public `/status` page (SSR, no auth)
- Read from PostgreSQL via Prisma
- Read status cache from Redis (status page only)

**Explicitly NOT responsible for:**
- Executing ping jobs
- Scheduling health checks
- Processing BullMQ queues

**Why separate from the worker?** Next.js deployed on Railway runs as a web server — it handles HTTP requests from users. If ping execution lived here, a slow batch of HTTP checks would block dashboard API responses. More critically: Vercel (the typical Next.js host) uses serverless functions that time out at 10 seconds and have no persistent process. BullMQ requires a long-running Node.js process.

---

#### Ping Worker (Railway Service 2)

**Technology:** Node.js, TypeScript, BullMQ, Prisma (shared client)

**Responsibilities:**
- On startup: read all active monitors from PostgreSQL; register BullMQ repeatable jobs
- Process ping queue: execute HTTP health checks
- Process incident queue: evaluate failures, create/resolve incidents
- Process notification queue: deliver email and webhook notifications
- Process retention queue: aggregate and delete old ping logs

**Why a separate process?**
1. Long-running process requirement (BullMQ workers cannot run in serverless)
2. Failure isolation: a worker crash does not take down the dashboard
3. Independent scaling: add worker instances without touching the Next.js app
4. Resource isolation: heavy CPU/network work from HTTP pinging doesn't compete with dashboard API latency

---

#### PostgreSQL

**Why PostgreSQL over MongoDB or DynamoDB?**

StatusPing's data has strong relational characteristics:
- Users own monitors (foreign key)
- Monitors have incidents (foreign key, with uniqueness constraint)
- Incidents have notification logs (foreign key)
- Ping logs are time-series but require JOINs to monitors

PostgreSQL's JSONB support handles flexible notification config payloads. Time-series queries (response time percentiles, 90-day uptime bars) are efficient with composite indexes on `(monitor_id, checked_at)`. The unique partial index for open incidents (`WHERE status = 'open'`) is a PostgreSQL-specific feature that prevents duplicate incidents at the database level.

---

#### Redis

Redis serves three distinct purposes in StatusPing:

1. **BullMQ job store** — All queue state (pending, active, completed, failed jobs) lives in Redis. This is BullMQ's mandatory dependency.

2. **Notification cooldown keys** — `cooldown:{monitor_id}:{notification_channel_id}` with TTL = 30 minutes. Prevents duplicate alert storms when a monitor flaps.

3. **Status page cache** — `status:page:data` with TTL = 60 seconds. The status page query joins monitors, incidents, and daily_stats — expensive to run on every visitor request. A 60-second Redis cache reduces database load dramatically.

**Why not use PostgreSQL for all three?** Job queuing in a relational database (polling a `jobs` table) introduces write amplification, lock contention, and polling overhead. Redis's atomic operations (`SETNX`, `EXPIRE`, pub/sub) are purpose-built for this. The cooldown TTL mechanism would require a scheduled cleanup job in PostgreSQL; in Redis it's automatic.

---

#### BullMQ

BullMQ is a production-grade job queue for Node.js backed by Redis. It provides:
- **Repeatable jobs** with cron or fixed-interval scheduling
- **Concurrency control** at the worker level
- **Automatic retry** with configurable backoff strategies
- **Dead letter queues** (failed jobs after max retries)
- **Job prioritization**
- **Rate limiting** per queue

**Why BullMQ over `node-cron`?**

`node-cron` runs in the same Node.js process, doesn't survive restarts (jobs lost on crash), cannot be distributed across multiple workers, and has no retry or dead-letter capabilities. BullMQ's jobs are persisted in Redis — a worker crash does not lose scheduled jobs.

**Why BullMQ over `bull` (v3)?** BullMQ is the actively maintained successor to `bull`. It uses Redis Streams for improved performance and has TypeScript types natively.

---

### 8.3 Service Boundary Diagram

```mermaid
graph TB
    subgraph "Railway Service 1: Dashboard"
        NEXT[Next.js 15 App Router]
        NEXT --> API[API Route Handlers]
        NEXT --> STATUS[/status - SSR]
        NEXT --> AUTH[Auth.js v5]
    end

    subgraph "Railway Service 2: Worker"
        WORKER[Node.js Process]
        WORKER --> PQ[Ping Queue Consumer]
        WORKER --> IQ[Incident Queue Consumer]
        WORKER --> NQ[Notification Queue Consumer]
        WORKER --> RQ[Retention Queue Consumer]
        WORKER --> STARTUP[Startup: Re-register Jobs]
    end

    subgraph "Railway Add-ons"
        PG[(PostgreSQL)]
        REDIS[(Redis)]
    end

    subgraph "External"
        RESEND[Resend API]
        HOOKS[Webhook Endpoints]
        TARGETS[Monitored URLs]
    end

    API <-->|Prisma| PG
    STATUS <-->|Prisma + Cache| PG
    STATUS <-->|60s TTL cache| REDIS
    PQ <-->|BullMQ| REDIS
    PQ <-->|Prisma| PG
    PQ -->|HTTP GET| TARGETS
    NQ -->|SMTP API| RESEND
    NQ -->|HMAC POST| HOOKS
```

---

## 9. Database Design

### 9.1 Schema Design Principles

**Normalization level:** Third Normal Form (3NF) with deliberate denormalization where query performance justifies it. `monitor.consecutive_failures` is a denormalized counter — the ground truth is `ping_logs`, but recomputing it from raw logs on every ping evaluation would be expensive.

**Soft deletes:** All user-owned entities (`monitors`, `incidents`, `notification_configs`) use `deleted_at TIMESTAMP NULL`. Queries always filter `WHERE deleted_at IS NULL`. Hard deletes execute via the retention worker 30 days post-soft-delete.

**Audit fields:** Every table has `created_at` and `updated_at`. Workers set `updated_at` on every write. Prisma middleware auto-populates `updated_at`.

**UTC timestamps:** All timestamps stored as `TIMESTAMP WITH TIME ZONE` in UTC. Never store local time.

---

### 9.2 Table Definitions

#### `users`

```sql
CREATE TABLE users (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT,
    github_id     TEXT UNIQUE,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Why TEXT for primary key?** Auth.js v5 generates string UUIDs; matching its convention avoids type casting.

---

#### `monitors`

```sql
CREATE TABLE monitors (
    id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                     TEXT NOT NULL,
    url                      TEXT NOT NULL,
    check_interval_minutes   INTEGER NOT NULL DEFAULT 5
                               CHECK (check_interval_minutes IN (1, 5, 15, 30, 60)),
    failure_threshold        INTEGER NOT NULL DEFAULT 2
                               CHECK (failure_threshold BETWEEN 1 AND 5),
    timeout_seconds          INTEGER NOT NULL DEFAULT 10
                               CHECK (timeout_seconds BETWEEN 5 AND 30),
    status                   TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','active','degraded','down','paused')),
    consecutive_failures     INTEGER NOT NULL DEFAULT 0,
    keyword_check            TEXT,
    status_page_visible      BOOLEAN NOT NULL DEFAULT TRUE,
    last_checked_at          TIMESTAMPTZ,
    deleted_at               TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monitors_user_id ON monitors(user_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_monitors_status ON monitors(status)
    WHERE deleted_at IS NULL AND status IN ('active','degraded','down');
```

**`consecutive_failures`:** Denormalized counter. Faster than COUNT(*) on ping_logs per ping cycle. Reset to 0 on recovery. Updated atomically with the ping_log INSERT in a transaction.

**CHECK constraints on `status`:** Prevents invalid states at the database level — not just application level.

---

#### `ping_logs`

```sql
CREATE TABLE ping_logs (
    id              BIGSERIAL PRIMARY KEY,
    monitor_id      TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_up           BOOLEAN NOT NULL,
    status_code     INTEGER,
    response_time_ms INTEGER,
    error_type      TEXT CHECK (error_type IN (
                        'TIMEOUT','DNS_FAILURE','CONNECTION_REFUSED',
                        'SSL_ERROR','REDIRECT_LIMIT','HTTP_ERROR',NULL
                    )),
    redirect_count  SMALLINT DEFAULT 0,
    final_url       TEXT
) PARTITION BY RANGE (checked_at);

-- Monthly partitions (create for current + next 2 months at a time)
CREATE TABLE ping_logs_2025_01 PARTITION OF ping_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE INDEX idx_ping_logs_monitor_checked ON ping_logs(monitor_id, checked_at DESC);
CREATE INDEX idx_ping_logs_is_up ON ping_logs(monitor_id, is_up, checked_at DESC)
    WHERE is_up = FALSE;
```

**Why `BIGSERIAL` not UUID?** Ping logs are insert-heavy time-series data. Sequential integer IDs are more efficient for B-tree indexes than UUIDs (which fragment the index due to randomness). Ping logs are never referenced by ID externally — only queried by `monitor_id` + time range.

**Partitioning by month:** With 100 monitors at 1 ping/min, a single partition holds ~4.3M rows/month. Partition pruning makes time-bounded queries (last 30 days) dramatically faster — PostgreSQL only scans the relevant partition(s). Old partitions are dropped wholesale by the retention worker — infinitely faster than DELETE.

**The `final_url` column:** Captures redirect destination. If a monitor's URL starts redirecting to an unexpected domain (e.g., a domain expiry hijack), this appears in the log.

---

#### `daily_stats`

```sql
CREATE TABLE daily_stats (
    id              BIGSERIAL PRIMARY KEY,
    monitor_id      TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    stat_date       DATE NOT NULL,
    total_checks    INTEGER NOT NULL DEFAULT 0,
    successful_checks INTEGER NOT NULL DEFAULT 0,
    uptime_percent  NUMERIC(5,2),
    p50_ms          INTEGER,
    p95_ms          INTEGER,
    p99_ms          INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_daily_stats_monitor_date
    ON daily_stats(monitor_id, stat_date);
```

**Why separate from `ping_logs`?** After 30 days, raw ping logs are too expensive to scan for the status page's 90-day uptime bars. `daily_stats` stores pre-aggregated summaries. The status page reads from this table — a fast index scan on `(monitor_id, stat_date)` over a 90-row result.

---

#### `incidents`

```sql
CREATE TABLE incidents (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    monitor_id       TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    status           TEXT NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','resolved')),
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at      TIMESTAMPTZ,
    duration_seconds INTEGER GENERATED ALWAYS AS (
                         EXTRACT(EPOCH FROM (resolved_at - started_at))::INTEGER
                     ) STORED,
    root_cause       TEXT,
    error_type       TEXT,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- THE critical constraint: at most one open incident per monitor
CREATE UNIQUE INDEX idx_incidents_monitor_open
    ON incidents(monitor_id)
    WHERE status = 'open' AND deleted_at IS NULL;

CREATE INDEX idx_incidents_monitor_id ON incidents(monitor_id, started_at DESC)
    WHERE deleted_at IS NULL;
```

**Partial unique index:** `WHERE status = 'open'` — PostgreSQL only enforces uniqueness for rows matching this predicate. Resolved incidents are not affected. This is a database-level race condition guard: two concurrent workers attempting to create an incident for the same monitor will produce a unique constraint violation; one will succeed, one will be rolled back cleanly.

**`duration_seconds` as generated column:** Computed automatically on insert/update; no application logic required. Available for SLA report queries directly.

---

#### `notification_configs`

```sql
CREATE TABLE notification_configs (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    monitor_id  TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('email','webhook')),
    -- Email specific
    email       TEXT,
    -- Webhook specific
    url         TEXT,
    secret_hash TEXT,  -- SHA-256 of HMAC secret (never store plaintext)
    -- Common
    on_incident_open    BOOLEAN NOT NULL DEFAULT TRUE,
    on_incident_resolve BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_configs_monitor
    ON notification_configs(monitor_id)
    WHERE deleted_at IS NULL;
```

---

#### `notification_logs`

```sql
CREATE TABLE notification_logs (
    id                      BIGSERIAL PRIMARY KEY,
    notification_config_id  TEXT NOT NULL REFERENCES notification_configs(id),
    incident_id             TEXT NOT NULL REFERENCES incidents(id),
    event_type              TEXT NOT NULL CHECK (event_type IN ('opened','resolved')),
    status                  TEXT NOT NULL CHECK (status IN ('pending','delivered','failed','suppressed')),
    attempts                SMALLINT NOT NULL DEFAULT 0,
    last_attempt_at         TIMESTAMPTZ,
    delivered_at            TIMESTAMPTZ,
    error_message           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_incident
    ON notification_logs(incident_id);
```

---

#### `ssl_checks`

```sql
CREATE TABLE ssl_checks (
    id              BIGSERIAL PRIMARY KEY,
    monitor_id      TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    days_remaining  INTEGER,
    issuer          TEXT,
    is_valid        BOOLEAN NOT NULL,
    error_message   TEXT
);

CREATE INDEX idx_ssl_checks_monitor ON ssl_checks(monitor_id, checked_at DESC);
```

---

#### `dead_letter_jobs`

```sql
CREATE TABLE dead_letter_jobs (
    id              BIGSERIAL PRIMARY KEY,
    queue_name      TEXT NOT NULL,
    job_id          TEXT,
    job_data        JSONB NOT NULL,
    error_message   TEXT,
    attempts        SMALLINT NOT NULL,
    failed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    replayed_at     TIMESTAMPTZ
);
```

Dead-lettered jobs are inspectable via an admin API endpoint. The `replayed_at` column tracks whether an operator manually re-queued the job.

---

### 9.3 Entity Relationship Diagram

```mermaid
erDiagram
    users {
        text id PK
        text email UK
        text name
        text github_id UK
        timestamptz created_at
        timestamptz updated_at
    }

    monitors {
        text id PK
        text user_id FK
        text name
        text url
        int check_interval_minutes
        int failure_threshold
        int timeout_seconds
        text status
        int consecutive_failures
        text keyword_check
        bool status_page_visible
        timestamptz last_checked_at
        timestamptz deleted_at
    }

    ping_logs {
        bigint id PK
        text monitor_id FK
        timestamptz checked_at
        bool is_up
        int status_code
        int response_time_ms
        text error_type
    }

    daily_stats {
        bigint id PK
        text monitor_id FK
        date stat_date
        int total_checks
        int successful_checks
        numeric uptime_percent
        int p50_ms
        int p95_ms
        int p99_ms
    }

    incidents {
        text id PK
        text monitor_id FK
        text status
        timestamptz started_at
        timestamptz resolved_at
        int duration_seconds
        text root_cause
    }

    notification_configs {
        text id PK
        text monitor_id FK
        text user_id FK
        text type
        text email
        text url
        text secret_hash
    }

    notification_logs {
        bigint id PK
        text notification_config_id FK
        text incident_id FK
        text event_type
        text status
        int attempts
    }

    ssl_checks {
        bigint id PK
        text monitor_id FK
        timestamptz checked_at
        timestamptz expires_at
        int days_remaining
        bool is_valid
    }

    users ||--o{ monitors : "owns"
    monitors ||--o{ ping_logs : "generates"
    monitors ||--o{ daily_stats : "aggregated to"
    monitors ||--o{ incidents : "has"
    monitors ||--o{ notification_configs : "configured with"
    monitors ||--o{ ssl_checks : "checked by"
    notification_configs ||--o{ notification_logs : "produces"
    incidents ||--o{ notification_logs : "triggers"
```

---

### 9.4 Indexing Strategy

**Core principle:** Index for read patterns, not write patterns. Writes in StatusPing are append-only (ping_logs, notification_logs) or point updates (monitor status). Reads are the bottleneck for dashboard and status page queries.

| Query Pattern | Index |
|---|---|
| Dashboard: all monitors for user | `(user_id) WHERE deleted_at IS NULL` |
| Ping worker: fetch active monitors | `(status) WHERE deleted_at IS NULL AND status IN (...)` |
| Response time chart: last N logs for monitor | `(monitor_id, checked_at DESC)` on ping_logs |
| Status page: 90-day uptime per monitor | `(monitor_id, stat_date)` on daily_stats (unique) |
| Incident list for monitor | `(monitor_id, started_at DESC) WHERE deleted_at IS NULL` |
| Open incident check | `(monitor_id) WHERE status='open'` on incidents (partial unique) |

---

### 9.5 Data Retention Strategy

```mermaid
gantt
    title Data Lifecycle
    dateFormat  X
    axisFormat Day %d

    section ping_logs (raw)
    Retained raw           :0, 30
    Aggregated + deleted   :30, 31

    section daily_stats
    Retained indefinitely  :0, 90

    section incidents
    Soft deleted           :0, 30
    Hard deleted           :30, 31

    section notification_logs
    Retained indefinitely  :0, 90
```

The retention worker runs once daily (BullMQ cron job: `0 2 * * *` — 2am UTC to avoid peak hours):
1. Aggregate `ping_logs` older than 30 days into `daily_stats` (if not already aggregated)
2. `DROP` old ping_logs partitions (monthly partition dropping is O(1))
3. Hard-delete soft-deleted monitors/incidents older than 30 days

---

## 10. Business Rules

### BR-001 — Monitor Ownership Enforcement

| Field | Value |
|---|---|
| **ID** | BR-001 |
| **Rule** | Every API operation on a monitor must verify `monitor.user_id === authenticated_user.id` |
| **Reason** | Prevents horizontal privilege escalation — User A reading/modifying User B's monitors |
| **Implementation** | All Prisma queries include `WHERE user_id = session.user.id` — never fetch by `id` alone |
| **Edge Cases** | Admin tooling (future) bypasses this rule. Worker process bypasses this rule (runs as system, not user). |

---

### BR-002 — Consecutive Failure Threshold

| Field | Value |
|---|---|
| **ID** | BR-002 |
| **Rule** | An incident is created only after `consecutive_failures >= failure_threshold` |
| **Reason** | Eliminates false positives from transient network blips. A single timeout should not page an engineer at 3am. |
| **Implementation** | Worker increments `monitor.consecutive_failures` atomically. Check threshold after increment. |
| **Edge Cases** | If 1 failure occurs then 1 success then 1 failure: `consecutive_failures` resets to 0 on success, then increments to 1 on next failure. No incident created. |

---

### BR-003 — Single Open Incident Per Monitor

| Field | Value |
|---|---|
| **ID** | BR-003 |
| **Rule** | At most one incident with `status = 'open'` may exist per monitor at any time |
| **Reason** | Prevents duplicate alerts and notification storms during extended outages |
| **Implementation** | PostgreSQL partial unique index on `(monitor_id) WHERE status = 'open'`. Concurrent workers attempting duplicate inserts receive a unique constraint violation; the incident engine catches this and treats it as "incident already exists — skip." |
| **Edge Cases** | Worker A and Worker B both detect failure simultaneously. Both attempt INSERT. One succeeds; one receives `23505` PostgreSQL error code. Worker B logs "incident already open" and continues. |

---

### BR-004 — Notification Cooldown

| Field | Value |
|---|---|
| **ID** | BR-004 |
| **Rule** | After an incident-open notification is sent, no further incident-open notifications are sent for the same monitor within the cooldown window (30 minutes default) |
| **Reason** | Prevents alert fatigue during extended outages where each ping failure would otherwise trigger a new email |
| **Implementation** | Redis key `cooldown:{monitor_id}:{notification_config_id}` set on first notification send, with TTL = 1800 seconds. Notification worker checks for key existence before sending. |
| **Edge Cases** | Resolution notifications (`event_type = 'resolved'`) always send regardless of cooldown — an operator must know when a service recovers. Cooldown key deleted on resolution. |

---

### BR-005 — SSRF Prevention

| Field | Value |
|---|---|
| **ID** | BR-005 |
| **Rule** | Monitor URLs must not target internal/private network addresses |
| **Reason** | A malicious user could create a monitor targeting `http://169.254.169.254/latest/meta-data/` (AWS metadata service) or internal Railway services, allowing data exfiltration via ping response times or content |
| **Implementation** | On monitor creation: resolve the URL's hostname to an IP address. Reject if the IP falls within: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1/128`, `fc00::/7` |
| **Edge Cases** | DNS rebinding attack: the hostname resolves to a public IP at creation time, but DNS is changed to a private IP later. Mitigation: re-validate the resolved IP at ping execution time in the worker, not just at monitor creation. |

---

### BR-006 — Data Retention Schedule

| Field | Value |
|---|---|
| **ID** | BR-006 |
| **Rule** | Raw `ping_logs` older than 30 days must be aggregated into `daily_stats` and then deleted |
| **Reason** | Unbounded ping log growth causes PostgreSQL performance degradation. At 100 monitors × 1 ping/min, raw logs grow by ~52M rows/year. |
| **Implementation** | Retention worker runs at 2am UTC daily. Uses PostgreSQL partition dropping for bulk deletion (O(1) vs O(N) DELETE). |
| **Edge Cases** | If the retention worker fails, logs accumulate. The worker must be idempotent: aggregating and deleting logs for a day that was already processed should be a no-op (UPSERT on `daily_stats` with `ON CONFLICT DO NOTHING`). |

---

### BR-007 — Monitor Deletion Safeguard

| Field | Value |
|---|---|
| **ID** | BR-007 |
| **Rule** | Deleting a monitor with an open incident requires explicit `?force=true` confirmation |
| **Reason** | Prevents accidental data loss during active incidents. An engineer pausing an investigation might accidentally delete evidence. |
| **Implementation** | Soft delete sets `deleted_at`. BullMQ worker checks `deleted_at` before writing ping results; discards job silently if set. Hard delete after 30 days. |
| **Edge Cases** | In-flight BullMQ job when monitor is deleted: job dequeued after deletion. Worker checks `deleted_at` on monitor fetch. If set, logs "monitor deleted — discarding result" and returns without writing. |

---

### BR-008 — SSL Expiry Alert Threshold

| Field | Value |
|---|---|
| **ID** | BR-008 |
| **Rule** | An SSL certificate with ≤ 30 days until expiry triggers a notification |
| **Reason** | SSL certificate expiry is a common, preventable outage cause. 30 days provides sufficient lead time for renewal. |
| **Implementation** | SSL check runs alongside each ping (for HTTPS monitors). `days_remaining` computed and stored in `ssl_checks`. If `days_remaining <= 30` and no SSL alert sent in the last 7 days: enqueue notification. |
| **Edge Cases** | Certificate renewed mid-period: `days_remaining` increases; alert suppressed automatically. |

---

### BR-009 — Redirect Handling

| Field | Value |
|---|---|
| **ID** | BR-009 |
| **Rule** | HTTP redirects are followed up to 3 hops. Monitor is marked `degraded` if the final URL differs from the configured URL. |
| **Reason** | Redirects are often intentional (HTTP→HTTPS). But unexpected redirects (domain hijack, CDN misconfiguration) should be surfaced, not silently followed. |
| **Implementation** | Worker uses `fetch` with `redirect: 'follow'` and manually counts hops via a custom redirect handler. Final URL stored in `ping_log.final_url`. |
| **Edge Cases** | Infinite redirect loop: the 3-hop limit causes the check to fail with `error_type = 'REDIRECT_LIMIT'`. |

---

### BR-010 — Idempotent Job Execution

| Field | Value |
|---|---|
| **ID** | BR-010 |
| **Rule** | A BullMQ job that executes twice (due to worker crash mid-execution) must not produce duplicate incidents |
| **Reason** | BullMQ provides at-least-once delivery. A job may run twice in edge cases. |
| **Implementation** | Duplicate `ping_log` rows are acceptable (they are append-only records). Incident deduplication is handled by the partial unique index (BR-003). Notification deduplication is handled by the cooldown TTL (BR-004). |
| **Edge Cases** | Two identical `ping_log` rows for the same `monitor_id` and `checked_at` (within milliseconds) — acceptable. The incident engine reads `consecutive_failures` from the monitor record (updated atomically), not from raw ping log count. |

---

---

## 11. REST API Contract

> All authenticated endpoints require a valid Auth.js session cookie. All responses are `application/json`. All timestamps are ISO 8601 UTC strings.

---

### Base URL

```
https://your-app.railway.app/api
```

---

### Authentication

Auth is handled via Auth.js v5 session cookies. All `/api/*` routes (except `/api/health` and the Next.js-rendered `/status` page) require authentication.

A valid session is established after GitHub OAuth. The session cookie is `httpOnly`, `sameSite: 'lax'`, `secure: true` in production.

---

### Common Error Responses

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed Zod validation |
| 401 | `UNAUTHORIZED` | No valid session |
| 403 | `FORBIDDEN` | Session valid but resource belongs to another user |
| 404 | `NOT_FOUND` | Resource does not exist or is soft-deleted |
| 409 | `CONFLICT` | e.g., open incident exists; force delete required |
| 422 | `UNPROCESSABLE` | Business rule violation (e.g., SSRF URL) |
| 429 | `RATE_LIMITED` | Exceeded 100 req/min |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

### Monitors

#### `GET /api/monitors`

Retrieve all monitors for the authenticated user.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string (optional) | Filter by status: `active`, `down`, `paused` |
| `page` | integer (default: 1) | Pagination page |
| `limit` | integer (default: 20, max: 100) | Page size |
| `sort` | string (default: `created_at`) | Sort field: `created_at`, `name`, `status` |
| `order` | string (default: `desc`) | `asc` or `desc` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "mon_abc123",
      "name": "Production API",
      "url": "https://api.example.com/health",
      "status": "active",
      "check_interval_minutes": 5,
      "failure_threshold": 2,
      "timeout_seconds": 10,
      "consecutive_failures": 0,
      "last_checked_at": "2025-01-15T10:30:00Z",
      "uptime_percent_30d": 99.87,
      "status_page_visible": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "total_pages": 1
  }
}
```

---

#### `POST /api/monitors`

Create a new monitor.

**Request body:**
```json
{
  "name": "Production API",
  "url": "https://api.example.com/health",
  "check_interval_minutes": 5,
  "failure_threshold": 2,
  "timeout_seconds": 10,
  "keyword_check": "\"status\":\"ok\"",
  "status_page_visible": true
}
```

**Zod schema:**
```typescript
const CreateMonitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().startsWith('http'),
  check_interval_minutes: z.enum(['1','5','15','30','60']).transform(Number),
  failure_threshold: z.number().int().min(1).max(5).default(2),
  timeout_seconds: z.number().int().min(5).max(30).default(10),
  keyword_check: z.string().max(200).optional(),
  status_page_visible: z.boolean().default(true)
});
```

**Response `201`:**
```json
{
  "data": {
    "id": "mon_abc123",
    "name": "Production API",
    "url": "https://api.example.com/health",
    "status": "pending",
    "check_interval_minutes": 5,
    "failure_threshold": 2,
    "timeout_seconds": 10,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

**Errors:**
- `422` if URL resolves to private IP (SSRF prevention)
- `400` if `check_interval_minutes` not in allowed set

---

#### `GET /api/monitors/:id`

Retrieve a single monitor with recent ping logs and open incident.

**Response `200`:**
```json
{
  "data": {
    "id": "mon_abc123",
    "name": "Production API",
    "url": "https://api.example.com/health",
    "status": "active",
    "uptime_percent_30d": 99.87,
    "p95_response_time_ms": 342,
    "recent_ping_logs": [
      {
        "checked_at": "2025-01-15T10:30:00Z",
        "is_up": true,
        "status_code": 200,
        "response_time_ms": 287
      }
    ],
    "open_incident": null,
    "ssl": {
      "expires_at": "2025-06-01T00:00:00Z",
      "days_remaining": 137,
      "is_valid": true
    }
  }
}
```

---

#### `PATCH /api/monitors/:id`

Partial update a monitor.

**Request body (all fields optional):**
```json
{
  "name": "Updated Name",
  "check_interval_minutes": 1,
  "status": "paused"
}
```

**Business logic:**
- If `status` set to `paused`: removes BullMQ job
- If `status` set to `active`: re-registers BullMQ job
- If `check_interval_minutes` changes: removes old BullMQ job, registers new one
- If `url` changes: resets `consecutive_failures = 0`

**Response `200`:** Updated monitor object.

---

#### `DELETE /api/monitors/:id`

Soft-delete a monitor.

**Query params:**
- `?force=true` — required if monitor has an open incident

**Response `204`:** No content.

---

### Ping Logs

#### `GET /api/monitors/:id/ping-logs`

Retrieve paginated ping logs for a monitor.

**Query params:**

| Param | Type | Default |
|---|---|---|
| `from` | ISO 8601 date | 24 hours ago |
| `to` | ISO 8601 date | now |
| `limit` | integer | 100 |
| `is_up` | boolean | (all) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": 8472391,
      "checked_at": "2025-01-15T10:30:00Z",
      "is_up": true,
      "status_code": 200,
      "response_time_ms": 287,
      "error_type": null
    }
  ],
  "pagination": { "total": 288, "page": 1, "limit": 100 }
}
```

---

#### `GET /api/monitors/:id/response-times`

Retrieve daily P50/P95/P99 response time data for charts.

**Query params:**
- `days` — integer (default: 30, max: 90)

**Response `200`:**
```json
{
  "data": [
    {
      "date": "2025-01-14",
      "p50_ms": 210,
      "p95_ms": 387,
      "p99_ms": 542,
      "uptime_percent": 100
    }
  ]
}
```

---

### Incidents

#### `GET /api/monitors/:id/incidents`

Retrieve incident history for a monitor.

**Query params:**

| Param | Type | Default |
|---|---|---|
| `status` | `open` or `resolved` | all |
| `from` | ISO 8601 | 30 days ago |
| `to` | ISO 8601 | now |
| `page` | integer | 1 |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "inc_xyz789",
      "status": "resolved",
      "started_at": "2025-01-10T03:22:00Z",
      "resolved_at": "2025-01-10T03:45:00Z",
      "duration_seconds": 1380,
      "error_type": "HTTP_ERROR",
      "root_cause": null
    }
  ]
}
```

---

#### `PATCH /api/incidents/:id`

Add root cause note to incident (manual annotation).

**Request body:**
```json
{
  "root_cause": "Deployed bad migration — rolled back at 03:44 UTC"
}
```

---

### Notification Configs

#### `GET /api/monitors/:id/notifications`

List notification configs for a monitor.

#### `POST /api/monitors/:id/notifications`

Add notification config.

**Request body (email):**
```json
{
  "type": "email",
  "email": "oncall@example.com",
  "on_incident_open": true,
  "on_incident_resolve": true
}
```

**Request body (webhook):**
```json
{
  "type": "webhook",
  "url": "https://hooks.example.com/alerting",
  "on_incident_open": true,
  "on_incident_resolve": false
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "nc_def456",
    "type": "webhook",
    "url": "https://hooks.example.com/alerting",
    "webhook_secret": "whs_abc123xyz"
  },
  "meta": {
    "note": "Store this secret now — it will not be shown again. Use it to verify the X-StatusPing-Signature header."
  }
}
```

> The raw webhook secret is returned exactly once on creation. The server stores only `SHA-256(secret)`. If lost, the config must be deleted and recreated.

---

### Status Page (Public)

#### `GET /api/status`

Public endpoint returning status page data (used for dynamic status page rendering and potential embeds).

**Authentication:** None required.

**Response `200`:**
```json
{
  "data": {
    "overall_status": "operational",
    "monitors": [
      {
        "name": "Production API",
        "status": "operational",
        "uptime_90d": [
          { "date": "2024-10-17", "uptime_percent": 100 },
          { "date": "2024-10-18", "uptime_percent": 98.61 }
        ]
      }
    ],
    "active_incidents": []
  },
  "meta": {
    "cached_at": "2025-01-15T10:29:45Z",
    "cache_ttl_seconds": 60
  }
}
```

---

### System

#### `GET /api/health`

Health check endpoint for Railway deploy checks.

**Authentication:** None required.

**Response `200`:**
```json
{
  "status": "ok",
  "postgres": "connected",
  "redis": "connected",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

### Reports

#### `GET /api/monitors/:id/report/sla?year=2025&month=1`

Generate and stream an SLA PDF report.

**Response:** `application/pdf` stream with header `Content-Disposition: attachment; filename="statusping-sla-2025-01-Production-API.pdf"`

---

## 12. Queue Architecture

### Overview

StatusPing uses five distinct BullMQ queues, each with a dedicated responsibility. Separating queues provides:
- **Independent concurrency settings** — notification delivery doesn't block ping execution
- **Independent retry policies** — a failing webhook shouldn't starve new pings
- **Independent dead-letter isolation** — failed notifications are visible without noise from normal ping churn
- **Observability** — queue depth per queue is a leading indicator of specific component health

```mermaid
graph LR
    subgraph Producers
        API[API Server]
        WORKER[Worker Startup]
        CRON[BullMQ Cron]
    end

    subgraph Queues
        PQ[ping-queue]
        IQ[incident-queue]
        NQ[notification-queue]
        WQ[webhook-queue]
        RQ[retention-queue]
        SSLQ[ssl-queue]
    end

    subgraph Consumers
        PW[Ping Worker]
        IW[Incident Worker]
        NW[Notification Worker]
        WW[Webhook Worker]
        RW[Retention Worker]
        SSLW[SSL Worker]
    end

    API -->|create monitor| PQ
    WORKER -->|startup: re-register| PQ
    CRON -->|every N minutes| PQ
    PW --> IQ
    IW --> NQ
    IW --> WQ
    CRON -->|2am daily| RQ
    CRON -->|daily| SSLQ

    PQ --> PW
    IQ --> IW
    NQ --> NW
    WQ --> WW
    RQ --> RW
    SSLQ --> SSLW
```

---

### Queue 1: `ping-queue`

**Purpose:** Schedule and execute HTTP health checks for all active monitors.

| Property | Value |
|---|---|
| **Producer** | API server (on monitor create/resume), Worker startup (job re-registration), BullMQ repeatable job scheduler |
| **Consumer** | Ping Worker |
| **Concurrency** | 10 (configurable via `PING_WORKER_CONCURRENCY` env var) |
| **Retry** | 2 attempts. Failure = write ping_log with `is_up=false`, `error_type='WORKER_ERROR'` |
| **Backoff** | `exponential`, delay: 5000ms |
| **Job TTL** | 5 minutes (stale job discarded — prevents check pile-up if worker was down) |
| **Dead Letter** | After 2 retries: write to `dead_letter_jobs` table |
| **Priority** | Standard (no priority needed — all pings are equal) |

**Job payload:**
```typescript
interface PingJobData {
  monitorId: string;
  url: string;
  timeoutSeconds: number;
  keywordCheck?: string;
  checkIntervalMinutes: number;
}
```

**Repeatable job registration:**
```typescript
await pingQueue.add('ping', jobData, {
  repeat: { every: checkIntervalMinutes * 60 * 1000 },
  jobId: `monitor:${monitorId}`,  // idempotent key
  removeOnComplete: 100,          // keep last 100 completed jobs for debugging
  removeOnFail: 50,
});
```

**Job staleness guard:** If `job.timestamp` is more than `checkIntervalMinutes * 2 * 60 * 1000` milliseconds old when dequeued, the worker discards the job with a log entry. This prevents executing a pile of queued pings after a worker restart.

---

### Queue 2: `incident-queue`

**Purpose:** Evaluate consecutive failure counts and create/resolve incidents.

| Property | Value |
|---|---|
| **Producer** | Ping Worker (after every ping result) |
| **Consumer** | Incident Worker |
| **Concurrency** | 5 |
| **Retry** | 3 attempts |
| **Backoff** | `fixed`, delay: 1000ms |
| **Dead Letter** | After 3 retries: write to `dead_letter_jobs` |

**Job payload:**
```typescript
interface IncidentJobData {
  monitorId: string;
  isUp: boolean;
  pingLogId: number;
  checkedAt: string; // ISO 8601
}
```

**Why a separate queue?** Incident evaluation involves a PostgreSQL write and a conditional INSERT. If done inline in the ping worker, a slow PostgreSQL write could block the next ping from executing. Separation allows the ping worker to continue at full concurrency while the incident queue processes at its own rate.

---

### Queue 3: `notification-queue`

**Purpose:** Deliver email notifications via Resend.

| Property | Value |
|---|---|
| **Producer** | Incident Worker (on incident open/resolve) |
| **Consumer** | Notification Worker |
| **Concurrency** | 3 (Resend rate limit: 10 req/s free tier — conservative) |
| **Retry** | 5 attempts |
| **Backoff** | `exponential`, delay: 2000ms (2s → 4s → 8s → 16s → 32s) |
| **Dead Letter** | After 5 retries: mark `notification_log.status = 'failed'` |

**Job payload:**
```typescript
interface NotificationJobData {
  notificationConfigId: string;
  incidentId: string;
  eventType: 'opened' | 'resolved';
  monitorName: string;
  monitorUrl: string;
  incidentStartedAt: string;
}
```

---

### Queue 4: `webhook-queue`

**Purpose:** Deliver HMAC-signed webhook POST requests to user-configured URLs.

| Property | Value |
|---|---|
| **Producer** | Incident Worker (on incident open/resolve) |
| **Consumer** | Webhook Worker |
| **Concurrency** | 5 |
| **Retry** | 5 attempts |
| **Backoff** | `exponential`, delay: 1000ms (1s → 2s → 4s → 8s → 16s) |
| **Dead Letter** | After 5 retries: INSERT into `dead_letter_jobs`; mark `notification_log.status = 'failed'` |

**Webhook payload schema:**
```json
{
  "event": "incident.opened",
  "monitor": {
    "id": "mon_abc123",
    "name": "Production API",
    "url": "https://api.example.com/health"
  },
  "incident": {
    "id": "inc_xyz789",
    "started_at": "2025-01-15T10:30:00Z",
    "error_type": "HTTP_ERROR"
  },
  "timestamp": "2025-01-15T10:30:05Z"
}
```

**HMAC signature computation:**
```typescript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

headers['X-StatusPing-Signature'] = `sha256=${signature}`;
headers['X-StatusPing-Timestamp'] = payload.timestamp;
```

Recipients should verify the signature and reject requests where the timestamp is more than 5 minutes old (replay attack prevention).

---

### Queue 5: `retention-queue`

**Purpose:** Aggregate old ping logs into daily_stats and drop old partitions.

| Property | Value |
|---|---|
| **Producer** | BullMQ cron: `0 2 * * *` (2am UTC daily) |
| **Consumer** | Retention Worker |
| **Concurrency** | 1 (serialize — avoid concurrent partition operations) |
| **Retry** | 2 attempts |
| **Backoff** | `fixed`, delay: 60000ms (1 minute) |

---

### Queue 6: `ssl-queue`

**Purpose:** Check TLS certificate expiry dates for HTTPS monitors.

| Property | Value |
|---|---|
| **Producer** | BullMQ cron: `0 6 * * *` (6am UTC daily) |
| **Consumer** | SSL Worker |
| **Concurrency** | 5 |
| **Retry** | 2 attempts |

---

## 13. Worker Design

### 13.1 Ping Worker

**Process location:** `src/worker/ping-worker.ts`

**Responsibilities:**
1. Fetch monitor config from PostgreSQL
2. Execute HTTP health check with timeout
3. Follow redirects (up to 3 hops)
4. Check keyword if configured
5. Measure response time (wall clock, not network time)
6. Write `ping_log` row to PostgreSQL
7. Update `monitor.last_checked_at` and `monitor.consecutive_failures`
8. Enqueue job to `incident-queue`
9. Perform SSL check (for HTTPS monitors)

**Input:** `PingJobData`

**Output:** `ping_log` row, `incident-queue` job, updated `monitor` record

**Failure recovery:**

| Failure Mode | Behavior |
|---|---|
| HTTP timeout | Write `ping_log` with `is_up=false`, `error_type='TIMEOUT'` |
| DNS resolution failure | Write `ping_log` with `is_up=false`, `error_type='DNS_FAILURE'` |
| SSL error | Write `ping_log` with `is_up=false`, `error_type='SSL_ERROR'` |
| Monitor not found in DB | Log warning "monitor not found", discard job, return |
| Monitor soft-deleted | Log "monitor deleted", discard job, return |
| PostgreSQL write failure | BullMQ retries job (2 attempts) |

**Concurrency:** 10 concurrent ping jobs per worker process. Each job runs independently — one slow target doesn't block others.

**Logging per job execution:**
```
INFO  [worker=ping] [trace=abc123] [monitor=mon_xyz] Starting ping check
INFO  [worker=ping] [trace=abc123] [monitor=mon_xyz] HTTP GET https://api.example.com/health
INFO  [worker=ping] [trace=abc123] [monitor=mon_xyz] Result: 200 OK in 287ms
INFO  [worker=ping] [trace=abc123] [monitor=mon_xyz] Ping log written: id=8472391
```

---

### 13.2 Incident Worker

**Process location:** `src/worker/incident-worker.ts`

**Responsibilities:**
1. Read monitor's current `consecutive_failures` from PostgreSQL
2. Increment or reset based on ping result
3. Evaluate whether incident threshold is crossed
4. Create incident (if threshold reached and no open incident)
5. Resolve incident (if monitor recovered and open incident exists)
6. Enqueue notification jobs
7. Update monitor status

**Input:** `IncidentJobData`

**Output:** Optionally new `incident` row; updated `monitor` row; notification jobs enqueued

**Idempotency:** The partial unique index on `incidents` prevents duplicate incident creation. The worker catches `P2002` (Prisma unique constraint violation) and treats it as "incident already exists — skip notification enqueue."

**Worker lifecycle:**
```mermaid
flowchart TD
    A[Dequeue incident job] --> B[Fetch monitor from DB]
    B --> C{is_up?}
    C -- true --> D[Reset consecutive_failures = 0]
    D --> E{Open incident?}
    E -- yes --> F[Resolve incident]
    F --> G[Enqueue resolved notification]
    E -- no --> H[No action — monitor was already up]
    C -- false --> I[Increment consecutive_failures]
    I --> J{>= failure_threshold AND no open incident?}
    J -- yes --> K[INSERT incident]
    K --> L[Enqueue opened notification]
    J -- no --> M[No action yet]
```

---

### 13.3 Notification Worker

**Process location:** `src/worker/notification-worker.ts`

**Responsibilities:**
1. Check Redis cooldown key — skip if active and `eventType = 'opened'`
2. Fetch notification config from PostgreSQL
3. Build email body from template
4. POST to Resend API
5. Write `notification_log` row
6. Set Redis cooldown key (TTL 30 minutes) on successful send
7. Clear cooldown key on `resolved` event

**Metrics tracked:**
- `notification.sent_count` — total emails sent (counter)
- `notification.cooldown_suppressed_count` — emails skipped by cooldown
- `notification.failed_count` — emails that failed all retries

---

### 13.4 Webhook Worker

**Responsibilities:**
1. Fetch webhook config (URL, `secret_hash`) from PostgreSQL
2. Build payload JSON
3. Compute HMAC-SHA256 signature
4. POST to webhook URL with 10s timeout
5. Log response status code and body (truncated to 200 chars)
6. On non-2xx: BullMQ retries with exponential backoff
7. On exhausted retries: INSERT into `dead_letter_jobs`

**Security note:** `secret_hash` is `SHA-256(raw_secret)`. The raw secret is only used at delivery time — it was provided to the user at config creation and never stored in plaintext. The HMAC is computed using the raw secret; the hash is used only to look up the config.

**Wait** — this is a subtle design issue worth documenting explicitly:

> The server cannot recompute the HMAC if it only stores the hash of the secret. **Solution:** Store the raw secret encrypted with AES-256-GCM using a server-side key (from `WEBHOOK_ENCRYPTION_KEY` environment variable). The `secret_hash` column stores the encrypted ciphertext, not a bcrypt/SHA-256 hash. "Hash" in the column name is a misnomer in the naive design; the production implementation must use reversible encryption for webhook secrets.

---

### 13.5 Retention Worker

**Responsibilities:**
1. Find all distinct `monitor_id` values in `ping_logs` with `checked_at < NOW() - INTERVAL '30 days'`
2. For each monitor + date: compute `total_checks`, `successful_checks`, `uptime_percent`, percentiles
3. UPSERT into `daily_stats` with `ON CONFLICT (monitor_id, stat_date) DO NOTHING`
4. Drop ping_logs partition for the fully-processed month
5. Hard-delete soft-deleted monitors older than 30 days
6. Log rows processed, rows inserted, partitions dropped

**Why monthly partition drop vs. DELETE?**

```
DELETE FROM ping_logs WHERE checked_at < '2024-11-01';
-- Scans millions of rows, acquires locks, generates WAL, slow

DROP TABLE ping_logs_2024_10;
-- O(1) metadata operation, instant, no lock contention
```

---

### 13.6 Worker Startup Sequence

Every time the worker process starts (initial deploy or restart), it executes a startup routine before processing any queue jobs:

```mermaid
flowchart TD
    A[Worker process starts] --> B[Connect to PostgreSQL]
    B --> C[Connect to Redis]
    C --> D[Fetch all active monitors from PostgreSQL]
    D --> E[For each monitor: check if BullMQ repeatable job exists in Redis]
    E --> F{Job exists?}
    F -- yes --> G[Skip — already registered]
    F -- no --> H[Register repeatable job]
    H --> I[Log: re-registered job for monitor_id]
    G --> J[All monitors processed]
    I --> J
    J --> K[Start consuming all queues]
    K --> L[Log: Worker ready]
```

This startup routine is the disaster recovery for BR-010 (Redis total data loss). It ensures pings resume automatically without operator intervention.

---

### 13.7 Worker Health Metrics

The worker exposes a minimal HTTP server on port 3001 (not public-facing) for Railway health checks:

```
GET /health → 200 {"status":"ok","queues":{"ping":{"waiting":0,"active":3},...}}
GET /metrics → Plain text Prometheus format (future improvement)
```

---

## 14. Failure Scenarios

### FS-001 — Redis Down

**Trigger:** Railway Redis instance unavailable (restart, network partition, OOM).

**Impact:**
- BullMQ cannot enqueue or dequeue jobs
- No new pings execute
- No notifications sent
- Status page cache reads fail (falls back to PostgreSQL query)
- Cooldown keys unavailable (notification worker skips cooldown check — risk of duplicate emails)

**Detection:** Worker logs `BullMQ connection error`. Health endpoint returns `"redis":"disconnected"`.

**Recovery:**
- BullMQ automatically reconnects on Redis availability (uses `ioredis` with reconnect strategy)
- On reconnection, the startup routine re-registers any repeatable jobs that were lost
- Missed pings during downtime: a monitoring gap appears in ping_logs. No false incident created (no pings = no failures)
- If Redis recovers within the notification cooldown window and duplicate emails were sent: acceptable — documented limitation of free-tier Redis

**Mitigation (production):** Redis Sentinel or Redis Cluster for HA. Railway Pro managed Redis has automatic failover.

---

### FS-002 — PostgreSQL Down

**Trigger:** PostgreSQL restart, disk full, connection limit reached.

**Impact:**
- Ping worker cannot read monitor config → jobs fail and BullMQ retries
- Ping log writes fail → results lost until recovery
- Dashboard API returns 503
- Incident engine cannot write incidents

**Recovery strategy:**
1. BullMQ retries failed jobs up to configured max (2 for ping jobs)
2. Worker implements an in-memory ring buffer: if PostgreSQL is unavailable, buffer up to 100 ping results in memory
3. On PostgreSQL reconnection: flush buffer (batch INSERT)
4. Jobs that exhausted retries during the outage land in the dead-letter table — inspect and replay via admin API

**Buffer implementation note:** The ring buffer is a JavaScript `Map<monitorId, PingResult[]>` capped at 100 entries total. When full, oldest entries are evicted (FIFO). This is a best-effort mechanism — extended outages (> few minutes) will lose some ping logs. The 30-day raw log window means a few minutes of gaps is acceptable.

---

### FS-003 — Worker Process Crash

**Trigger:** Unhandled exception, OOM kill, Railway service restart.

**Impact:** All `active` BullMQ jobs are orphaned — they appear as active in Redis but no process is consuming them.

**Recovery:**
- BullMQ's `lockDuration` (default 30 seconds) — if a worker does not renew its lock within 30 seconds, BullMQ automatically moves the job back to the `waiting` state
- On worker restart: startup routine re-registers repeatable jobs; orphaned jobs resume automatically within 30 seconds
- No data loss (pings not yet written will be retried)

**Prevention:** Wrap all worker job handlers in `try/catch` at the top level. Unhandled rejections are caught by BullMQ's built-in error handler — they fail the job rather than crashing the process.

---

### FS-004 — Duplicate Incident Race Condition

**Trigger:** Two worker instances (scaled horizontally) both detect the same monitor failure simultaneously and both attempt to INSERT an incident.

**Sequence:**
1. Worker A dequeues ping job, executes, gets 503
2. Worker B dequeues a different ping job for the same monitor (both jobs were enqueued during a short window), gets 503
3. Both workers evaluate `consecutive_failures >= threshold`
4. Both workers attempt `INSERT INTO incidents ...`

**Resolution:** PostgreSQL partial unique index `idx_incidents_monitor_open` rejects the second INSERT with error code `23505`. Worker B catches this, logs "incident already exists for monitor — skipping notification", and returns successfully. One incident, one notification.

---

### FS-005 — Webhook Endpoint Unreachable

**Trigger:** User's configured webhook URL is down, returns 404, or times out.

**Behavior:**
- BullMQ retries 5 times with exponential backoff (1s → 2s → 4s → 8s → 16s)
- Total retry window: ~31 seconds
- After 5 failures: `notification_log.status = 'failed'`; `dead_letter_jobs` row inserted
- Dashboard shows failed notification badge on incident

**Operator recovery:** Admin endpoint `POST /api/admin/dead-letter-jobs/:id/replay` re-enqueues the job into `webhook-queue`. This is a manual action — no auto-retry beyond the 5 initial attempts.

---

### FS-006 — Monitor URL Returns Intermittent Failures (Flapping)

**Trigger:** A monitor's URL alternates between up and down rapidly (every 2nd ping fails).

**Risk without protection:** Every failure triggers a notification → alert fatigue; every recovery triggers a notification → double alert fatigue. With a 5-minute check interval and a flapping service, this could produce 288 emails/day.

**Protection layers:**
1. `failure_threshold = 2` (default): two consecutive failures required before incident opens. A single flap (fail, pass, fail, pass) never creates an incident.
2. Notification cooldown (30-minute Redis TTL): even if an incident opens, re-opened incidents within 30 minutes don't produce additional notifications.
3. Incident deduplication (partial unique index): cannot have more than one open incident per monitor. Cooldown TTL and incident state together mean at most ~2 notifications/hour during a severe flap.

---

### FS-007 — Memory Leak in Worker Process

**Trigger:** BullMQ event listeners not properly removed; Prisma connection pool not reused; large ping response bodies buffered in memory.

**Detection:** Worker health endpoint exposes `process.memoryUsage()`. If RSS exceeds a threshold (e.g., 512MB), log a WARNING.

**Prevention:**
- Never buffer response bodies (use `response.text()` only for keyword check; otherwise discard body)
- Prisma client is a singleton — not re-instantiated per job
- BullMQ workers use `.process()` handler which is called for each job without accumulating state

**Recovery:** Railway automatically restarts a service that OOM-crashes. The startup routine re-registers jobs. Short-term memory spike on restart is normal; persistent leak requires investigation.

---

### FS-008 — Resend API Rate Limit

**Trigger:** Sending more than Resend's free tier rate (10 req/s, 3,000 emails/month).

**Behavior:**
- Resend returns HTTP `429 Too Many Requests`
- BullMQ retries with exponential backoff
- If 3,000/month limit reached: Resend returns `402`

**Detection:** `notification.failed_count` metric increases. Dashboard warning if monthly quota is > 80% consumed.

**Mitigation:** 3,000 emails/month ≈ 100 incidents/month with one email per incident (open + resolve = 2 emails). Realistic for a small team. For high-volume deployments: upgrade Resend plan or implement per-incident email deduplication at the application level.

---

## 15. Sequence Diagrams

### 15.1 Full Ping Cycle

```mermaid
sequenceDiagram
    participant SCHED as BullMQ Scheduler
    participant REDIS as Redis
    participant PW as Ping Worker
    participant DB as PostgreSQL
    participant TARGET as Target Endpoint

    SCHED->>REDIS: Enqueue ping job {monitorId} at T+5min
    Note over REDIS: Job queued

    SCHED->>REDIS: T+5min: Move job to active
    REDIS->>PW: Deliver job {monitorId, url, timeout}
    PW->>DB: SELECT * FROM monitors WHERE id = monitorId
    DB-->>PW: {url, timeout, threshold, consecutive_failures=0}
    PW->>TARGET: GET https://api.example.com/health (timeout: 10s)
    TARGET-->>PW: 200 OK, body, response_time=287ms
    PW->>DB: INSERT INTO ping_logs (monitor_id, is_up=true, status_code=200, response_time_ms=287)
    DB-->>PW: ping_log.id = 8472391
    PW->>DB: UPDATE monitors SET last_checked_at=NOW(), consecutive_failures=0 WHERE id=monitorId
    PW->>REDIS: Enqueue incident job {monitorId, isUp=true, pingLogId=8472391}
    PW->>REDIS: ACK job complete
```

---

### 15.2 Incident Creation

```mermaid
sequenceDiagram
    participant PW as Ping Worker
    participant REDIS as Redis
    participant IW as Incident Worker
    participant DB as PostgreSQL
    participant NQ as Notification Queue

    Note over PW: Two consecutive failures for monitorId

    PW->>REDIS: Enqueue incident job {monitorId, isUp=false}
    REDIS->>IW: Deliver incident job

    IW->>DB: SELECT consecutive_failures, failure_threshold FROM monitors WHERE id=monitorId
    DB-->>IW: consecutive_failures=1, failure_threshold=2

    IW->>DB: UPDATE monitors SET consecutive_failures=2, status='down'
    Note over IW: 2 >= 2 → threshold reached

    IW->>DB: SELECT id FROM incidents WHERE monitor_id=monitorId AND status='open'
    DB-->>IW: (no rows — no open incident)

    IW->>DB: INSERT INTO incidents (monitor_id, status='open', started_at=NOW())
    DB-->>IW: incident.id = 'inc_xyz789'
    Note over DB: Partial unique index enforces one open incident per monitor

    IW->>DB: SELECT * FROM notification_configs WHERE monitor_id=monitorId
    DB-->>IW: [{type: 'email', email: 'dev@example.com'}]

    IW->>NQ: Enqueue notification job {incidentId, eventType='opened'}
    IW->>REDIS: ACK incident job complete
```

---

### 15.3 Incident Auto-Resolution

```mermaid
sequenceDiagram
    participant PW as Ping Worker
    participant IW as Incident Worker
    participant DB as PostgreSQL
    participant NQ as Notification Queue
    participant REDIS as Redis

    Note over PW: Monitor recovered — ping returns 200

    PW->>DB: INSERT ping_log {is_up=true}
    PW->>REDIS: Enqueue incident job {monitorId, isUp=true}
    REDIS->>IW: Deliver job

    IW->>DB: UPDATE monitors SET consecutive_failures=0, status='active'

    IW->>DB: SELECT id FROM incidents WHERE monitor_id=monitorId AND status='open'
    DB-->>IW: incident.id = 'inc_xyz789'

    IW->>DB: UPDATE incidents SET status='resolved', resolved_at=NOW() WHERE id='inc_xyz789'
    Note over DB: duration_seconds computed automatically by generated column

    IW->>NQ: Enqueue notification {incidentId, eventType='resolved'}
    IW->>REDIS: DELETE cooldown:{monitorId}:{notifConfigId}
```

---

### 15.4 Notification Delivery with Cooldown

```mermaid
sequenceDiagram
    participant NQ as Notification Queue
    participant NW as Notification Worker
    participant REDIS as Redis
    participant DB as PostgreSQL
    participant RESEND as Resend API

    NQ->>NW: Deliver notification job {incidentId, eventType='opened'}

    NW->>REDIS: GET cooldown:{monitorId}:{notifConfigId}
    REDIS-->>NW: (nil — no cooldown key)

    NW->>DB: SELECT email FROM notification_configs WHERE id=notifConfigId
    DB-->>NW: {email: 'dev@example.com'}

    NW->>RESEND: POST /v1/emails {to, subject, html}
    RESEND-->>NW: 200 {id: 're_abc123'}

    NW->>DB: INSERT notification_logs {status='delivered', delivered_at=NOW()}
    NW->>REDIS: SET cooldown:{monitorId}:{notifConfigId} EX 1800
    NW->>NQ: ACK job

    Note over NW: Second incident opens within 30 minutes

    NQ->>NW: Deliver notification job {incidentId2, eventType='opened'}
    NW->>REDIS: GET cooldown:{monitorId}:{notifConfigId}
    REDIS-->>NW: "1" (cooldown active)
    NW->>DB: INSERT notification_logs {status='suppressed'}
    NW->>NQ: ACK job (suppressed — not a failure)
```

---

### 15.5 Status Page Render

```mermaid
sequenceDiagram
    participant VISITOR as Browser
    participant NEXT as Next.js SSR
    participant REDIS as Redis
    participant DB as PostgreSQL

    VISITOR->>NEXT: GET /status
    NEXT->>REDIS: GET status:page:data
    alt Cache hit
        REDIS-->>NEXT: Cached JSON
    else Cache miss
        NEXT->>DB: SELECT monitors WHERE status_page_visible=true AND deleted_at IS NULL
        DB-->>NEXT: Monitor list
        NEXT->>DB: SELECT daily_stats WHERE stat_date >= NOW()-90 DAYS
        DB-->>NEXT: 90-day stats per monitor
        NEXT->>DB: SELECT incidents WHERE status='open'
        DB-->>NEXT: Active incidents
        NEXT->>NEXT: Assemble status page data
        NEXT->>REDIS: SET status:page:data EX 60
    end
    NEXT->>VISITOR: HTML (server-rendered)
    Note over VISITOR: No JavaScript hydration needed for initial render
    Note over VISITOR: Lighthouse: 97
```

---

### 15.6 Data Retention

```mermaid
sequenceDiagram
    participant CRON as BullMQ Cron (2am UTC)
    participant RW as Retention Worker
    participant DB as PostgreSQL

    CRON->>RW: Trigger retention job

    RW->>DB: SELECT DISTINCT monitor_id, DATE(checked_at) FROM ping_logs WHERE checked_at < NOW()-30DAYS
    DB-->>RW: [(monitorId1, '2024-12-01'), (monitorId1, '2024-12-02'), ...]

    loop For each (monitor_id, date)
        RW->>DB: SELECT COUNT(*), SUM(is_up::int), PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) ... FROM ping_logs WHERE monitor_id=? AND DATE(checked_at)=?
        DB-->>RW: Aggregated stats
        RW->>DB: INSERT INTO daily_stats ... ON CONFLICT (monitor_id, stat_date) DO NOTHING
    end

    RW->>DB: DROP TABLE IF EXISTS ping_logs_2024_11
    Note over DB: O(1) partition drop vs millions of DELETEs

    RW->>DB: DELETE FROM monitors WHERE deleted_at < NOW()-30DAYS
    RW->>RW: Log: processed N monitors, dropped M partitions
```

---

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
