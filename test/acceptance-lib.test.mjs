// Offline checks of the acceptance suite's guards. Runs in `npm test`; touches no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CONFIRM_PHRASE,
  JOB_FINAL,
  LiveModeError,
  classifySubmit,
  parseStemsOutputs,
  assertCheckoutIsTestMode,
  assertNotLive,
  assertPortalIsTestMode,
  readConfig,
  redactEmail,
  shorten,
  validateConfig,
  pricingFindings,
} from "./acceptance/lib.mjs";
import { makeToneWav } from "./acceptance/make-fixture.mjs";

const ok = { AUDIOKIT_ACCEPT_CONFIRM: CONFIRM_PHRASE, AUDIOKIT_ACCEPT_EMAIL: "Person+t@example.com" };

test("config refuses to run without the confirmation phrase and an email", () => {
  assert.equal(validateConfig(readConfig(ok)).length, 0);
  assert.ok(validateConfig(readConfig({})).length >= 2);
  assert.ok(validateConfig(readConfig({ ...ok, AUDIOKIT_ACCEPT_CONFIRM: "yes" })).length >= 1);
});

test("a token needs an audio URL, and URLs must be https origins", () => {
  assert.ok(validateConfig(readConfig({ ...ok, AUDIOKIT_ACCEPT_MAGIC_TOKEN: "x" })).length >= 1);
  assert.equal(validateConfig(readConfig({ ...ok, AUDIOKIT_ACCEPT_MAGIC_TOKEN: "x", AUDIOKIT_ACCEPT_AUDIO_URL: "https://a/b.wav" })).length, 0);
  assert.ok(validateConfig(readConfig({ ...ok, AUDIOKIT_ACCEPT_BILLING_URL: "http://x" })).length >= 1);
});

test("the test-mode guard stops on live ids and livemode true", () => {
  assert.throws(() => assertNotLive({ a: { id: "cus_live_abc123" } }), LiveModeError);
  assert.throws(() => assertNotLive({ nested: [{ livemode: true }] }), LiveModeError);
  assert.doesNotThrow(() => assertNotLive({ livemode: false, id: "cs_test_abc" }));
});

test("checkout and portal answers count as test mode only with test ids", () => {
  const good = { session_id: "cs_test_a1", url: "https://checkout.stripe.com/c/pay/cs_test_a1#frag" };
  assert.doesNotThrow(() => assertCheckoutIsTestMode(good));
  assert.throws(() => assertCheckoutIsTestMode({ ...good, session_id: "cs_live_a1" }), LiveModeError);
  assert.throws(() => assertCheckoutIsTestMode({ session_id: "cs_test_a1", url: "https://evil.example/cs_test_a1" }), LiveModeError);
  assert.throws(() => assertCheckoutIsTestMode({}), LiveModeError);
  assert.doesNotThrow(() => assertPortalIsTestMode({ url: "https://billing.stripe.com/p/session/test_YWNjdF8x" }));
  assert.throws(() => assertPortalIsTestMode({ url: "https://billing.stripe.com/p/session/live_abc" }), LiveModeError);
});

test("logs shorten ids and redact the address", () => {
  assert.equal(shorten("0123456789abcdef", { fullIds: false }), "01234567…");
  assert.equal(shorten("0123456789abcdef", { fullIds: true }), "0123456789abcdef");
  assert.equal(redactEmail("person+t@example.com"), "per…@example.com");
});

test("the fixture is a short mono WAV", () => {
  const wav = makeToneWav();
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(24), 44100);
  assert.ok(wav.length < 600_000);
});

test("pricing findings flag the $99 Pro plan, the SLA claim and missing credits", () => {
  const old = pricingFindings("<h2>Pro</h2><p>$99 / month</p><p>99.9% uptime SLA</p><a href='mailto:a@b.c'>x</a>");
  assert.equal(old.sells_pro_99, true);
  assert.equal(old.uptime_sla_claim, true);
  assert.equal(old.mentions_credits, false);
  assert.equal(old.mailto_links, 1);
  const now = pricingFindings("<h2>Credits</h2><p>$10</p><p>1,000 credits</p><script>var x='$99 99.9%'</script>");
  assert.equal(now.sells_pro_99, false, "scripts are ignored");
  assert.equal(now.uptime_sla_claim, false);
  assert.equal(now.mentions_credits, true);
  assert.equal(now.pack_10_for_1000, true);
});

const stemsOutputs = JSON.stringify({ vocals: "https://u/v", drums: "https://u/d", bass: "https://u/b", other: { url: "https://u/o", headers: { "x-upsert": "true" } } });

test("stems jobs need an upload target for each of the four outputs, and the value is never echoed", () => {
  const withToken = { ...ok, AUDIOKIT_ACCEPT_MAGIC_TOKEN: "x", AUDIOKIT_ACCEPT_AUDIO_URL: "https://a/b.wav", AUDIOKIT_ACCEPT_STEMS: "1" };
  assert.ok(validateConfig(readConfig(withToken)).some((p) => p.includes("AUDIOKIT_ACCEPT_STEMS_OUTPUTS")));
  assert.equal(validateConfig(readConfig({ ...withToken, AUDIOKIT_ACCEPT_STEMS_OUTPUTS: stemsOutputs })).length, 0);
  const secret = "https://u/secret-signature";
  const bad = JSON.stringify({ vocals: secret, drums: "http://not-https", bass: "https://u/b", other: "https://u/o" });
  const problems = validateConfig(readConfig({ ...withToken, AUDIOKIT_ACCEPT_STEMS_OUTPUTS: bad }));
  assert.ok(problems.length >= 1);
  assert.ok(!problems.join("\n").includes(secret));
  assert.equal(parseStemsOutputs("not json"), null);
  assert.equal(parseStemsOutputs(JSON.stringify({ vocals: "https://u/v" })), null);
  assert.equal(parseStemsOutputs(JSON.stringify({ ...JSON.parse(stemsOutputs), extra: "https://u/x" })), null, "unknown output names are refused, as the API does");
  assert.deepEqual(parseStemsOutputs(stemsOutputs).other, { url: "https://u/o", headers: { "x-upsert": "true" } });
  // Not asked for: no outputs needed.
  assert.equal(validateConfig(readConfig({ ...ok, AUDIOKIT_ACCEPT_MAGIC_TOKEN: "x", AUDIOKIT_ACCEPT_AUDIO_URL: "https://a/b.wav" })).length, 0);
});

test("stems upload target headers must be an object of strings, as the API requires", () => {
  const withHeaders = (headers) => JSON.stringify({ ...JSON.parse(stemsOutputs), vocals: { url: "https://u/v", headers } });
  assert.equal(parseStemsOutputs(withHeaders([])), null, "an array");
  assert.equal(parseStemsOutputs(withHeaders("x-upsert: true")), null, "not an object");
  assert.equal(parseStemsOutputs(withHeaders(null)), null, "null");
  assert.equal(parseStemsOutputs(withHeaders({ "x-upsert": true })), null, "a non-string value");
  assert.deepEqual(parseStemsOutputs(withHeaders({ "x-upsert": "true" })).vocals.headers, { "x-upsert": "true" });
  assert.equal(parseStemsOutputs(JSON.stringify({ ...JSON.parse(stemsOutputs), vocals: { url: "https://u/v", extra: 1 } })), null, "unknown target keys");
});

test("the API's answers to a submit are told apart: accepted, replay, refused, retry", () => {
  assert.equal(classifySubmit({ status: 202, body: { status: "awaiting_credit" } }).kind, "accepted");
  assert.equal(classifySubmit({ status: 200, body: {} }).kind, "replay");
  assert.deepEqual(classifySubmit({ status: 402, body: { error: { code: "insufficient_credits", message: "m" } } }), { kind: "refused", code: "insufficient_credits" });
  assert.equal(classifySubmit({ status: 402, body: { error: { code: "no_active_plan" } } }).code, "no_active_plan");
  assert.equal(classifySubmit({ status: 401, body: { error: { code: "unauthorized" } } }).kind, "retry", "a new key may not have reached the API yet");
  assert.deepEqual(classifySubmit({ status: 503, body: { error: { code: "entitlement_unavailable" } }, retryAfter: 7 }), { kind: "retry", code: "entitlement_unavailable", wait_s: 7 });
  assert.equal(classifySubmit({ status: 429, body: null, retryAfter: 9999 }).wait_s, 30, "the wait is capped");
  assert.equal(classifySubmit({ status: 409, body: { error: { code: "idempotency_conflict" } } }).kind, "error");
});

test("refused is a final job state, awaiting_credit is not", () => {
  for (const f of ["succeeded", "failed", "canceled", "refused"]) assert.ok(JOB_FINAL.has(f), f);
  for (const p of ["awaiting_credit", "queued", "running"]) assert.ok(!JOB_FINAL.has(p), p);
});

test("the smoke suite never submits a job to billing (its POST /v1/jobs was removed)", () => {
  const src = readFileSync(new URL("./acceptance/smoke.acceptance.mjs", import.meta.url), "utf8");
  assert.ok(!/billing\(\s*[`"']\/v1\/jobs[`"'/?]?[^)]*method:\s*"POST"/s.test(src), "no billing(...) POST to /v1/jobs");
  assert.ok(!/billing\(\s*`\/v1\/jobs\/\$\{/.test(src), "job status is read from the API, not billing");
  assert.match(src, /api\("\/v1\/jobs", \{ method: "POST"/);
});
