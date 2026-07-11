# StatusPing

A self-hosted, production-grade uptime monitoring platform designed to demonstrate deep backend engineering concepts: async job processing, queue-based worker design, automated incident lifecycles, and real-time metrics computation.

StatusPing continuously pings your HTTP/HTTPS endpoints on a configurable schedule, detects failures, automatically opens incidents, sends alerts, and displays historical uptime on a zero-auth public status page.


## Why This Project Stands Out

Unlike standard CRUD applications, StatusPing tackles real-world distributed systems challenges:

**Distributed Worker Architecture**
The core ping engine runs as a dedicated Node.js/BullMQ process, completely decoupled from the Next.js web server. Heavy background network I/O never degrades dashboard performance.

**Race-Condition Safe Incidents**
Uses a PostgreSQL partial unique index `WHERE status = 'open'` to guarantee exactly one open incident per monitor — even if two workers detect a failure at the exact same millisecond.

**Smart Data Retention**
Prevents database bloat by aggregating raw ping logs into daily P50/P95/P99 summaries. Uses PostgreSQL table partitioning by month — old partitions are dropped in O(1) time instead of running expensive DELETE scans over millions of rows.

**Production-Grade Notifications**
Redis TTL-based cooldowns prevent alert fatigue during flapping services. Webhook delivery uses HMAC-SHA256 signatures, exponential backoff retries, and a dead-letter queue for failed deliveries.

---

## System Architecture

graph TB
    %% Users
    User([Authenticated User])
    Visitor([Anonymous Visitor])

    %% Railway Environment
    subgraph "Railway Deployment (Monorepo)"
        
        subgraph "Service 1: Web Dashboard (Next.js 15)"
            UI[Web UI & Dashboard]
            API[API Routes /api/*]
            AUTH[Auth.js v5]
            STATUS[Public /status Page]
        end

        subgraph "Service 2: Background Workers (Node.js)"
            BULL[BullMQ Scheduler]
            PQ[Ping Worker]
            IQ[Incident Worker]
            NQ[Notification Worker]
            RW[Retention Worker]
        end

        subgraph "Data Storage"
            PG[(PostgreSQL)]
            REDIS[(Redis)]
        end
    end

    %% External Systems
    subgraph "External Targets & APIs"
        RESEND[Resend API]
        WEBHOOKS[User Webhooks]
        TARGETS[Monitored URLs]
    end

    %% User Interactions
    User -->|Manage monitors & account| UI
    Visitor -->|View live uptime (No Auth)| STATUS
    UI <--> AUTH
    UI <--> API
    
    %% Dashboard Data Flow
    API <-->|CRUD Operations| PG
    API -->|Enqueue first ping| REDIS
    STATUS <-->|Read Data| PG
    STATUS <-->|60s TTL Status Cache| REDIS

    %% Worker Data Flow
    BULL <-->|Manage Job Queues| REDIS
    BULL --> PQ & IQ & NQ & RW

    PQ <-->|Read config, Write ping_logs| PG
    PQ -->|HTTP GET Health Checks| TARGETS
    PQ -->|Enqueue Incident Checks| IQ

    IQ <-->|Evaluate failures, Create incidents| PG
    IQ -->|Trigger Alerts| NQ

    NQ -->|Send Emails| RESEND
    NQ -->|POST Signed Payload| WEBHOOKS
    NQ <-->|Check Cooldown TTLs| REDIS

    RW -->|Aggregate stats & Drop old partitions| PG

### Why Two Separate Services?

The ping worker is a long-running Node.js process. Serverless functions (Vercel) time out at 10 seconds and cannot maintain persistent state. Separating the worker ensures:

- Pings execute on schedule regardless of dashboard traffic
- A worker crash does not bring down the dashboard
- Both services scale independently without code changes

---

## Full Ping Cycle

One complete cycle from schedule trigger to notification delivery: