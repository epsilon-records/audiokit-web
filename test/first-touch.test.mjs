// First-touch signup source on the public site (AudioKit decisions 0040 and 0041, EPSILON-98).
// The landing page's referrer host, utm_* values and path are added to that page's console
// sign-up and sign-in links. Nothing is stored on the device. Run: npm test

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
const ft = load();
// Objects from the script's context have another realm's prototype: compare as plain data.
const plain = (o) => JSON.parse(JSON.stringify(o));
const SITE = "https://audiokit.ai";

function links(...hrefs) {
  return hrefs.map((href) => {
    const l = { href };
    l.getAttribute = () => l.href;
    l.setAttribute = (_, value) => (l.href = value);
    return l;
  });
}

// Run the script as a browser would, with every device-storage API spied on.
function runInPage({ href, referrer, hrefs }) {
  const writes = [];
  const storage = (name) =>
    new Proxy(
      {},
      {
        get: (_, prop) => (...args) => {
          writes.push(`${name}.${String(prop)}(${args.join(",")})`);
          return null;
        },
        set: (_, prop) => (writes.push(`${name}.${String(prop)}=`), true),
      },
    );
  const anchors = links(...hrefs);
  const document = {
    currentScript: { dataset: { consoleUrl: config.consoleUrl } },
    referrer,
    readyState: "interactive",
    querySelectorAll: () => anchors,
  };
  Object.defineProperty(document, "cookie", {
    get: () => "",
    set: (v) => writes.push(`document.cookie=${v}`),
  });
  const window = { sessionStorage: storage("sessionStorage"), localStorage: storage("localStorage") };
  vm.runInNewContext(source, {
    URL,
    JSON,
    document,
    window,
    location: { href },
    sessionStorage: window.sessionStorage,
    localStorage: window.localStorage,
    indexedDB: storage("indexedDB"),
    fetch: (...a) => writes.push(`fetch(${a[0]})`),
    navigator: { sendBeacon: (...a) => writes.push(`sendBeacon(${a[0]})`) },
  });
  return { anchors, writes };
}

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

test("keeps only the referrer's host name; drops IPs; our own hosts mean 'not a landing'", () => {
  assert.equal(ft.referrerHost("https://www.google.com/search?q=secret"), "www.google.com");
  assert.equal(ft.referrerHost("https://audiokit.ai/docs/"), "self");
  assert.equal(ft.referrerHost("https://console.audiokit.ai/login"), "self");
  assert.equal(ft.referrerHost("http://192.168.1.10/admin"), "");
  assert.equal(ft.referrerHost("http://[::1]/"), "");
  assert.equal(ft.referrerHost("android-app://com.example"), "");
  assert.equal(ft.referrerHost("not a url"), "");
  assert.equal(ft.referrerHost(""), "");
});

test("a page reached from another audiokit.ai page carries nothing", () => {
  assert.deepEqual(plain(ft.touchFrom(`${SITE}/pricing/?utm_source=x`, `${SITE}/`)), {});
});

test("a direct landing still records its path", () => {
  assert.deepEqual(plain(ft.touchFrom(`${SITE}/`, "")), { ak_landing: "/" });
});

test("cleans and caps visitor-controlled values", () => {
  const long = "a".repeat(500);
  const touch = ft.touchFrom(`${SITE}/?utm_source=${long}&utm_term=%20two%0A%0Dwords%20&utm_content=%20`, "");
  assert.equal(touch.utm_source.length, 100);
  assert.equal(touch.utm_term, "two words");
  assert.ok(!("utm_content" in touch), "an empty value is not sent");
  const email = ft.touchFrom(`${SITE}/?utm_source=jane%40example.com&utm_medium=email`, "");
  assert.ok(!("utm_source" in email), "an email-like value is dropped");
  assert.equal(email.utm_medium, "email");
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
  assert.equal(ft.decorate([signup, login, keys, docs, other], config.consoleUrl, touch), 2);
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

test("in the page: links are decorated and nothing is written to the device (decision 0041)", () => {
  const { anchors, writes } = runInPage({
    href: `${SITE}/?utm_source=hn`,
    referrer: "https://news.ycombinator.com/",
    hrefs: [`${config.consoleUrl}/signup`, "/pricing/"],
  });
  assert.equal(
    anchors[0].href,
    `${config.consoleUrl}/signup?ak_ref=news.ycombinator.com&utm_source=hn&ak_landing=%2F`,
  );
  assert.equal(anchors[1].href, "/pricing/");
  assert.deepEqual(writes, [], "no storage, cookie or network call");
});

test("in the page: after navigating within the site, links are left alone", () => {
  const { anchors, writes } = runInPage({
    href: `${SITE}/pricing/`,
    referrer: `${SITE}/`,
    hrefs: [`${config.consoleUrl}/signup`],
  });
  assert.equal(anchors[0].href, `${config.consoleUrl}/signup`);
  assert.deepEqual(writes, []);
});

test("the source names no storage API at all", () => {
  const code = source.replace(/\/\/.*$/gm, ""); // comments may name them; code may not
  assert.doesNotMatch(code, /sessionStorage|localStorage|indexedDB|document\.cookie|fetch\(|sendBeacon|XMLHttpRequest/);
});

test("every page loads the script with the console origin from site.config.mjs", () => {
  assert.match(build, /src="\/first-touch\.js" data-console-url="\$\{esc\(config\.consoleUrl\)\}"/);
  assert.match(build, /\$\{firstTouchScript\(\)\}<\/body>/);
});
