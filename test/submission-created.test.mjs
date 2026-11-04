// Tests for netlify/functions/submission-created.mjs. Resend is mocked; nothing is sent.
// Run: npm test

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { handler, isValidEmail, renderEmail } from "../netlify/functions/submission-created.mjs";

// The shape Netlify posts for `submission-created` (trimmed to what the function reads).
const event = (payload) => ({ body: JSON.stringify({ payload }) });
const sample = (data = {}, extra = {}) =>
  event({
    id: "6543f0c1a2b3c4d5e6f70890",
    form_name: "access",
    site_url: "https://audiokit.netlify.app",
    email: "ada@example.com",
    data: { email: "ada@example.com", use: "Loudness checks on podcast masters", "bot-field": "", ...data },
    ...extra,
  });

let calls;
const realFetch = globalThis.fetch;
const realLog = console.log;
const env = { ...process.env };

function mockResend(status = 200, body = { id: "re_123" }) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(body), { status });
  };
}

beforeEach(() => {
  calls = [];
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.AUDIOKIT_FROM_EMAIL = "AudioKit <hello@mail.example.com>";
  process.env.URL = "https://audiokit.netlify.app";
  console.log = () => {};
  mockResend();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.log = realLog;
  process.env = { ...env };
});

test("sends one confirmation for a valid access submission", async () => {
  const res = await handler(sample());
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  const [{ url, init, body }] = calls;
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, "Bearer re_test_key");
  assert.equal(init.headers["Idempotency-Key"], "access-confirmation/6543f0c1a2b3c4d5e6f70890");
  assert.equal(body.from, "AudioKit <hello@mail.example.com>");
  assert.deepEqual(body.to, ["ada@example.com"]);
  assert.match(body.subject, /early-access list/);
  assert.match(body.text, /when access opens/);
  assert.match(body.html, /when access opens/);
});

test("does not echo submitted text into the email", async () => {
  await handler(sample({ use: "<script>alert(1)</script> visit evil.example" }));
  assert.ok(!calls[0].body.html.includes("evil.example"));
  assert.ok(!calls[0].body.text.includes("evil.example"));
});

test("ignores other forms", async () => {
  const res = await handler(sample({}, { form_name: "contact" }));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 0);
});

test("skips when the honeypot is filled", async () => {
  await handler(sample({ "bot-field": "http://spam.example" }));
  assert.equal(calls.length, 0);
});

test("skips invalid emails", async () => {
  for (const email of ["", "not-an-email", "a@b", "a b@example.com", "x@example.com, y@example.com"]) {
    await handler(sample({ email }, { email }));
  }
  assert.equal(calls.length, 0);
});

test("returns cleanly when env vars are missing", async () => {
  delete process.env.RESEND_API_KEY;
  assert.equal((await handler(sample())).statusCode, 200);
  process.env.RESEND_API_KEY = "re_test_key";
  delete process.env.AUDIOKIT_FROM_EMAIL;
  assert.equal((await handler(sample())).statusCode, 200);
  assert.equal(calls.length, 0);
});

test("returns cleanly when Resend errors or is unreachable", async () => {
  mockResend(422, { name: "validation_error", message: "domain is not verified" });
  assert.equal((await handler(sample())).statusCode, 200);
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  assert.equal((await handler(sample())).statusCode, 200);
});

test("returns cleanly on a malformed event", async () => {
  assert.equal((await handler({ body: "not json" })).statusCode, 200);
  assert.equal((await handler({})).statusCode, 200);
  assert.equal(calls.length, 0);
});

test("isValidEmail", () => {
  assert.ok(isValidEmail("ada@example.com"));
  assert.ok(isValidEmail("ada+audio@sub.example.co.uk"));
  assert.ok(!isValidEmail("ada@example"));
  assert.ok(!isValidEmail(42));
});

test("email copy stays factual", () => {
  const { text, html } = renderEmail("https://audiokit.netlify.app");
  for (const body of [text, html]) {
    assert.ok(!/ERMS|Epsilon/i.test(body));
    assert.ok(!/\$|price|pricing|launch(es|ing)? on|is live/i.test(body));
  }
  assert.match(text, /https:\/\/audiokit\.netlify\.app\/docs\//);
});
