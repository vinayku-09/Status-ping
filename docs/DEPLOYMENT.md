# Deployment

StatusPing has three runtime pieces:

| Piece | What it needs | Where to host |
| --- | --- | --- |
| `frontend` (Next.js) | Static/SSR build | Vercel |
| `backend` API (Express) | Hosted Postgres + Redis | Vercel Functions |
| `backend` worker (BullMQ) | Long-running process + Postgres + Redis | Render / Railway / Fly / VPS |

The worker cannot run on Vercel: serverless functions time out and cannot hold the long-lived BullMQ connections used for pinging monitors.

## 1. Create the hosted database and Redis

Provision Postgres and Redis before deploying the API. Free-tier options: Neon or Supabase for Postgres, Upstash for Redis.

Apply the schema once against the hosted database:

```bash
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

The initial migration lives in `backend/prisma/migrations`.

## 2. Deploy the API to Vercel

1. Import the GitHub repo as a new Vercel project.
2. Set **Root Directory** to `backend`.
3. Add the environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Hosted Postgres connection string |
| `REDIS_URL` | Hosted Redis connection string |
| `JWT_SECRET` | Random string, at least 32 characters |
| `WEBHOOK_ENCRYPTION_KEY` | Random string, at least 32 characters |
| `APP_URL` | Frontend URL, e.g. `https://status-ping.vercel.app` |
| `SMTP_HOST` | SMTP host |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address, e.g. `alerts@example.com` |
| `NODE_ENV` | `production` |

4. Deploy. `backend/vercel.json` builds the TypeScript server, exposes it through `api/index.js`, and includes the Prisma query engine for the Vercel runtime.

Verify:

```bash
curl https://<api-project>.vercel.app/api/health
```

## 3. Deploy the frontend to Vercel

1. Import the same repo as a second Vercel project.
2. Set **Root Directory** to `frontend`.
3. Add `NEXT_PUBLIC_API_URL=https://<api-project>.vercel.app`.
4. Deploy.

`NEXT_PUBLIC_*` values are inlined at build time, so changing the API URL requires a new deployment.

## 4. Deploy the worker

Run the `worker` target of the root `Dockerfile` on a platform that supports long-running containers (Render, Railway, Fly, or a VPS):

```bash
docker build --target worker -t statusping-worker .
docker run --env-file backend/.env statusping-worker
```

Use the same `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `WEBHOOK_ENCRYPTION_KEY`, and SMTP values as the API.

## Local development

```bash
docker compose up -d postgres redis
cd backend && npm install && npm run db:migrate && npm run db:seed && npm run dev
cd frontend && npm install && npm run dev
```

## Notes

- Quick tunnels such as `*.trycloudflare.com` are temporary. Never use them as `NEXT_PUBLIC_API_URL`; the hostname stops resolving when the tunnel closes.
- CORS on the API allows `localhost`, `APP_URL`, and any `*.vercel.app` origin.
- If Redis is unreachable, rate limiting fails open so authentication still works, but queues and pings will not run.
