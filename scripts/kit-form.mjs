// The "Product updates" signup (shared decision 0027). A plain HTML POST to a Kit form: no Kit
// script, no tracking. The Kit form ID lives in one place, `kitFormId` in site.config.mjs. While
// it is empty nothing renders: no form on the landing page, no Kit wording in the privacy notice.

/** The numeric Kit form ID, or "" when not configured. Anything else is a config mistake. */
export function normalizeKitFormId(id) {
  const value = String(id ?? "").trim();
  if (value === "") return "";
  if (!/^\d+$/.test(value)) throw new Error(`site.config.mjs: kitFormId must be digits only, got "${value}"`);
  return value;
}

/** The signup form markup, or "" when there is no form ID. */
export function productUpdatesForm(id) {
  const formId = normalizeKitFormId(id);
  if (!formId) return "";
  return `<section id="updates" class="wrap section signup" aria-labelledby="updates-title">
  <div class="signup-box">
    <p class="kicker">Product updates</p>
    <h2 id="updates-title">New operations and API changes</h2>
    <p>An occasional email when AudioKit ships something new. It is separate from creating an account. Unsubscribe in one click.</p>
    <form id="updates-form" action="https://app.kit.com/forms/${formId}/subscriptions" method="post" target="_blank" rel="noopener">
      <label class="sr-only" for="updates-email">Email address</label>
      <input type="email" name="email_address" id="updates-email" placeholder="you@example.com" required autocomplete="email">
      <button class="btn btn-primary" type="submit">Subscribe</button>
    </form>
    <small>Subscribing sends your email address to Kit, our email provider, which emails you to confirm. See the <a href="/privacy/#updates-list">privacy notice</a>.</small>
  </div>
</section>`;
}

/**
 * Keeps or drops `<!--kit-->...<!--/kit-->` blocks. With a form ID the markers are removed and the
 * content stays; without one the whole block goes, so the notice never describes a form that is not live.
 */
export function applyKitBlocks(html, enabled) {
  return html.replace(/[ \t]*<!--kit-->\n?([\s\S]*?)[ \t]*<!--\/kit-->\n?/g, (_, inner) => (enabled ? inner : ""));
}
