// Helpers for the on-demand acceptance suite. No dependencies. Offline-testable parts
// (config parsing, the test-mode guard, redaction) are covered by test/acceptance-lib.test.mjs.

import { appendFileSync, writeFileSync } from "node:fs";

export const CONFIRM_PHRASE = "production-test-mode";

/** Thrown when anything indicates Stripe live mode. The run stops and touches nothing more. */
export class LiveModeError extends Error {}

export function readConfig(env = process.env) {
  const trim = (v) => (v ?? "").trim();
  const cfg = {
    confirm: trim(env.AUDIOKIT_ACCEPT_CONFIRM),
    email: trim(env.AUDIOKIT_ACCEPT_EMAIL).toLowerCase(),
    magicToken: trim(env.AUDIOKIT_ACCEPT_MAGIC_TOKEN),
    audioUrl: trim(env.AUDIOKIT_ACCEPT_AUDIO_URL),
    stems: trim(env.AUDIOKIT_ACCEPT_STEMS) === "1",
    billingUrl: trim(env.AUDIOKIT_ACCEPT_BILLING_URL) || "https://billing.audiokit.ai",
    apiUrl: trim(env.AUDIOKIT_ACCEPT_API_URL) || "https://api.audiokit.ai",
    evidencePath: trim(env.AUDIOKIT_ACCEPT_EVIDENCE) || "acceptance-evidence.jsonl",
    fullIds: trim(env.AUDIOKIT_ACCEPT_FULL_IDS) === "1",
  };
  return cfg;
}

/** Returns a list of problems; empty means the configuration may run. */
export function validateConfig(cfg) {
  const problems = [];
  if (cfg.confirm !== CONFIRM_PHRASE) {
    problems.push(
      `Set AUDIOKIT_ACCEPT_CONFIRM=${CONFIRM_PHRASE} to confirm this runs against production with Stripe in test mode.`,
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cfg.email)) {
    problems.push("Set AUDIOKIT_ACCEPT_EMAIL to a throwaway address you can read.");
  }
  for (const [name, url] of [
    ["AUDIOKIT_ACCEPT_BILLING_URL", cfg.billingUrl],
    ["AUDIOKIT_ACCEPT_API_URL", cfg.apiUrl],
  ]) {
    if (!/^https:\/\/[^/\s]+$/.test(url)) problems.push(`${name} must be an https origin with no path.`);
  }
  if (cfg.magicToken && !cfg.audioUrl) {
    problems.push("Set AUDIOKIT_ACCEPT_AUDIO_URL to an https URL of a short audio clip (30 s or less).");
  }
  if (cfg.audioUrl && !/^https:\/\//.test(cfg.audioUrl)) {
    problems.push("AUDIOKIT_ACCEPT_AUDIO_URL must be https.");
  }
  return problems;
}

const LIVE_ID = /\b(?:cs|pk|sk|rk|cus|sub|in|pi|ch|re|evt|price|prod|si)_live_[A-Za-z0-9]+/;

/**
 * Test-mode guard. Throws LiveModeError when a value carries a live-mode Stripe id or a
 * `livemode: true` flag anywhere inside it.
 */
export function assertNotLive(value, where = "response") {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  if (LIVE_ID.test(text)) throw new LiveModeError(`${where} contains a live-mode Stripe id`);
  let live = false;
  const walk = (v) => {
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "livemode" && x === true) live = true;
        else walk(x);
      }
    }
  };
  if (typeof value === "object") walk(value);
  if (live) throw new LiveModeError(`${where} reports livemode: true`);
}

/** A Checkout answer proves test mode only when it carries a `cs_test_` session and URL. */
export function assertCheckoutIsTestMode(checkout) {
  assertNotLive(checkout, "checkout");
  const id = checkout?.session_id;
  const url = String(checkout?.url ?? "");
  if (typeof id !== "string" || !id.startsWith("cs_test_")) {
    throw new LiveModeError("checkout session_id is not a cs_test_ id");
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new LiveModeError("checkout url is not a URL");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("stripe.com") || !parsed.pathname.includes("cs_test_")) {
    throw new LiveModeError("checkout url is not a Stripe test-mode Checkout page");
  }
}

/** A portal answer proves test mode only for a billing.stripe.com session whose id starts `test_`. */
export function assertPortalIsTestMode(portal) {
  assertNotLive(portal, "portal");
  let parsed;
  try {
    parsed = new URL(String(portal?.url ?? ""));
  } catch {
    throw new LiveModeError("portal url is not a URL");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("stripe.com") || !/\/p\/session\/test_/.test(parsed.pathname)) {
    throw new LiveModeError("portal url is not a Stripe test-mode portal session");
  }
}

/** Shortens an identifier for logs unless full ids were asked for. */
export function shorten(id, cfg, keep = 8) {
  if (typeof id !== "string") return id;
  return cfg.fullIds ? id : `${id.slice(0, keep)}…`;
}

export function redactEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  return `${local.slice(0, 3)}…@${domain}`;
}

/** Evidence log: one JSON object per line, timestamped. Never receives secrets. */
export function makeEvidence(path) {
  writeFileSync(path, "");
  return (entry) => {
    const line = { t: new Date().toISOString(), ...entry };
    appendFileSync(path, JSON.stringify(line) + "\n");
    console.log(JSON.stringify(line));
    return line;
  };
}

/** Small fetch wrapper: JSON in, JSON out, a timeout, and the status always returned. */
export async function call(base, path, { method = "GET", headers = {}, body, timeoutMs = 30_000 } = {}) {
  const started = Date.now();
  const res = await fetch(base + path, {
    method,
    headers: { accept: "application/json", ...(body ? { "content-type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  return { status: res.status, body: json, text, ms: Date.now() - started };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Release checks on the public pricing page (shared decision 0040, AudioKit 0052). Pure, so it
 * is tested offline. Each finding names something the page must not say, or should say, before
 * AudioKit sells credits.
 */
export function pricingFindings(html) {
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ");
  return {
    sells_pro_99: /\$\s?99\b/.test(text),
    mentions_pro_plan: /\bPro\b/.test(text),
    uptime_sla_claim: /99\.9\s?%/.test(text),
    mentions_credits: /\bcredits?\b/i.test(text),
    pack_10_for_1000: /\$\s?10\b[\s\S]{0,80}1,?000\s+credits|1,?000\s+credits[\s\S]{0,80}\$\s?10\b/i.test(text),
    mailto_links: (String(html).match(/mailto:/gi) ?? []).length,
  };
}

/** Header-only summary of a page response, for evidence. */
export function headerSummary(headers) {
  const get = (k) => headers.get(k);
  return {
    hsts: Boolean(get("strict-transport-security")),
    csp: Boolean(get("content-security-policy")),
    x_content_type_options: get("x-content-type-options"),
    frame_protection: Boolean(get("x-frame-options")) || /frame-ancestors/.test(get("content-security-policy") ?? ""),
  };
}
