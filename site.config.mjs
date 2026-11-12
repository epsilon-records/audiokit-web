// Site-wide settings. The build substitutes these into every page.

export default {
  // Canonical site origin: https, no trailing slash. Used for <link rel="canonical">,
  // Open Graph URLs and sitemap.xml.
  siteUrl: "https://audiokit.ai",
  // The Cloudflare Web Analytics site token is not set here: the build reads it from the
  // PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN environment variable (scripts/analytics-config.mjs).
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
  // build renders no form. Never an API key.
  kitFormId: "10171362",
  // Keeps the privacy notice's Kit disclosure (processor, transfers, retention). Leave it true
  // for as long as Kit holds subscribers, even if the form is switched off: clearing kitFormId
  // must not hide the disclosure. A configured kitFormId always shows it.
  kitDisclosure: true,
};
