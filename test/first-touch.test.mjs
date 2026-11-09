// First-touch signup source on the public site (AudioKit decision 0040, EPSILON-98).
// The first page in a tab is remembered in sessionStorage and added to console sign-up and
// sign-in links; later pages never overwrite it. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import config from "../site.config.mjs";

const source = await readFile(new URL("../src/static/first-touch.js", import.meta.url), "utf8");
const build = await readFile(new URL("../scripts/build.mjs", import.meta.url), "utf8");

function load() {
  const module = { exports: {} };
  vm.runInNewContext(source, { module, URL, JSON });
  return module.exports;
}

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
}

function links(...hrefs) {
  return hrefs.map((href) => {
    const l = { href };
    l.getAttribute = () => l.href;
    l.setAttribute = (_, value) => (l.href = value);
    return l;
  });
}

const ft = load();
// Objects from the script's context have another realm's prototype: compare as plain data.
const plain = (o) => JSON.parse(JSON.stringify(o));
const SITE = "https://audiokit.ai";

test("captures the referrer host, utm_* values and the landing path", () => {
  const touch = ft.touchFrom(
    `${SITE}/pricing/?utm_source=hn&utm_medium=social&utm_campaign=launch&other=x#top`,
    "https://news.ycombinator.com/item?id=123",
  );
  assert.deepEqual(plain(touch), {
    ak_ref: "news.ycombinator.com",
    utm_source: "hn",
    utm_medium: "social",
    utm_campaign: "launch",
    ak_landing: "/pricing/",
  });
});

test("keeps only the referrer's host name, and drops our own hosts", () => {
  assert.equal(ft.referrerHost("https://www.google.com/search?q=secret"), "www.google.com");
  assert.equal(ft.referrerHost("https://audiokit.ai/docs/"), "");
  assert.equal(ft.referrerHost("https://console.audiokit.ai/login"), "");
  assert.equal(ft.referrerHost("android-app://com.example"), "");
  assert.equal(ft.referrerHost("not a url"), "");
  assert.equal(ft.referrerHost(""), "");
});

test("cleans and caps visitor-controlled values", () => {
  const long = "a".repeat(500);
  const touch = ft.touchFrom(`${SITE}/?utm_source=${long}&utm_term=%20two%0A%0Dwords%20&utm_content=%20`, "");
  assert.equal(touch.utm_source.length, 100);
  assert.equal(touch.utm_term, "two words");
  assert.ok(!("utm_content" in touch), "an empty value is not stored");
  assert.ok(!("ak_ref" in touch), "no referrer, no ak_ref");
});

test("the first touch is stored once and never overwritten", () => {
  const storage = memoryStorage();
  const first = ft.firstTouch(storage, `${SITE}/?utm_source=newsletter`, "https://example.org/");
  const later = ft.firstTouch(storage, `${SITE}/pricing/?utm_source=other`, "https://elsewhere.test/");
  assert.deepEqual(plain(later), plain(first));
  assert.equal(later.utm_source, "newsletter");
  assert.equal(later.ak_ref, "example.org");
  assert.equal(storage.data.size, 1);
  assert.ok(storage.data.has("ak_first_touch"));
});

test("a direct first visit is still the first touch", () => {
  const storage = memoryStorage();
  ft.firstTouch(storage, `${SITE}/`, "");
  const later = ft.firstTouch(storage, `${SITE}/pricing/?utm_source=late`, "https://late.test/");
  assert.deepEqual(plain(later), { ak_landing: "/" });
});

test("blocked or corrupt storage falls back to this page's values", () => {
  const blocked = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("SecurityError");
    },
  };
  assert.equal(ft.firstTouch(blocked, `${SITE}/?utm_source=x`, "").utm_source, "x");
  assert.equal(ft.firstTouch(null, `${SITE}/?utm_source=y`, "").utm_source, "y");
  const corrupt = memoryStorage();
  corrupt.setItem("ak_first_touch", "{not json");
  assert.equal(ft.firstTouch(corrupt, `${SITE}/?utm_source=z`, "").utm_source, "z");
});

test("only console sign-up and sign-in links are decorated", () => {
  const touch = { ak_ref: "example.org", utm_source: "hn", ak_landing: "/" };
  const [signup, login, keys, docs, other] = links(
    `${config.consoleUrl}/signup`,
    `${config.consoleUrl}/login?next=%2Fapi-keys&utm_source=keep`,
    `${config.consoleUrl}/api-keys`,
    "/docs/",
    "https://example.com/signup",
  );
  const count = ft.decorate([signup, login, keys, docs, other], config.consoleUrl, touch);
  assert.equal(count, 2);
  const s = new URL(signup.href);
  assert.equal(s.searchParams.get("ak_ref"), "example.org");
  assert.equal(s.searchParams.get("utm_source"), "hn");
  assert.equal(s.searchParams.get("ak_landing"), "/");
  const l = new URL(login.href);
  assert.equal(l.searchParams.get("next"), "/api-keys");
  assert.equal(l.searchParams.get("utm_source"), "keep", "a value already on the link wins");
  assert.equal(keys.href, `${config.consoleUrl}/api-keys`);
  assert.equal(docs.href, "/docs/");
  assert.equal(other.href, "https://example.com/signup");
});

test("every page loads the script with the console origin from site.config.mjs", () => {
  assert.match(build, /src="\/first-touch\.js" data-console-url="\$\{esc\(config\.consoleUrl\)\}"/);
  assert.match(build, /\$\{firstTouchScript\(\)\}<\/body>/);
});

test("the script sets no cookie and makes no request", () => {
  assert.doesNotMatch(source, /document\.cookie|localStorage|fetch\(|sendBeacon|XMLHttpRequest/);
});
