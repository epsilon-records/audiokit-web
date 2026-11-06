# AudioKit billing service

The AudioKit billing and accounts service: freemium users, subscriptions, API
keys, usage tracking and quota enforcement. It is a **separate service inside
the `epsilon-records/audiokit-web` repo** (decision
[0014](https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0014-freemium-billing-service.md)),
written in TypeScript on Node, built on Fastify and PostgreSQL, and hosted on
Railway next to the AudioKit API.

It is **not** part of the website build. Netlify builds and deploys only the
static site (`src/` → `dist/`); this service has its own Dockerfile and is
deployed as its own Railway service. A merge to `audiokit-web` does not deploy
this service with the website.

## Status

Implemented:

- User registration and login (JWT), password reset and email verification
  (tokens are generated and stored; sending email is not wired up yet).
- API keys: created per user, stored as SHA-256 hashes, shown once.
- Usage tracking per billing period and per operation.
- Quota enforcement: the free tier is a hard monthly limit; paid tiers allow
  overages and record them for billing.
- Idempotent job submission (`job_id` per user), job status and cancellation.
- Subscription read view.

Not wired up here (deliberately out of scope):

- **Stripe** is the approved payment vendor, but it is a separate task. There is
  no Stripe SDK, config or webhook handling in this service yet; the
  `/webhooks/stripe` route returns `501`.
- Transactional email (verify/reset/quota notices).
- Forwarding jobs to the AudioKit worker and processing its callbacks.

See [docs/roadmap.md](docs/roadmap.md) for the planned next steps.

## Layout

```
services/billing/
  src/
    app.ts               Fastify wiring (plugins, routes, error handler)
    server.ts            entry point: listen + graceful shutdown
    config.ts            environment configuration
    db.ts                Postgres pool, query helpers, small query builder
    schemas/             zod request schemas
    routes/              auth, jobs, usage, api-keys, subscriptions, webhooks
    services/            auth.service.ts, usage.service.ts
    utils/crypto.ts      API keys, password hashing, HMAC
  scripts/migrate.ts     applies schema.sql
  schema.sql             database schema and seed rows for the plans
  test/                  unit and HTTP smoke tests (no database needed)
  Dockerfile             multi-stage image for the Railway service
  docs/roadmap.md        planned work
```

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Quick start

```bash
cd services/billing
npm ci
cp .env.example .env          # point DATABASE_URL at a local Postgres
npm run db:migrate            # applies schema.sql
npm run build
npm start                     # http://localhost:3000, health at /health
```

`npm run dev` rebuilds and runs the compiled server under `node --watch`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm run typecheck` | Type-checks without emitting |
| `npm run lint` | ESLint over `src/`, `scripts/` and `test/` |
| `npm test` | Builds, then runs the test suite (no database required) |
| `npm start` | Runs the compiled server |
| `npm run dev` | Builds, then runs `node --watch` on `dist/` |
| `npm run db:migrate` | Applies `schema.sql` to `DATABASE_URL` |

## API

All routes are under `/v1` except the health check and the webhook stub.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | — | Liveness + database check |
| `GET` | `/` | — | Service name/version |
| `POST` | `/v1/auth/register` | — | Create user, free subscription, API key |
| `POST` | `/v1/auth/login` | — | Exchange credentials for a JWT |
| `POST` | `/v1/auth/verify-email` | — | Confirm an email token |
| `POST` | `/v1/auth/request-password-reset` | — | Start a password reset |
| `POST` | `/v1/auth/reset-password` | — | Complete a password reset |
| `GET` | `/v1/auth/me` | JWT | Current user |
| `POST` | `/v1/jobs` | API key | Submit a job (idempotent, quota-checked) |
| `GET` | `/v1/jobs` | API key | List this user's jobs |
| `GET` | `/v1/jobs/:provider_job_id` | API key | Job status |
| `POST` | `/v1/jobs/:provider_job_id/cancel` | API key | Cancel a queued/running job |
| `GET` | `/v1/usage/current` | JWT | Current period usage |
| `GET` | `/v1/usage/history` | JWT | Usage history |
| `GET` | `/v1/usage/quota` | JWT | Quota status |
| `GET` | `/v1/api-keys` | JWT | List keys (prefix only) |
| `POST` | `/v1/api-keys` | JWT | Create a key (full value once) |
| `DELETE` | `/v1/api-keys/:id` | JWT | Revoke a key |
| `GET` | `/v1/subscriptions/current` | JWT | Current subscription + plan |
| `POST` | `/webhooks/stripe` | — | Reserved for Stripe (`501` for now) |

Two auth schemes: a JWT from login/register (dashboard-style routes) and an
`ak_…` API key (job routes). Full API keys and password hashes never leave the
service except when a key is first created.

## Configuration

Copy `.env.example` to `.env`. The important variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Railway Postgres) |
| `JWT_SECRET` | JWT signing secret (32+ random bytes) |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `PORT` / `HOST` | Listener (Railway provides `PORT`) |
| `API_BASE_URL`, `WEB_BASE_URL`, `CONSOLE_BASE_URL` | CORS origins and links |
| `BCRYPT_ROUNDS`, `API_KEY_LENGTH` | Hashing and key strength |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` | Global rate limit per IP |
| `AUDIOKIT_WORKER_URL`, `AUDIOKIT_INTERNAL_SECRET` | Reserved for worker forwarding |

`NODE_ENV=production` requires `DATABASE_URL` and a non-default `JWT_SECRET`,
and refuses to start without them. Stripe and Resend variables are intentionally
not read yet; they arrive with their own task.

## Deployment

This service runs as its own Railway service, not on Netlify:

- New Railway service in the AudioKit project, root directory `services/billing`,
  built from the `Dockerfile`, with a Railway Postgres for `DATABASE_URL`.
- Use Railway's EU West region, matching the AudioKit API (decision 0012).
- Set the environment variables above in Railway. Never commit them.
- Run `npm run db:migrate` (or apply `schema.sql`) against the Railway database
  before the first deploy.

The website is unaffected: Netlify's build command is `npm run build` at the repo
root, which renders `src/` into `dist/`. It never walks into `services/billing/`
and there is no shared build step, so this service can never be published by a
website deploy.

## Tests

`npm test` builds and runs 21 tests with `node:test`. The suite covers the crypto
helpers, the request schemas, the pure quota decision function, user
sanitisation, and HTTP smoke tests (service info, auth rejection, the Stripe
stub) using `app.inject()`. No database or network access is needed.
