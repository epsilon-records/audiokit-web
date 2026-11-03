// Site-wide settings. The build substitutes these into every page.

export default {
  // The API's production base URL.
  // PLACEHOLDER until the API is hosted. Replace it with the real https
  // origin, no trailing slash, and set apiBaseUrlIsPlaceholder to false. Once it is real, the
  // build also reads the contract from `${apiBaseUrl}/v1/openapi.yaml`.
  apiBaseUrl: "https://api.audiokit.example",
  apiBaseUrlIsPlaceholder: true,
};
