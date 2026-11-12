// Offline checks of the acceptance suite's guards. Runs in `npm test`; touches no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIRM_PHRASE,
  LiveModeError,
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
