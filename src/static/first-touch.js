// First-touch signup source (AudioKit decision 0040).
//
// On the first page a visitor opens in a tab, remember where they came from: the referring
// site's host name (never the full URL), any utm_* values in the address and the path they
// landed on. Then add those values to the links that go to console sign-up and sign-in, so the
// console can pass them to the billing service when it creates the account.
//
// What it stores: one sessionStorage entry, `ak_first_touch`, on audiokit.ai only. The browser
// drops it when the tab closes. No cookie, nothing sent anywhere by this script, and a later page
// never overwrites the first one. The privacy notice must describe it.
(() => {
  "use strict";
  const KEY = "ak_first_touch";
  const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  // Hosts that are "us": a visit from one of them is not a source.
  const SELF = /(^|\.)audiokit\.ai$/i;
  const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
  // An email address in a utm value is personal data nobody asked for: drop the value.
  const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

  const clean = (value, max) => {
    if (typeof value !== "string") return "";
    // Control characters out, whitespace collapsed, then capped.
    return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  };

  function referrerHost(referrer) {
    if (typeof referrer !== "string" || !referrer) return "";
    try {
      const url = new URL(referrer);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      const host = url.hostname.toLowerCase();
      if (SELF.test(host) || IPV4.test(host) || host.startsWith("[")) return "";
      return clean(host, 253);
    } catch {
      return "";
    }
  }

  // The touch for this page view: what the first-touch record would be if this were the first.
  function touchFrom(href, referrer) {
    const url = new URL(href);
    const touch = {};
    const ref = referrerHost(referrer);
    if (ref) touch.ak_ref = ref;
    for (const key of UTM) {
      const value = clean(url.searchParams.get(key) ?? "", 100);
      if (value && !EMAIL_LIKE.test(value)) touch[key] = value;
    }
    const path = clean(url.pathname, 200);
    if (path) touch.ak_landing = path;
    return touch;
  }

  function firstTouch(storage, href, referrer) {
    try {
      const saved = storage?.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
      // Unreadable or corrupt: fall through and treat this page as the first touch.
    }
    const touch = touchFrom(href, referrer);
    try {
      storage?.setItem(KEY, JSON.stringify(touch));
    } catch {
      // Storage blocked (private mode, policy): links still carry this page's values.
    }
    return touch;
  }

  // Add the touch to console sign-up and sign-in links. Existing query values on a link win.
  function decorate(links, consoleUrl, touch) {
    let origin;
    try {
      origin = new URL(consoleUrl).origin;
    } catch {
      return 0;
    }
    let count = 0;
    for (const link of links) {
      let url;
      try {
        url = new URL(link.getAttribute("href"), origin);
      } catch {
        continue;
      }
      if (url.origin !== origin || !/^\/(signup|login)\/?$/.test(url.pathname)) continue;
      for (const [key, value] of Object.entries(touch)) {
        if (typeof value === "string" && value && !url.searchParams.has(key)) {
          url.searchParams.set(key, value);
        }
      }
      link.setAttribute("href", url.toString());
      count++;
    }
    return count;
  }

  const api = { KEY, touchFrom, firstTouch, decorate, referrerHost };
  if (typeof module === "object" && module.exports) module.exports = api;

  try {
    const script = document.currentScript;
    const consoleUrl = script?.dataset.consoleUrl;
    if (!consoleUrl) return;
    let storage = null;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null;
    }
    const touch = firstTouch(storage, location.href, document.referrer);
    const run = () => decorate(document.querySelectorAll("a[href]"), consoleUrl, touch);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  } catch {
    // Never break the page for attribution.
  }
})();
