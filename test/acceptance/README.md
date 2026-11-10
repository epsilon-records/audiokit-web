# Launch acceptance suite

An on-demand smoke suite for the AudioKit launch path. It runs against **production** with
**Stripe in test mode** and creates one throwaway account, which it deletes at the end
(through self-serve account deletion, which it also proves).

It is not part of `npm test` and no workflow runs it on push. Start it by hand.

## What it covers

| Step | Automated here | Where else |
| --- | --- | --- |
| Services answer | yes | |
| Signup by magic link, first API key shown once | yes (needs the link token) | |
| Free plan and limits | yes | |
| First analysis job, idempotent replay not recounted | yes | |
| One stems job | yes, opt-in | |
| Free quota hard stop | no: it takes 100 jobs or 10 stems | [checklist.md](checklist.md) section 2 |
| Pro Checkout session is test mode | yes (stops the run if not) | paying it: checklist section 3 |
| Webhook idempotency, cancel, failed payment, refund | no: need Stripe | checklist sections 4 to 8 |
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
| `AUDIOKIT_ACCEPT_BILLING_URL` | no | Default `https://billing.audiokit.ai`. |
| `AUDIOKIT_ACCEPT_API_URL` | no | Default `https://api.audiokit.ai`. |
| `AUDIOKIT_ACCEPT_EVIDENCE` | no | Evidence file. Default `acceptance-evidence.jsonl` (git-ignored). |
| `AUDIOKIT_ACCEPT_FULL_IDS` | no | `1` logs full ids. Default logs the first characters only. |

No credential is read or needed: the suite signs in as the throwaway account it creates.

## Safety rules the suite enforces

- It refuses to start without the confirmation phrase.
- Before any billing step it requires a `cs_test_` Checkout session on a Stripe URL and a
  `/p/session/test_` portal session. Any live-mode id (`*_live_*`) or `livemode: true` in a
  response stops the run immediately with exit code 3 and touches nothing more, not even
  cleanup. Stripe's mode is not otherwise visible to the suite, and signup creates a Stripe
  customer best effort, so confirm the Stripe dashboard is in test mode before step 1.
- It submits at most two analysis jobs and, only on request, one stems job.
- It deletes the account it created in the last step, and again in a cleanup hook if an
  earlier step failed.
- It never lists or touches any other account.

## Evidence

Each step appends one JSON line with a timestamp, the HTTP status, a shortened account id and
the Stripe test-mode object prefix. Attach the file to the run report. It holds no tokens or keys
(only the first characters of the key) and masks the address.
