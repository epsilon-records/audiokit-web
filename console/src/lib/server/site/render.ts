// Renders the public pages from the static site's page sources (EPSILON-169 PR 2), at build time.
//
// The page text is the static site's, moved as it is: src/lib/site/pages/ holds copies of
// ../src/pages/ (tests/site-parity.test.ts compares them), and the {{TOKENS}} are filled the way
// scripts/build.mjs filled them. The API reference and the home page's operation list come from
// the contract through reference.js, a copy of scripts/reference.mjs, so the anchors stay.
import { analyticsToken } from '#lib/site/analytics-config.js';
import { applyKitBlocks, normalizeKitFormId, productUpdatesForm } from '#lib/site/kit-form.js';
import { assertNoGaps, isRelease } from '#lib/site/release-gaps.js';
import {
	operationModel,
	renderOperationList,
	renderReference,
	webhookTestVector
} from '#lib/site/reference.js';
import { siteConfig } from '#lib/site/config';
import { SITE_PAGES } from '#lib/site/routes';
import { loadContract } from './contract';

const sources = import.meta.glob('/src/lib/site/pages/**/*.html', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export type PageMeta = {
	title?: string;
	description?: string;
	layout?: 'site' | 'docs';
	nav?: string;
	noindex?: boolean;
	mainClass?: string;
};

export type TocItem = { level: 2 | 3; id: string; label: string };

export type RenderedPage = {
	path: string;
	meta: PageMeta;
	/** The page body, as HTML. */
	body: string;
	/** "On this page" links, for docs pages. */
	toc: TocItem[];
	apiVersion: string;
	/** The schema.org block for the home page, or ''. */
	structuredData: string;
};

const esc = (s: unknown) =>
	String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

export function parsePage(text: string, file: string): { meta: PageMeta; body: string } {
	const m = /^<!--\s*(\{[\s\S]*?\})\s*-->\n?/.exec(text);
	if (!m) throw new Error(`${file}: missing <!-- {meta json} --> on the first line`);
	return { meta: JSON.parse(m[1]), body: text.slice(m[0].length) };
}

/** "On this page" links, from <h2 id> and <h3 id data-toc>, as scripts/build.mjs found them. */
export function toc(body: string): TocItem[] {
	const items: TocItem[] = [];
	const re = /<(h2|h3)\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g;
	for (const m of body.matchAll(re)) {
		const [, tag, id, attrs, inner] = m;
		if (tag === 'h3' && !/data-toc/.test(attrs)) continue;
		const label = /data-toc="([^"]*)"/.exec(attrs)?.[1] || inner.replace(/<[^>]+>/g, '').trim();
		items.push({ level: tag === 'h2' ? 2 : 3, id, label });
	}
	return items;
}

/**
 * Code panels can be reached by keyboard (EPSILON-169 acceptance): every <pre> scrolls
 * sideways on a narrow screen, so each one gets tabindex="0". Markup only; no text changes.
 */
export function focusableCode(html: string): string {
	return html.replace(/<pre(?![^>]*\btabindex=)(\s|>)/g, '<pre tabindex="0"$1');
}

/** The analytics sentence the privacy notice shows, as scripts/build.mjs wrote it. */
export function analyticsStatus(enabled: boolean): string {
	return enabled
		? 'We use Cloudflare Web Analytics on selected public pages of audiokit.ai to measure aggregate page traffic and page performance.'
		: 'Cloudflare Web Analytics is currently disabled on this public site. When it is switched on, selected public pages of audiokit.ai use it to measure aggregate page traffic and page performance.';
}

function structuredData() {
	const siteUrl = siteConfig.siteUrl;
	const data = {
		'@context': 'https://schema.org',
		'@type': 'WebAPI',
		'@id': `${siteUrl}/#api`,
		name: 'AudioKit',
		url: `${siteUrl}/`,
		description:
			'Audio analysis and processing API: loudness, tempo, key, fingerprints, genre and mood tags, transcodes and previews, delivered by signed webhook with provenance on every result.',
		documentation: `${siteUrl}/docs/`,
		image: `${siteUrl}/og.png`,
		logo: `${siteUrl}/logo.png`,
		provider: {
			'@type': 'Organization',
			name: 'AudioKit',
			url: `${siteUrl}/`,
			logo: `${siteUrl}/logo.png`
		},
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
			description: 'Free plan',
			url: `${siteUrl}/pricing/`
		}
	};
	return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export async function renderSitePage(path: string): Promise<RenderedPage> {
	const entry = SITE_PAGES.find((p) => p.path === path);
	if (!entry) throw new Error(`no public page at ${path}`);
	const { doc } = await loadContract();
	const version: string = doc.info?.version ?? '?';

	let meta: PageMeta;
	let body: string;
	if (entry.source === 'reference') {
		const ops = operationModel(doc);
		meta = {
			title: 'API reference',
			description: `AudioKit API v${version} reference: endpoints, operations, webhook, errors and schemas, generated from the OpenAPI contract.`,
			layout: 'docs',
			nav: 'reference'
		};
		body = renderReference(doc, ops, siteConfig);
	} else {
		const file = `/src/lib/site/pages/${entry.source}`;
		const text = sources[file];
		if (text === undefined) throw new Error(`missing page source ${file}`);
		const parsed = parsePage(text, entry.source);
		meta = parsed.meta;
		body = fill(parsed.body, tokens(doc, version), entry.source);
	}

	// Facts only Nate can supply are marked TODO(privacy); a production build refuses them.
	assertNoGaps(new Map([[path, body]]), isRelease());

	return {
		path,
		meta,
		body: focusableCode(body),
		toc: meta.layout === 'docs' ? toc(body) : [],
		apiVersion: version,
		structuredData: path === '/' && !meta.noindex ? structuredData() : ''
	};
}

const KIT_FORM_ID = normalizeKitFormId(siteConfig.kitFormId);
const KIT_DISCLOSURE = KIT_FORM_ID !== '' || siteConfig.kitDisclosure === true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tokens(doc: any, version: string): Record<string, string> {
	const ops = operationModel(doc);
	return {
		API_BASE: siteConfig.apiBaseUrl,
		API_VERSION: esc(version),
		// Named in the privacy notice until the cut-over drops it (plan, C).
		CONSOLE_URL: siteConfig.consoleUrl,
		// One origin (AudioKit 0053): sign-in and sign-up are this app's own routes.
		CONSOLE_LOGIN: '/login',
		CONSOLE_SIGNUP: '/signup',
		OPERATION_LIST: renderOperationList(doc, ops),
		OPERATION_COUNT: String(ops.length),
		ANALYTICS_STATUS: analyticsStatus(analyticsToken() !== ''),
		PRODUCT_UPDATES_FORM: productUpdatesForm(KIT_FORM_ID),
		WEBHOOK_TEST_VECTOR: webhookTestVector(doc),
		BASE_URL_NOTE: siteConfig.apiBaseUrlIsPlaceholder
			? `<p class="note">Examples use <code>${esc(siteConfig.apiBaseUrl)}</code>. Replace it with the base URL that comes with your API key.</p>`
			: ''
	};
}

export function fill(text: string, values: Record<string, string>, file: string): string {
	return applyKitBlocks(text, KIT_DISCLOSURE).replace(
		/\{\{([A-Z_]+)\}\}/g,
		(_: string, name: string) => {
			if (!(name in values)) throw new Error(`${file}: unknown token {{${name}}}`);
			return values[name];
		}
	);
}
