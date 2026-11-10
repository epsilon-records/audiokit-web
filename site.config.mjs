// Site-wide settings. The build substitutes these into every page.

export default {
  // Canonical site origin: https, no trailing slash. Used for <link rel="canonical">,
  // Open Graph URLs and sitemap.xml.
  siteUrl: "https://audiokit.ai",
  // Public site_token for the exact audiokit.ai manual-install site (auto_install:false).
  // Manual snippet site ebab0074d66844459b2ab8132c1f7355, verified by configuration owner.
  // Keep unmerged until reviewed; setting this empty disables injection entirely.
  // Never use an API credential or a documentation/example token here.
  cloudflareWebAnalyticsToken: "d868aef5241e4bbc9b4a748f58ce1c48",
  // The API's production base URL: https origin, no trailing slash.
  // The build also reads the contract from `${apiBaseUrl}/v1/openapi.yaml`,
  // falling back to contract/openapi.yaml if that fetch fails.
  apiBaseUrl: "https://api.audiokit.ai",
  apiBaseUrlIsPlaceholder: false,
  // The customer console (decision 0016/0021): its own Netlify site, so every link to it is
  // absolute. The public site's sign-in CTA points at `${consoleUrl}/login`.
  consoleUrl: "https://console.audiokit.ai",
  // Kit form ID for the "Product updates" signup on the landing page (shared decision 0027).
  // Digits only, from the Kit form's URL. Leave it empty until the form exists: while empty, the
  // build renders no form and the privacy notice carries no Kit wording. Never an API key.
  kitFormId: "",
};
