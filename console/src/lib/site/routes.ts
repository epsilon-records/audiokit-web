// The public, prerendered pages (EPSILON-169 PR 2): each route, the page source it renders, and
// whether it is indexed. Every URL keeps the static site's form, trailing slash included.

export type SitePage = {
	/** The URL path, as the static site served it. */
	path: string;
	/** The page source in src/lib/site/pages/, or 'reference' for the generated API reference. */
	source: string;
};

export const SITE_PAGES: SitePage[] = [
	{ path: '/', source: 'index.html' },
	{ path: '/pricing/', source: 'pricing.html' },
	{ path: '/privacy/', source: 'privacy.html' },
	{ path: '/docs/', source: 'docs/index.html' },
	{ path: '/docs/reference/', source: 'reference' },
	{ path: '/docs/sdks/', source: 'docs/sdks/index.html' },
	{ path: '/docs/mcp/', source: 'docs/mcp.html' },
	{ path: '/check-your-inbox/', source: 'check-your-inbox.html' },
	{ path: '/subscribed/', source: 'subscribed.html' },
	{ path: '/404.html', source: '404.html' }
];
