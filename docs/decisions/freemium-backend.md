# Proposal: where AudioKit's freemium billing and account backend lives

**Status:** proposal — awaiting Nate's decision. This is **not** an accepted decision.
**Date:** 2026-11-06
**Author:** [AudioKit web agent]
**Ticket:** EPSILON-42

The pricing page (`/pricing/`) already advertises Free / Pro / Enterprise, and a draft
Node/Fastify + Postgres + Stripe backend for accounts and billing sits **untracked** in
`audiokit-web/backend/`. This note lays out where that backend should live, in what language,
what it rules out, and a recommendation. Nothing here is implemented, and no decision is
recorded in the knowledge repo until Nate decides.

Related, but separate: the draft plan definitions (limits, overage rules, prices) are in
`docs/freemium-plans.md` (PR #5). This note is only about **where the backend lives**.

## What the backend has to do

- Accounts: register, log in, sessions, verification/reset mail.
- API keys: generate, store hashed, revoke, track last use.
- Tie a plan (free / pro / enterprise) to an account and its keys.
- Enforce a usage quota when a job is submitted, and count usage per billing period.
- Idempotency for job submission, keyed per account.
- Subscription lifecycle driven by the payment provider's webhooks.
- Overage accounting for Pro.

It must **not** own the job queue, the worker, or a second job store. The Rust API already
persists jobs in Railway Postgres, and workers claim them there; usage/quota/idempotency must
agree with the rows that job creation actually writes.

## Settled decisions this proposal must respect

- **0001 — the AudioKit service is Rust** (axum / tokio / serde, one container).
- **0005 / 0009 — the API and its Postgres run on Railway** (Hobby), same project; new services
  use **EU West** (0012).
- **0006 — `audiokit-web` is the website + API docs; `audiokit` is the API.**
- **0010 — every merge to `audiokit` main deploys production.**
- **0011 — the OpenAPI contract is public**, served at `/v1/openapi.yaml` and copied into this
  repo for the docs build.
- **0002 — AudioKit is presented as an independent product** (no client-specific references).

## Options

### Option A — extend the Rust `audiokit` service (recommended)

Add accounts, API keys, usage/quota and billing to the existing Rust API, in the same repo,
the same Railway project, the same Postgres, and the same `api` service. Stripe webhooks become
a route on that service.

- **Language / hosting:** Rust, existing Railway `api` service (EU West), existing Postgres.
- **Job & usage store:** the existing job tables. Quota and idempotency are checked in the same
  transaction that creates the job — no cross-service call, no second `jobs` table.
- **Trade-offs:** billing ships from the same service and deploy as the audio API, so a billing
  change is a production API change (0010). The service grows in scope and its OpenAPI contract
  gains account endpoints. Needs a Rust Stripe path (`async-stripe`, or plain HTTP calls to the
  Stripe REST API) instead of reusing the Node draft.
- **Rules out:** a second runtime, a second deploy surface, a second database, cross-service
  quota calls, and a duplicated job store.

### Option B — a separate billing service

A distinct service (recommended language: **Rust**, to match 0001; TypeScript/Node only if the
draft is reused) that owns accounts and billing. Deploy it as its own Railway service in the
same project, or in a new repo.

- **Hosting:** Railway, same project, EU West (0012).
- **Job & usage store:** either it shares the API's Postgres (two services writing one schema —
  ownership is unclear, migrations and locking get harder), or it owns a billing DB and the API
  calls it on every job submit to check quota (adds latency and a new failure mode to the hot
  path).
- **Trade-offs:** clean separation of billing from audio processing, an independent release
  cadence and blast radius, and the freedom to keep the Node draft. Costs a second service,
  second build/deploy, second set of secrets, service-to-service auth, and either schema
  sharing or an extra network hop per job.
- **Rules out:** a single service/deploy, in-process quota checks, one clear owner of the job and
  usage data, and the "one container, one bill" shape of 0005/0009.

### Option C — put it in the `audiokit-web` repo

Serverless functions on the Netlify site, or a small server bundled with it, handling accounts
and billing.

- **Language / hosting:** JavaScript/TypeScript on Netlify Functions.
- **Job & usage store:** Netlify does not host Postgres, so this needs an external database —
  a **new vendor/database** — even though the API already has one on Railway.
- **Trade-offs:** uses the draft's language and the website's existing deploy. But it puts
  account and payment code, Stripe secrets and customer data into the public-facing site repo,
  which 0006 exists to prevent; serverless functions are a poor fit for connection pooling,
  long-lived Stripe webhook handling and per-request quota checks; and it still needs a second
  datastore.
- **Rules out:** the static-site guarantee of `audiokit-web`, the clean repo boundary of 0006,
  reuse of the existing Railway Postgres, and keeping billing code out of the public site repo.

## Comparison

| | A — extend Rust API | B — separate service | C — website repo |
| --- | --- | --- | --- |
| Language | Rust (0001) | Rust (or Node) | JS/TS |
| Host | existing Railway `api` | new Railway service | Netlify Functions |
| Database | existing Railway Postgres | shared or new | new vendor (Netlify has none) |
| Job/usage store | existing job tables | shared schema or cross-service | separate from the API |
| Quota check | in-process | shared DB or network hop | network hop |
| Repo | `audiokit` (0006) | `audiokit` or new | `audiokit-web` (**contradicts 0006**) |
| New move | accounts in the API | second service | second datastore vendor |

## Recommendation

**Option A.** Accounts, API keys and billing are properties of the API request path, not of the
website: every job already authenticates with an API key and is counted against a plan inside the
Rust service. Keeping that logic in the same service and the same Postgres makes quota and
idempotency consistent with the job rows by construction, keeps one runtime, one deploy and one
Railway bill, and keeps `audiokit-web` a static site as 0006 intends. The cost — billing changes
ship with the API and the contract grows — is smaller than running and reconciling a second
service or a second datastore.

If the split is wanted later, Option B is the fallback, in Rust and from the same repo, and can
be extracted once the account tables and endpoints are stable. Option C should be rejected: it
reintroduces a second database and contradicts 0006.

On the payment vendor: **recommend Stripe** (the draft targets it, and its hosted Checkout,
customer portal and webhooks cover subscriptions and overages with little code). Stripe is a
**new vendor and needs Nate's approval**. If he does not approve it, the fallback is a
provider-agnostic adapter plus manual/ invoice-only billing, which is a smaller first release.

On the draft: keep `audiokit-web/backend/` as **reference only** — do not commit it. Port its
data model (accounts, keys, plans, usage, invoices, webhook events) and its vendor choices to
Option A; do not carry over the duplicate `jobs` table, which the existing job store already
covers.

## Open questions for Nate

1. **Approve Stripe?** It is a new vendor and the only paid dependency this adds.
2. **Overage model.** The pricing page promises Pro overages at $0.01/job. Confirm we build
   metered/usage-based billing, or simplify the first release to a hard Pro cap.
3. **Customer console.** A signed-in dashboard for keys, usage and billing is a UI question,
   not decided here; it can be a separate static app talking to the API.
4. **Draft disposition.** Confirm the untracked `backend/` is kept as reference and not committed.

`[AudioKit web agent]`
