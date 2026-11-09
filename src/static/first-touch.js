// First-touch signup source (AudioKit decisions 0040 and 0041).
//
// On the page a visitor lands on, read where they came from: the referring site's host name
// (never the full URL), any utm_* values in the address and the path of this page. Add those
// values to this page's links to console sign-up and sign-in, so the console can pass them to
// the billing service when it creates the account.
//
// Stores nothing (0041): no cookie, no sessionStorage, no localStorage, no request. The values
// live in this page's memory and its link addresses only. A visitor who moves to another page
// on the site before signing up loses them; that is accepted. A page reached from another
// audiokit.ai page is not a landing, so its links carry nothing.
(() => {
  "use strict";
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

  // The referrer's host, "self" for one of our own hosts, or "" for none/unusable.
  function referrerHost(referrer) {
    if (typeof referrer !== "string" || !referrer) return "";
    try {
      const url = new URL(referrer);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      const host = url.hostname.toLowerCase();
      if (SELF.test(host)) return "self";
      if (IPV4.test(host) || host.startsWith("[")) return "";
      return clean(host, 253);
    } catch {
      return "";
    }
  }

  // The source for this page view, or {} when this page is not a landing.
  function touchFrom(href, referrer) {
    const ref = referrerHost(referrer);
    if (ref === "self") return {};
    const url = new URL(href);
    const touch = {};
    if (ref) touch.ak_ref = ref;
    for (const key of UTM) {
      const value = clean(url.searchParams.get(key) ?? "", 100);
      if (value && !EMAIL_LIKE.test(value)) touch[key] = value;
    }
    const path = clean(url.pathname, 200);
    if (path) touch.ak_landing = path;
    return touch;
  }

  // Add the touch to console sign-up and sign-in links. Existing query values on a link win.
  function decorate(links, consoleUrl, touch) {
    if (!Object.keys(touch).length) return 0;
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

  const api = { touchFrom, decorate, referrerHost };
  if (typeof module === "object" && module.exports) module.exports = api;

  try {
    const consoleUrl = document.currentScript?.dataset.consoleUrl;
    if (!consoleUrl) return;
    const touch = touchFrom(location.href, document.referrer);
    const run = () => decorate(document.querySelectorAll("a[href]"), consoleUrl, touch);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  } catch {
    // Never break the page for attribution.
  }
})();
