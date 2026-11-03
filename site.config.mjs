// Site-wide settings. The build substitutes these into every page.

export default {
  // The API's production base URL: https origin, no trailing slash.
  // The build also reads the contract from `${apiBaseUrl}/v1/openapi.yaml`,
  // falling back to contract/openapi.yaml if that fetch fails.
  apiBaseUrl: "https://api-production-cd43.up.railway.app",
  apiBaseUrlIsPlaceholder: false,
};
