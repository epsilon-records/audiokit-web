// On-demand launch acceptance smoke suite. It runs against PRODUCTION with Stripe in TEST mode.
// It is never part of `npm test` or CI on push: run it with `npm run test:acceptance`.
// Read README.md in this folder first: it lists the environment variables and the safety rules.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  JOB_FINAL,
  LiveModeError,
  assertCheckoutIsTestMode,
  assertNotLive,
  assertPortalIsTestMode,
  call,
  classifySubmit,
  makeEvidence,
  parseStemsOutputs,
  readConfig,
  redactEmail,
  sha256OfUrl,
  shorten,
  sleep,
  validateConfig,
} from "./lib.mjs";

const cfg = readConfig();
const problems = validateConfig(cfg);
if (problems.length) {
  console.error("Acceptance suite not started:\n- " + problems.join("\n- "));
  process.exit(2);
}

const evidence = makeEvidence(cfg.evidencePath);
// Shared state across the ordered steps.
const s = { stop: null, session: null, userId: null, apiKey: null, deleted: false, jobIds: [] };
const bearer = (token) => ({ authorization: `Bearer ${token}` });
const billing = (path, opts) => call(cfg.billingUrl, path, opts);
const api = (path, opts) => call(cfg.apiUrl, path, opts);
const who = () => ({ account: s.userId ? shorten(s.userId, cfg) : null });

/** Runs one step: skipped after a stop, and a live-mode finding stops the whole run. */
function step(name, fn) {
  test(name, async (t) => {
    if (s.stop) return t.skip(s.stop);
    let skipped = false;
    const tc = { skip: (m) => { skipped = true; return t.skip(m); } };
    try {
      await fn(tc);
    } catch (err) {
      if (err instanceof LiveModeError) {
        s.stop = `STOPPED: ${err.message}`;
        evidence({ step: name, result: "STOP_LIVE_MODE", detail: err.message });
        console.error(`\nSTOP: ${err.message}\nNothing further was touched. Tell the orchestrator.`);
        process.exitCode = 3;
      } else {
        evidence({ step: name, result: "fail", detail: String(err.message).split("\n")[0] });
      }
      throw err;
    }
    if (!skipped) evidence({ step: name, result: "pass", ...who() });
  });
}

before(() => {
  evidence({ step: "start", result: "info", billing: cfg.billingUrl, api: cfg.apiUrl, email: redactEmail(cfg.email), phase: cfg.magicToken ? "run" : "request-link" });
});

// Safety net: an account this run created is always deleted, unless the run stopped on live mode.
after(async () => {
  if (s.session && !s.deleted && !String(s.stop ?? "").includes("live")) {
    const r = await billing("/v1/account/deletion", {
      method: "POST",
      headers: bearer(s.session),
      body: { confirm_email: cfg.email },
    }).catch((e) => ({ status: 0, text: String(e) }));
    evidence({ step: "cleanup-delete-account", result: r.status === 204 ? "pass" : "FAIL", status: r.status, ...who() });
    if (r.status !== 204) process.exitCode = 1;
  }
});

step("services are up", async () => {
  const ready = await billing("/ready");
  assert.equal(ready.status, 200);
  const health = await api("/v1/health");
  assert.equal(health.status, 200);
  evidence({ step: "services", billing_ready: ready.status, api_health: health.status, ms: [ready.ms, health.ms] });
});

step("signup: magic link request answers 202 and reveals nothing", async (t) => {
  if (cfg.magicToken) return t.skip("a token was supplied; the link was requested earlier");
  const r = await billing("/v1/auth/magic-link", {
    method: "POST",
    body: { email: cfg.email, signup_source: { landing_path: "/acceptance" } },
  });
  assert.equal(r.status, 202);
  assert.equal(r.body?.sent, true);
  assert.ok(!JSON.stringify(r.body).match(/token/i), "the response must not carry the token");
  evidence({ step: "magic-link-request", status: r.status, expires_at: r.body?.expires_at });
  console.log(
    "\nLink requested. Open the email, copy the `token` query parameter from the sign-in link, then re-run with\n" +
      "AUDIOKIT_ACCEPT_MAGIC_TOKEN=<token> AUDIOKIT_ACCEPT_AUDIO_URL=<https clip> (same email). Tokens expire.\n",
  );
  s.stop = "waiting for the magic-link token";
});

step("signup: exchanging the link creates the account and reveals the first key once", async () => {
  const r = await billing("/v1/auth/magic-link/exchange", { method: "POST", body: { token: cfg.magicToken } });
  assert.equal(r.status, 200, `exchange answered ${r.status}`);
  assert.equal(r.body.created, true, "the link should have created a new account (use a fresh address)");
  assert.equal(String(r.body.user.email).toLowerCase(), cfg.email);
  assert.ok(r.body.token && r.body.api_key, "a session and a first API key are expected");
  s.session = r.body.token;
  s.apiKey = r.body.api_key;
  s.userId = r.body.user.id;
  evidence({ step: "exchange", status: r.status, account: shorten(s.userId, cfg), key_prefix: String(s.apiKey).slice(0, 7) });
  const again = await billing("/v1/auth/magic-link/exchange", { method: "POST", body: { token: cfg.magicToken } });
  assert.ok([401, 410].includes(again.status), `a second use of the link answered ${again.status}`);
  evidence({ step: "exchange-single-use", status: again.status });
});

// Billing is switching from quotas to prepaid credits (EPSILON-157, epsilon-billing#59). Until it
// deploys, Free is a 100-job quota read at /v1/usage/quota. Once it deploys that route answers 404
// and Free is 100 credits a calendar month (decision 0052). These steps pass against either.
// /v1/subscriptions/current and /v1/usage/current answer in both (billing's
// test/legacy-console.db.test.ts pins them), so the steps lean on those first.
step("account starts on Free with the documented allowance", async () => {
  const me = await billing("/v1/auth/me", { headers: bearer(s.session) });
  assert.equal(me.status, 200);
  const sub = await billing("/v1/subscriptions/current", { headers: bearer(s.session) });
  assert.equal(sub.status, 200);
  assert.equal((sub.body.subscription ?? sub.body).tier, "free", "a new account is on Free");
  const quota = await billing("/v1/usage/quota", { headers: bearer(s.session) });
  if (quota.status === 200) {
    // Quota billing, before epsilon-billing#59.
    const q = quota.body.quota ?? quota.body;
    assert.equal(q.tier, "free");
    assert.equal(q.limit, 100, "Free allows 100 jobs a month");
    evidence({ step: "free-limits", billing: "quota", me: me.status, subscription: sub.status, quota: q });
  } else {
    // Credits billing: the quota route is gone and Free is the monthly credit allowance.
    assert.equal(quota.status, 404, `/v1/usage/quota answered ${quota.status}; expected 200 (quota) or 404 (credits)`);
    const credits = await billing("/v1/credits", { headers: bearer(s.session) });
    assert.equal(credits.status, 200, `credits answered ${credits.status}: ${credits.text.slice(0, 200)}`);
    const balance = (credits.body.credits ?? credits.body).balance;
    assert.equal(balance, 100, "a new Free account holds the month's 100 credits (decision 0052)");
    evidence({ step: "free-limits", billing: "credits", me: me.status, subscription: sub.status, quota: quota.status, balance });
  }
  const keys = await billing("/v1/api-keys", { headers: bearer(s.session) });
  assert.equal(keys.status, 200);
  assert.ok(JSON.stringify(keys.body).includes(String(s.apiKey).slice(0, 7)), "the first key is listed by prefix");
  assert.ok(!JSON.stringify(keys.body).includes(s.apiKey), "the full key is never listed again");
});

// Jobs are submitted to, read from and canceled on the AudioKit API, with the account's first API key.
// Billing's POST /v1/jobs is gone (epsilon-billing#74), and its job rows are only the jobs that went
// through it before then: a job submitted to the API is not found there. Billing is still read for
// credits and usage, which is where a job's hold shows.
async function getJob(providerJobId) {
  const r = await api(`/v1/jobs/${providerJobId}`, { headers: bearer(s.apiKey) });
  assert.equal(r.status, 200, `job status answered ${r.status}: ${r.text.slice(0, 200)}`);
  return r.body.job ?? r.body;
}

/** Polls until the job reaches a final state (succeeded, failed, canceled or refused) or time runs out. */
async function pollJob(providerJobId, { timeoutMs }) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const job = await getJob(providerJobId);
    if (JOB_FINAL.has(job.status)) return job;
    if (Date.now() > until) return job;
    await sleep(3000);
  }
}

/**
 * A job answers `awaiting_credit` while billing has not yet held its credits: it then becomes
 * `queued` (held) or `refused`. Waits for that, and fails on `refused` with the reason the API gave.
 */
async function settleCredit(job, { timeoutMs = 120_000 } = {}) {
  const until = Date.now() + timeoutMs;
  let cur = job;
  while (cur.status === "awaiting_credit" && Date.now() < until) {
    await sleep(2000);
    cur = await getJob(job.provider_job_id);
  }
  assert.notEqual(cur.status, "awaiting_credit", "billing did not answer for the job's credits in time (still awaiting_credit)");
  assert.notEqual(cur.status, "refused", `the job was refused after it was accepted: ${cur.error?.code ?? "no code"} (${cur.error?.message ?? ""})`);
  return cur;
}

let audioSha256 = null;

/**
 * POST /v1/jobs on the AudioKit API. Retries what the API says to retry: 401 (billing syncs a new key
 * to the API shortly after signup), 429 and 503 (`Retry-After`). Returns the last answer.
 */
async function submit(jobId, operation, { params, outputs } = {}) {
  audioSha256 ??= await sha256OfUrl(cfg.audioUrl);
  const body = { job_id: jobId, operation, input: { url: cfg.audioUrl, sha256: audioSha256 }, ...(params ? { params } : {}), ...(outputs ? { outputs } : {}) };
  let r;
  for (let attempt = 1; attempt <= 6; attempt++) {
    r = await api("/v1/jobs", { method: "POST", headers: bearer(s.apiKey), body });
    const verdict = classifySubmit(r);
    if (verdict.kind !== "retry" || attempt === 6) return r;
    evidence({ step: "submit-retry", operation, status: r.status, code: verdict.code, wait_s: verdict.wait_s, attempt });
    await sleep(verdict.wait_s * 1000);
  }
  return r;
}

/** Asserts a submit was accepted (202), naming a refusal (402) or any other answer in the failure. */
function assertAccepted(r, what) {
  const verdict = classifySubmit(r);
  if (verdict.kind === "refused") {
    assert.fail(`${what} was refused with 402 ${verdict.code}: nothing was queued. A new Free account holds 100 credits, so check the credit hold and the account's plan (message: ${r.body?.error?.message ?? ""})`);
  }
  assert.equal(r.status, 202, `${what}: submit answered ${r.status}: ${r.text.slice(0, 200)}`);
  const job = r.body.job ?? r.body;
  assert.ok(["queued", "awaiting_credit"].includes(job.status), `${what}: a new job should be queued or awaiting_credit, got ${job.status}`);
  return job;
}

step("first analysis job: accepted, counted once, finishes, replay is not recounted", async () => {
  const jobId = `acceptance-analyze-${Date.now()}`;
  // Jobs counted and credits held, read from billing (the console's views).
  const counted = async () => {
    const usage = await billing("/v1/usage/current", { headers: bearer(s.session) });
    assert.equal(usage.status, 200, `usage answered ${usage.status}`);
    const credits = await billing("/v1/credits", { headers: bearer(s.session) });
    assert.equal(credits.status, 200, `credits answered ${credits.status}`);
    return { jobs: (usage.body.usage ?? usage.body).jobCount, balance: (credits.body.credits ?? credits.body).balance };
  };
  const before = await counted();
  const r = await submit(jobId, "analyze");
  const accepted = assertAccepted(r, "the analysis job");
  s.jobIds.push(accepted.provider_job_id);
  // `awaiting_credit` means billing has not held the credits yet; wait for the hold before counting.
  const job = await settleCredit(accepted);
  const after1 = await counted();
  assert.ok(after1.jobs >= 1, "the accepted job is counted");
  assert.ok(after1.balance < before.balance, `the hold should take credits: balance ${before.balance} before, ${after1.balance} after`);
  const replay = await submit(jobId, "analyze");
  assert.equal(replay.status, 200, `an idempotent replay answers 200, got ${replay.status}`);
  assert.equal((replay.body.job ?? replay.body).provider_job_id, job.provider_job_id);
  const after2 = await counted();
  assert.equal(after2.jobs, after1.jobs, "a replay must not be counted again");
  assert.equal(after2.balance, after1.balance, "a replay must not be charged again");
  const done = await pollJob(job.provider_job_id, { timeoutMs: 180_000 });
  const credits = await billing("/v1/credits", { headers: bearer(s.session) });
  evidence({ step: "analysis-job-credits", status: credits.status, balance_before: before.balance, balance_after_hold: after1.balance, balance_after: (credits.body?.credits ?? credits.body)?.balance, note: "0052: analyze costs 3 credits" });
  evidence({
    step: "analysis-job",
    submit: r.status,
    first_status: accepted.status,
    replay: replay.status,
    provider_job_id: shorten(job.provider_job_id, cfg),
    used_after_submit: after1.jobs,
    final_status: done.status,
    error_code: done.error?.code,
  });
  assert.equal(done.status, "succeeded", `the analysis job ended ${done.status}${done.error?.code ? ` (${done.error.code})` : ""}`);
});

step("one stems job (opt-in): checked against the plan, finishes, cost logged if visible", async (t) => {
  if (!cfg.stems) return t.skip("set AUDIOKIT_ACCEPT_STEMS=1 (and AUDIOKIT_ACCEPT_STEMS_OUTPUTS) to run the single paid-compute stems job");
  const jobId = `acceptance-stems-${Date.now()}`;
  const r = await submit(jobId, "stems", { outputs: parseStemsOutputs(cfg.stemsOutputs) });
  const accepted = assertAccepted(r, "the stems job");
  s.jobIds.push(accepted.provider_job_id);
  const job = await settleCredit(accepted);
  const done = await pollJob(job.provider_job_id, { timeoutMs: 600_000 });
  const cost = Object.fromEntries(Object.entries(done).filter(([k]) => /cost|gpu|seconds|duration/i.test(k)));
  evidence({ step: "stems-job", submit: r.status, first_status: accepted.status, provider_job_id: shorten(job.provider_job_id, cfg), final_status: done.status, error_code: done.error?.code, visible_cost_fields: cost });
  assert.equal(done.status, "succeeded", `the stems job ended ${done.status}${done.error?.code ? ` (${done.error.code})` : ""}`);
});

step("credits: a Free account holds the monthly 100 credits (decision 0052)", async () => {
  const r = await billing("/v1/credits", { headers: bearer(s.session) });
  assert.equal(r.status, 200, `credits answered ${r.status}: ${r.text.slice(0, 200)}`);
  assertNotLive(r.body, "credits");
  const c = r.body.credits ?? r.body;
  const packs = (c.packs ?? []).map((p) => `${p.pack}:${p.credits}/${p.price_cents}`);
  evidence({ step: "credits-balance", status: r.status, balance: c.balance, lots: (c.lots ?? []).map((l) => `${l.source}:${l.remaining}`), recent: (c.entries ?? []).slice(0, 5).map((e) => `${e.kind}:${e.credits}`), packs_on_sale: packs });
  assert.ok(Number.isFinite(c.balance), "a balance is reported");
  assert.deepEqual(packs.sort(), ["credits_1000:1000/1000", "credits_24000:24000/20000", "credits_5500:5500/5000"], "the three packs of decision 0052 are on sale");
});

step("credits Checkout: the $10 pack session is Stripe test mode (stops the run if not)", async () => {
  const r = await billing("/v1/credits/checkout", { method: "POST", headers: bearer(s.session), body: { pack: "credits_1000" } });
  assert.equal(r.status, 200, `credits checkout answered ${r.status}: ${r.text.slice(0, 200)}`);
  const checkout = r.body.checkout ?? r.body;
  assertCheckoutIsTestMode(checkout);
  evidence({ step: "credits-checkout-session", status: r.status, pack: checkout.pack, session_id: shorten(checkout.session_id, cfg, 24), host: new URL(checkout.url).hostname, test_mode: true });
  console.log("\nCredits Checkout is test mode. Pay it by hand (checklist section 3), or the remaining billing steps stay manual.\n");
});

step("legacy Pro Checkout is retired (decision 0052 supersedes 0023)", async () => {
  const r = await billing("/v1/subscriptions/checkout", { method: "POST", headers: bearer(s.session), body: { interval: "month" } });
  if (r.status === 200) assertCheckoutIsTestMode(r.body.checkout ?? r.body);
  evidence({ step: "legacy-pro-checkout", status: r.status, error: r.body?.error });
  assert.ok(r.status >= 400 && r.status < 500, `Pro Checkout must be refused with a 4xx now that credits replace Pro; got ${r.status}`);
});

step("customer portal: the session is Stripe test mode", async () => {
  const r = await billing("/v1/subscriptions/portal", { method: "POST", headers: bearer(s.session) });
  assert.equal(r.status, 200, `portal answered ${r.status}: ${r.text.slice(0, 200)}`);
  const portal = r.body.portal ?? r.body;
  assertPortalIsTestMode(portal);
  evidence({ step: "portal-session", status: r.status, host: new URL(portal.url).hostname, test_mode: true });
});

step("deletion: a wrong confirmation changes nothing", async () => {
  const r = await billing("/v1/account/deletion", { method: "POST", headers: bearer(s.session), body: { confirm_email: "someone-else@example.com" } });
  assert.equal(r.status, 400);
  evidence({ step: "deletion-wrong-confirmation", status: r.status, error: r.body?.error });
  const me = await billing("/v1/auth/me", { headers: bearer(s.session) });
  assert.equal(me.status, 200, "the account must still exist");
});

step("deletion: erases the account, then its key and session are rejected", async () => {
  const del = await billing("/v1/account/deletion", { method: "POST", headers: bearer(s.session), body: { confirm_email: cfg.email } });
  assert.equal(del.status, 204, `deletion answered ${del.status}: ${del.text.slice(0, 200)}`);
  s.deleted = true;
  const repeat = await billing("/v1/account/deletion", { method: "POST", headers: bearer(s.session), body: { confirm_email: cfg.email } });
  // The session may already be rejected, or the repeat answers 204: both prove it is gone.
  assert.ok([204, 401].includes(repeat.status), `a repeat answered ${repeat.status}`);
  const me = await billing("/v1/auth/me", { headers: bearer(s.session) });
  const billingKey = await billing("/v1/jobs?limit=1", { headers: bearer(s.apiKey) });
  const apiKey = s.jobIds.length ? await api(`/v1/jobs/${s.jobIds[0]}`, { headers: bearer(s.apiKey) }) : await api("/v1/jobs/none", { headers: bearer(s.apiKey) });
  evidence({
    step: "deletion-proof",
    delete: del.status,
    repeat: repeat.status,
    session_after: me.status,
    billing_key_after: billingKey.status,
    api_key_after: apiKey.status,
    account: shorten(s.userId, cfg),
  });
  // The session token is stateless, so it may still verify; the account behind it is gone (404).
  assert.ok([401, 404].includes(me.status), `the session must be rejected or find no account, got ${me.status}`);
  assert.equal(billingKey.status, 401, "the key must be rejected by billing");
  assert.equal(apiKey.status, 401, "the key must be rejected by the API");
});

// Reached only if a step above threw before assertNotLive could see a response.
test("no live-mode id appeared in any recorded evidence", async (t) => {
  if (s.stop) return t.skip(s.stop);
  const { readFileSync } = await import("node:fs");
  assertNotLive(readFileSync(cfg.evidencePath, "utf8"), "evidence log");
});
