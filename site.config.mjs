// Site-wide settings. The build substitutes these into every page.

export default {
  // Canonical site origin: https, no trailing slash. Used for <link rel="canonical">,
  // Open Graph URLs and sitemap.xml.
  siteUrl: "https://audiokit.ai",
  // The API's production base URL: https origin, no trailing slash.
  // The build also reads the contract from `${apiBaseUrl}/v1/openapi.yaml`,
  // falling back to contract/openapi.yaml if that fetch fails.
  apiBaseUrl: "https://api.audiokit.ai",
  apiBaseUrlIsPlaceholder: false,
  // The customer console (decision 0016/0021): its own Netlify site, so every link to it is
  // absolute. The public site's sign-in CTA points at `${consoleUrl}/login`.
  consoleUrl: "https://console.audiokit.ai",
};
