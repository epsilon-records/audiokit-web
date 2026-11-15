// The public site's plain files (EPSILON-169 PR 2): sitemap.xml, robots.txt and llms.txt, as
// the static site's build wrote them. All prerendered.
import { siteConfig } from '#lib/site/config';
import { SITE_PAGES } from '#lib/site/routes';
import { renderSitePage } from './render';

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const abs = (path: string) => `${siteConfig.siteUrl}${path}`;

/** The indexable public pages: every page in routes.ts whose source isn't marked noindex. */
export async function indexablePaths(): Promise<string[]> {
	const pages = await Promise.all(SITE_PAGES.map((p) => renderSitePage(p.path)));
	return pages
		.filter((p) => !p.meta.noindex)
		.map((p) => p.path)
		.sort();
}

export async function sitemapXml(): Promise<string> {
	const urls = await indexablePaths();
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(abs(u))}</loc></url>`).join('\n')}
</urlset>
`;
}

/**
 * Which host this build serves. Until the cut-over the app is served on console.audiokit.ai
 * (Netlify site `audiokit-console`), which must not compete with audiokit.ai in search, so its
 * robots.txt disallows everything. PUBLIC_SITE_HOST wins when set; otherwise Netlify's SITE_NAME
 * decides, so no site setting has to change.
 */
export function siteHost(env: Record<string, string | undefined> = process.env) {
	if (env.PUBLIC_SITE_HOST === 'console' || env.PUBLIC_SITE_HOST === 'audiokit')
		return env.PUBLIC_SITE_HOST;
	return env.SITE_NAME === 'audiokit-console' ? 'console' : 'audiokit';
}

export function robotsTxt(host = siteHost()): string {
	if (host === 'console') {
		return `# console.audiokit.ai serves a copy of audiokit.ai until the cut-over; keep it out of search.\nUser-agent: *\nDisallow: /\n`;
	}
	// Every crawler is allowed on audiokit.ai (shared 0080).
	return `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`;
}
