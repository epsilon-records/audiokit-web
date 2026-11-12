// On-demand launch acceptance smoke suite. It runs against PRODUCTION with Stripe in TEST mode.
// It is never part of `npm test` or CI on push: run it with `npm run test:acceptance`.
// Read README.md in this folder first: it lists the environment variables and the safety rules.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  LiveModeError,
  assertCheckoutIsTestMode,
  assertNotLive,
  assertPortalIsTestMode,
  call,
  makeEvidence,
  readConfig,
  redactEmail,
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

step("account starts on Free with the documented limits", async () => {
  const me = await billing("/v1/auth/me", { headers: bearer(s.session) });
  assert.equal(me.status, 200);
  const sub = await billing("/v1/subscriptions/current", { headers: bearer(s.session) });
  assert.equal(sub.status, 200);
  const quota = await billing("/v1/usage/quota", { headers: bearer(s.session) });
  assert.equal(quota.status, 200);
  const q = quota.body.quota ?? quota.body;
  assert.equal(q.tier, "free");
  assert.equal(q.limit, 100, "Free allows 100 jobs a month");
  evidence({ step: "free-limits", me: me.status, subscription: sub.status, quota: q });
  const keys = await billing("/v1/api-keys", { headers: bearer(s.session) });
  assert.equal(keys.status, 200);
  assert.ok(JSON.stringify(keys.body).includes(String(s.apiKey).slice(0, 7)), "the first key is listed by prefix");
  assert.ok(!JSON.stringify(keys.body).includes(s.apiKey), "the full key is never listed again");
});

async function pollJob(providerJobId, { timeoutMs }) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const r = await billing(`/v1/jobs/${providerJobId}`, { headers: bearer(s.apiKey) });
    assert.equal(r.status, 200, `job status answered ${r.status}`);
    const job = r.body.job ?? r.body;
    if (["succeeded", "failed", "canceled"].includes(job.status)) return job;
    if (Date.now() > until) return job;
    await sleep(3000);
  }
}

async function submit(jobId, operation, params) {
  return billing("/v1/jobs", {
    method: "POST",
    headers: bearer(s.apiKey),
    body: { job_id: jobId, operation, input: { url: cfg.audioUrl }, ...(params ? { params } : {}) },
  });
}

step("first analysis job: accepted, counted once, finishes, replay is not recounted", async () => {
  const jobId = `acceptance-analyze-${Date.now()}`;
  const r = await submit(jobId, "analyze");
  assert.equal(r.status, 202, `submit answered ${r.status}: ${r.text.slice(0, 200)}`);
  const job = r.body.job ?? r.body;
  s.jobIds.push(job.provider_job_id);
  const after1 = await billing("/v1/usage/quota", { headers: bearer(s.session) });
  const used1 = (after1.body.quota ?? after1.body).usage;
  const replay = await submit(jobId, "analyze");
  assert.equal(replay.status, 200, "an idempotent replay answers 200");
  assert.equal((replay.body.job ?? replay.body).provider_job_id, job.provider_job_id);
  const after2 = await billing("/v1/usage/quota", { headers: bearer(s.session) });
  const used2 = (after2.body.quota ?? after2.body).usage;
  assert.equal(used2, used1, "a replay must not be counted again");
  const done = await pollJob(job.provider_job_id, { timeoutMs: 180_000 });
  const credits = await billing("/v1/credits", { headers: bearer(s.session) });
  evidence({ step: "analysis-job-credits", status: credits.status, balance_after: (credits.body?.credits ?? credits.body)?.balance, note: "0052: analyze costs 3 credits once the debit ships" });
  evidence({ step: "analysis-job", submit: r.status, replay: replay.status, provider_job_id: shorten(job.provider_job_id, cfg), used_after_submit: used1, final_status: done.status });
  assert.equal(done.status, "succeeded", `the analysis job ended ${done.status}`);
});

step("one stems job (opt-in): checked against the plan, finishes, cost logged if visible", async (t) => {
  if (!cfg.stems) return t.skip("set AUDIOKIT_ACCEPT_STEMS=1 to run the single paid-compute stems job");
  const jobId = `acceptance-stems-${Date.now()}`;
  const r = await submit(jobId, "stems");
  assert.equal(r.status, 202, `submit answered ${r.status}: ${r.text.slice(0, 200)}`);
  const job = r.body.job ?? r.body;
  s.jobIds.push(job.provider_job_id);
  const done = await pollJob(job.provider_job_id, { timeoutMs: 600_000 });
  const cost = Object.fromEntries(Object.entries(done).filter(([k]) => /cost|gpu|seconds|duration/i.test(k)));
  evidence({ step: "stems-job", submit: r.status, provider_job_id: shorten(job.provider_job_id, cfg), final_status: done.status, visible_cost_fields: cost });
  assert.equal(done.status, "succeeded", `the stems job ended ${done.status}`);
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
