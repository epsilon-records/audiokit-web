# Launch acceptance suite

Two on-demand suites for the AudioKit launch path.

**The read-only probe** (`probe.acceptance.mjs`) needs nothing: no account, email, key or
confirmation. It checks that the API, billing and the site answer, that protected routes and
unsigned webhooks refuse an anonymous caller, billing's CORS origins, the pricing page's release
claims (shared 0040, AudioKit 0052) and the anonymous rate limit. It creates, changes and deletes
nothing. Run it with `npm run test:acceptance:probe`, or the **Acceptance probe (read-only)**
workflow, which also runs on pull requests that touch this folder.

**The smoke suite** (`smoke.acceptance.mjs`) is described below. It runs against **production** with
**Stripe in test mode** and creates one throwaway account, which it deletes at the end
(through self-serve account deletion, which it also proves).

It is not part of `npm test` and no workflow runs it on push. Start it by hand.

## What it covers

| Step | Automated here | Where else |
| --- | --- | --- |
| Services answer | yes | |
| Signup by magic link, first API key shown once | yes (needs the link token) | |
| Free plan, limits and the 100 monthly credits | yes | |
| First analysis job, submitted to the AudioKit API: credits held, idempotent replay not recounted | yes | |
| One stems job | yes, opt-in (needs upload targets) | |
| Free credits hard stop | no: it spends the whole allowance | [checklist.md](checklist.md) section 2 |
| Credit pack Checkout session is test mode | yes (stops the run if not) | paying it: checklist section 3 |
| Legacy Pro Checkout is refused | yes | |
| Webhook idempotency, failed payment, refund | no: need Stripe | checklist sections 4 to 8 |
| Customer portal session is test mode | yes | using it: checklist section 5 |
| Account deletion, then key and session rejected | yes | |

## Run it

Needs Node 20 or later, no installs.

```sh
# 1. Request the sign-in link. Nothing is created yet.
AUDIOKIT_ACCEPT_CONFIRM=production-test-mode \
AUDIOKIT_ACCEPT_EMAIL=you+aktest@example.com \
npm run test:acceptance

# 2. Open the email, copy the `token` query parameter from the sign-in link, then run the rest.
#    A fresh address is required: the link must create a new account.
AUDIOKIT_ACCEPT_CONFIRM=production-test-mode \
AUDIOKIT_ACCEPT_EMAIL=you+aktest@example.com \
AUDIOKIT_ACCEPT_MAGIC_TOKEN=<token> \
AUDIOKIT_ACCEPT_AUDIO_URL=<https URL of a clip of 30 s or less> \
npm run test:acceptance
```

The same two runs are available as the manual workflow **Acceptance (manual)** in GitHub Actions.

A synthetic 5 second clip is in `fixtures/tone.wav` (made by `make-fixture.mjs`, no third-party
audio). Once this folder is on `main`, its raw URL
`https://raw.githubusercontent.com/epsilon-records/audiokit-web/main/test/acceptance/fixtures/tone.wav`
works as `AUDIOKIT_ACCEPT_AUDIO_URL`.

## Environment variables

| Variable | Required | Meaning |
| --- | --- | --- |
| `AUDIOKIT_ACCEPT_CONFIRM` | yes | Must be `production-test-mode`. Your statement that Stripe is in test mode. |
| `AUDIOKIT_ACCEPT_EMAIL` | yes | A throwaway address you can read. Not used by any existing account. |
| `AUDIOKIT_ACCEPT_MAGIC_TOKEN` | for step 2 | The `token` parameter from the sign-in link. Single use, short lived. |
| `AUDIOKIT_ACCEPT_AUDIO_URL` | for step 2 | https URL of a clip of 30 s or less. Never use audio with personal data. |
| `AUDIOKIT_ACCEPT_STEMS` | no | `1` runs the single stems job. Stems cost compute money. Default: skipped. |
| `AUDIOKIT_ACCEPT_STEMS_OUTPUTS` | with `STEMS=1` | JSON object of upload targets for the four stems the API requires: `{"vocals":"https://…","drums":"https://…","bass":"https://…","other":"https://…"}`. Each value is a signed https PUT URL you control (an object `{"url":…,"headers":{…}}` is also accepted). Treat it as a secret: the suite never logs it. In the GitHub workflow it is read from the repository secret of the same name. |
| `AUDIOKIT_ACCEPT_BILLING_URL` | no | Default `https://billing.audiokit.ai`. |
| `AUDIOKIT_ACCEPT_API_URL` | no | Default `https://api.audiokit.ai`. |
| `AUDIOKIT_ACCEPT_EVIDENCE` | no | Evidence file. Default `acceptance-evidence.jsonl` (git-ignored). |
| `AUDIOKIT_ACCEPT_FULL_IDS` | no | `1` logs full ids. Default logs the first characters only. |

No API key or other credential is read or needed: the suite signs in as the throwaway account it
creates and uses the first API key that account is shown at signup. Nothing is stored.

## How jobs are submitted

Jobs go straight to the AudioKit API (`AUDIOKIT_ACCEPT_API_URL`), as a customer's do:
`POST /v1/jobs` with `Authorization: Bearer <the account's first API key>`. Billing's own
`POST /v1/jobs` was removed (epsilon-billing#74) and answers 404. The suite then reads the job with
the API's `GET /v1/jobs/{provider_job_id}`. It does not read it from billing: billing's job rows are
only the jobs that went through its old submit route, so a job submitted to the API is not there.
Billing is still where the suite reads credits and usage (`/v1/credits`, `/v1/usage/current`), which
is where a job's hold shows, and billing's `GET /v1/jobs?limit=1` is used after account deletion.

How the suite treats the API's answers:

| Answer | Treated as |
| --- | --- |
| `202`, job `queued` | Accepted: billing held the credits. |
| `202`, job `awaiting_credit` | Accepted, billing has not answered yet. The suite polls the job until it leaves `awaiting_credit`. It fails if the job becomes `refused` (the `error.code` is in the failure), or is still waiting after 2 minutes. |
| `200` on a repeated `job_id` | An idempotent replay: the same job, credits not held again. |
| `402 insufficient_credits` or `no_active_plan` | A failure, with the code in the message. Nothing was queued. A new Free account holds 100 credits, so this is a real finding. |
| `401`, `429`, `503` (for example `entitlement_unavailable`) | Retried up to 6 times, waiting `Retry-After` (at most 30 s). A `401` just after signup can be the new key not having reached the API yet. |
| Job ends `succeeded` | Pass. `failed`, `canceled` and `refused` fail the step. |

The input's `sha256`, which the API requires, is computed by downloading `AUDIOKIT_ACCEPT_AUDIO_URL`
(50 MiB at most) before the first submit.

## Safety rules the suite enforces

- It refuses to start without the confirmation phrase.
- Before any billing step it requires a `cs_test_` Checkout session on a Stripe URL and a
  `/p/session/test_` portal session. Any live-mode id (`*_live_*`) or `livemode: true` in a
  response stops the run immediately with exit code 3 and touches nothing more, not even
  cleanup. Stripe's mode is not otherwise visible to the suite, and signup creates a Stripe
  customer best effort, so confirm the Stripe dashboard is in test mode before step 1.
- It submits one analysis job (and one replay of it, which is not a new job) and, only on request,
  one stems job.
- It deletes the account it created in the last step, and again in a cleanup hook if an
  earlier step failed.
- It never lists or touches any other account.

## Evidence

Each step appends one JSON line with a timestamp, the HTTP status, a shortened account id and
the Stripe test-mode object prefix. Attach the file to the run report. It holds no tokens or keys
(only the first characters of the key) and masks the address.
