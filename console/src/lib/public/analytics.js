// Manual public-site beacon only. This is an MPA; never reuse this loader in the console.
(() => {
  "use strict";
  try {
    const token = document.currentScript?.dataset.siteToken;
    if (!/^[a-f0-9]{32}$/i.test(token || "")) return;

    // Explicit public content routes, not a prefix rule. Review additions for URL exposure.
    const paths = new Set([
      "/", "/pricing/", "/docs/", "/docs/reference/", "/docs/sdks/", "/docs/mcp/", "/privacy/",
    ]);
    const clean = (raw, local) => {
      if (typeof raw !== "string" || !raw || /[?#]/.test(raw)) return false;
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.username || url.password) return false;
      // Also exclude sensitive/unknown external referrers: only root or known content paths.
      if (!paths.has(url.pathname)) return false;
      return !local || url.origin === "https://audiokit.ai";
    };
    if (!clean(location.href, true)) return;
    const navigation = performance.getEntriesByType("navigation");
    if (navigation.length !== 1 || !clean(navigation[0].name, true)) return;
    if (typeof document.referrer !== "string") return;
    if (document.referrer !== "" && !clean(document.referrer, false)) return;
    if (window.__audiokitAnalyticsInstalled || document.querySelector(
      'script[data-cf-beacon], script[src*="cloudflareinsights.com/"]',
    )) return;

    const beacon = document.createElement("script");
    beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
    beacon.defer = true;
    beacon.referrerPolicy = "no-referrer";
    beacon.setAttribute("data-cf-beacon", JSON.stringify({ token, spa: false }));
    window.__audiokitAnalyticsInstalled = true;
    document.head.append(beacon);
  } catch {
    // Missing/unknown browser context must never enable collection.
  }
})();
