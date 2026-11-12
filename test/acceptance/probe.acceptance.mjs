// Read-only launch probe. It needs no account, no email, no key and no confirmation phrase:
// it reads public endpoints and checks that protected ones refuse an anonymous caller.
// It never creates, changes or deletes anything. Run it with `npm run test:acceptance:probe`.
//
// What it sends that is not a GET: unauthenticated POSTs that the services must refuse
// (job submit, checkout, admin, an unsigned Stripe or AudioKit webhook, a bogus magic-link
// token). None of them carries a credential, so none can change state. The anonymous
// rate-limit check sends at most 15 GETs to /v1/capabilities.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { call, headerSummary, makeEvidence, pricingFindings, sleep } from "./lib.mjs";

const trim = (v) => (v ?? "").trim();
const cfg = {
  apiUrl: trim(process.env.AUDIOKIT_ACCEPT_API_URL) || "https://api.audiokit.ai",
  billingUrl: trim(process.env.AUDIOKIT_ACCEPT_BILLING_URL) || "https://billing.audiokit.ai",
  siteUrl: trim(process.env.AUDIOKIT_ACCEPT_SITE_URL) || "https://audiokit.ai",
  oldConsoleUrl: trim(process.env.AUDIOKIT_ACCEPT_OLD_CONSOLE_URL) || "https://console.audiokit.ai",
  evidencePath: trim(process.env.AUDIOKIT_ACCEPT_EVIDENCE) || "acceptance-probe-evidence.jsonl",
  skipRateLimit: trim(process.env.AUDIOKIT_ACCEPT_SKIP_RATE_LIMIT) === "1",
};
const evidence = makeEvidence(cfg.evidencePath);
const api = (p, o) => call(cfg.apiUrl, p, o);
const billing = (p, o) => call(cfg.billingUrl, p, o);
const BOGUS = { authorization: "Bearer ak_acceptance_probe_not_a_real_key" };
const results = [];

function step(name, fn) {
  test(name, async () => {
    try {
      const detail = await fn();
      evidence({ step: name, result: "pass", ...(detail ?? {}) });
      results.push([name, "pass"]);
    } catch (err) {
      evidence({ step: name, result: "fail", detail: String(err.message).split("\n")[0] });
      results.push([name, "fail"]);
      throw err;
    }
  });
}

async function page(base, path) {
  const started = Date.now();
  const res = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers, location: res.headers.get("location"), ms: Date.now() - started };
}

const refused = (s) => s === 401 || s === 403;

after(() => {
  const failed = results.filter(([, r]) => r === "fail").map(([n]) => n);
  evidence({ step: "summary", result: failed.length ? "fail" : "pass", passed: results.length - failed.length, failed });
});

step("API health answers ok", async () => {
  const r = await api("/v1/health");
  assert.equal(r.status, 200);
  assert.equal(r.body?.status, "ok");
  return { status: r.status, version: r.body?.version, ms: r.ms };
});

step("API capabilities list the operations", async () => {
  const r = await api("/v1/capabilities");
  assert.equal(r.status, 200);
  const ops = (r.body?.operations ?? []).map((o) => (typeof o === "string" ? o : o.name ?? o.operation)).filter(Boolean).sort();
  assert.ok(ops.includes("analyze"), "analyze is advertised");
  return { status: r.status, operations: ops, stems: ops.includes("stems"), tags: ops.includes("tags") };
});

step("API serves its OpenAPI contract", async () => {
  const r = await page(cfg.apiUrl, "/v1/openapi.yaml");
  assert.equal(r.status, 200);
  assert.match(r.text, /^openapi:\s*3\./m);
  assert.match(r.text, /\/v1\/jobs:/);
  const version = r.text.match(/^\s+version:\s*["']?([^"'\s]+)/m)?.[1];
  return { status: r.status, bytes: r.text.length, contract_version: version };
});

step("billing health and readiness", async () => {
  const h = await billing("/health");
  const ready = await billing("/ready");
  assert.equal(h.status, 200);
  assert.equal(ready.status, 200);
  return { health: h.status, ready: ready.status, ms: [h.ms, ready.ms] };
});

step("API refuses anonymous and unknown-key job calls", async () => {
  const body = { job_id: "acceptance-probe", operation: "probe", input: { url: "https://example.com/a.wav" } };
  const none = await api("/v1/jobs", { method: "POST", body });
  const bogus = await api("/v1/jobs", { method: "POST", headers: BOGUS, body });
  const status = await api("/v1/jobs/00000000-0000-0000-0000-000000000000", { headers: BOGUS });
  const admin = await api("/v1/admin/clients", { method: "POST", body: { client_id: "probe" } });
  for (const [n, r] of Object.entries({ none, bogus, status, admin })) assert.ok(refused(r.status), `${n} answered ${r.status}`);
  return { submit_no_auth: none.status, submit_bogus_key: bogus.status, status_bogus_key: status.status, admin_no_auth: admin.status, error: none.body?.error ?? none.body?.code };
});

step("billing refuses anonymous account, credits, key and admin calls", async () => {
  const out = {
    me: (await billing("/v1/auth/me")).status,
    credits: (await billing("/v1/credits")).status,
    credits_checkout: (await billing("/v1/credits/checkout", { method: "POST", body: { pack: "credits_1000" } })).status,
    api_keys: (await billing("/v1/api-keys")).status,
    quota: (await billing("/v1/usage/quota")).status,
    portal: (await billing("/v1/subscriptions/portal", { method: "POST", body: {} })).status,
    account_deletion: (await billing("/v1/account/deletion", { method: "POST", body: { confirm_email: "nobody@example.com" } })).status,
    jobs_bogus_key: (await billing("/v1/jobs?limit=1", { headers: BOGUS })).status,
    admin_label_clients: (await billing("/v1/admin/label-clients")).status,
    internal: (await billing("/v1/internal/job-entitlements", { method: "POST", body: {} })).status,
  };
  for (const [n, s] of Object.entries(out)) assert.ok(refused(s), `${n} answered ${s}`);
  return out;
});

step("billing refuses a bogus magic-link token without sending anything", async () => {
  const r = await billing("/v1/auth/magic-link/exchange", { method: "POST", body: { token: "acceptance-probe-not-a-token" } });
  assert.ok([400, 401, 410].includes(r.status), `exchange answered ${r.status}`);
  return { status: r.status, error: r.body?.error };
});

step("unsigned webhooks are refused and change nothing", async () => {
  const stripe = await billing("/webhooks/stripe", { method: "POST", body: { id: "evt_test_probe", type: "checkout.session.completed" } });
  const ak = await billing("/webhooks/audiokit", { method: "POST", body: { type: "job.succeeded" } });
  assert.ok([400, 401].includes(stripe.status), `stripe webhook answered ${stripe.status}`);
  assert.ok([400, 401, 403].includes(ak.status), `audiokit webhook answered ${ak.status}`);
  return { stripe_unsigned: stripe.status, audiokit_unsigned: ak.status };
});

step("billing CORS allows audiokit.ai and refuses other origins", async () => {
  const pre = async (origin) => {
    const res = await fetch(cfg.billingUrl + "/v1/auth/me", {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "GET", "access-control-request-headers": "authorization" },
      signal: AbortSignal.timeout(30_000),
    });
    await res.text();
    return {
      status: res.status,
      allow_origin: res.headers.get("access-control-allow-origin"),
      allow_headers: res.headers.get("access-control-allow-headers"),
    };
  };
  const site = await pre(cfg.siteUrl);
  const old = await pre(cfg.oldConsoleUrl);
  const other = await pre("https://acceptance-probe.example");
  assert.notEqual(other.allow_origin, "*");
  assert.notEqual(other.allow_origin, "https://acceptance-probe.example");
  // 0053: billing's allowed origins move to audiokit.ai before the console host goes.
  assert.equal(site.allow_origin, cfg.siteUrl, "audiokit.ai must be an allowed origin (decision 0053)");
  assert.ok(site.status >= 200 && site.status < 300, `audiokit.ai preflight answered ${site.status}; a browser needs 2xx`);
  assert.ok(
    (site.allow_headers ?? "").toLowerCase().split(",").map((h) => h.trim()).some((h) => h === "authorization" || h === "*"),
    `audiokit.ai preflight does not allow the authorization header (got ${site.allow_headers})`,
  );
  return { site, old_console: old, other };
});

step("public site pages answer, with security headers", async () => {
  const out = {};
  for (const p of ["/", "/pricing/", "/docs/"]) {
    const r = await page(cfg.siteUrl, p);
    out[p] = { status: r.status, location: r.location, ...headerSummary(r.headers) };
  }
  for (const [p, r] of Object.entries(out)) {
    assert.equal(r.status, 200, `${p} answered ${r.status}`);
    assert.equal(r.hsts, true, `${p} has no Strict-Transport-Security`);
    assert.equal(r.csp, true, `${p} has no Content-Security-Policy`);
    assert.equal(r.x_content_type_options, "nosniff", `${p} X-Content-Type-Options is ${r.x_content_type_options}, not nosniff`);
    assert.equal(r.frame_protection, true, `${p} has neither X-Frame-Options nor a frame-ancestors policy`);
  }
  return { pages: out };
});

step("pricing page: no $99 Pro, no uptime SLA, credits shown (shared 0040, AudioKit 0052)", async () => {
  const r = await page(cfg.siteUrl, "/pricing/");
  const f = pricingFindings(r.text);
  evidence({ step: "pricing-findings", result: "info", ...f });
  assert.equal(f.uptime_sla_claim, false, "the 99.9% uptime SLA claim must come off the pricing page (shared 0040)");
  assert.equal(f.sells_pro_99, false, "the page still sells Pro at $99 (superseded by credits, 0052)");
  assert.equal(f.mentions_credits, true, "the page does not mention prepaid credits (0052)");
  return f;
});

step("old console host state is recorded (0053: removed once the new app is live)", async () => {
  let r;
  try {
    r = await page(cfg.oldConsoleUrl, "/login");
  } catch (e) {
    return { reachable: false, error: String(e.message).slice(0, 80) };
  }
  return { reachable: true, status: r.status, location: r.location };
});

step("anonymous rate limit: a burst on capabilities is answered 429 with Retry-After", async () => {
  if (cfg.skipRateLimit) return { skipped: true };
  await sleep(6000); // let earlier probes' tokens refill
  const statuses = [];
  let limited = null;
  for (let i = 0; i < 15; i += 1) {
    const res = await fetch(cfg.apiUrl + "/v1/capabilities", { signal: AbortSignal.timeout(30_000) });
    const text = await res.text();
    statuses.push(res.status);
    if (res.status === 429) {
      let body = null;
      try { body = JSON.parse(text); } catch { /* not JSON */ }
      limited = { at_request: i + 1, retry_after: res.headers.get("retry-after"), error: body?.error ?? body?.code };
      break;
    }
  }
  assert.ok(limited, `no 429 within 15 requests: ${statuses.join(",")}`);
  assert.ok(limited.retry_after, "a 429 must carry Retry-After");
  await sleep(Number(limited.retry_after || 5) * 1000 + 1000);
  const after = await api("/v1/capabilities");
  assert.equal(after.status, 200, "capabilities recover after Retry-After");
  return { statuses, ...limited, recovered: after.status };
});
