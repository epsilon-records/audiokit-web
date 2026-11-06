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
};
