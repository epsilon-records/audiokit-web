// Browser error monitoring on the public pages (shared decision 0003), started from a file rather
// than an inline script, so the Content-Security-Policy needs no inline script (EPSILON-118).
// The settings come from this tag's data-sentry attribute, which the build writes from SENTRY_DSN
// (src/lib/server/site/public-head.ts). The static site wrote the same call into /sentry-init.js.
(() => {
  "use strict";
  try {
    const init = JSON.parse(document.currentScript?.dataset.sentry || "null");
    if (init && window.Sentry) window.Sentry.init(init);
  } catch {
    // Never break the page for error monitoring.
  }
})();
