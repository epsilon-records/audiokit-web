// The public pages' settings, ported from the static site's site.config.mjs (EPSILON-169 PR 2).
// tests/site-config.test.ts keeps them equal to that file while both sites exist.

export const siteConfig = {
	// Canonical origin for <link rel="canonical">, Open Graph URLs and sitemap.xml: https, no slash.
	siteUrl: 'https://audiokit.ai',
	// The API's production base URL. The build reads the contract from `${apiBaseUrl}/v1/openapi.yaml`
	// first, then ../contract/openapi.yaml (src/lib/server/site/contract.ts).
	apiBaseUrl: 'https://api.audiokit.ai',
	apiBaseUrlIsPlaceholder: false,
	// The console's own host, which the privacy notice still names until the cut-over (plan, C).
	consoleUrl: 'https://console.audiokit.ai',
	// Kit form ID for the "Product updates" signup on the home page (shared 0027). Digits only.
	kitFormId: '10171362',
	// Keeps the privacy notice's Kit disclosure while Kit holds subscribers.
	kitDisclosure: true
} as const;
