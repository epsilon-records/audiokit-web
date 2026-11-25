// The scripts only the public, prerendered pages carry (EPSILON-169 PR 2), as the static site's
// build added them: Sentry's browser bundle (shared 0003), the Cloudflare Web Analytics loader
// (0011, production builds with a token only, indexable pages only) and the first-touch signup
// source (AudioKit 0040, 0041). hooks.server.ts adds them to the HTML while prerendering, so no
// server-rendered page, and no client-side navigation, ever carries them (shared 0016).
import analyticsUrl from '#lib/public/analytics.js?url&no-inline';
import firstTouchUrl from '#lib/public/first-touch.js?url&no-inline';
import sentryInitUrl from '#lib/public/sentry-init.js?url&no-inline';
import { analyticsToken } from '#lib/site/analytics-config.js';

export const SENTRY_BUNDLE_VERSION = '11.11.0';
// The published checksum of bundle.tracing.min.js at exactly that version. The browser refuses the
// file when it differs, so the two change together: a new version needs its own checksum.
export const SENTRY_BUNDLE_INTEGRITY =
	'sha384-DapdIcQEFNZyUqDc8lAPWiXW4AFNGR9Jrx8hZao3kvl7rsrJuHIlezXdpa/dRuWv';
export const SENTRY_CDN = 'https://browser.sentry-cdn.com';
export const BEACON_SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';
export const BEACON_CONNECT_ORIGIN = 'https://cloudflareinsights.com';
// The product-updates form posts to Kit, whose redirect comes back to audiokit.ai (shared 0027).
export const KIT_FORM_ACTIONS = ['https://app.kit.com', 'https://audiokit.ai'];

type Env = Record<string, string | undefined>;

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The DSN is public, but it still comes from the environment rather than the source. */
export const sentryDsn = (env: Env = process.env) => env.SENTRY_DSN || env.PUBLIC_SENTRY_DSN || '';

export function sentryInit(env: Env = process.env) {
	const dsn = sentryDsn(env);
	if (!dsn) return null;
	const init: Record<string, unknown> = {
		dsn,
		environment: env.CONTEXT || env.NODE_ENV || 'production',
		tracesSampleRate: 0.1
	};
	if (env.COMMIT_REF) init.release = env.COMMIT_REF;
	return init;
}

/** The tags for one public page's <head>. `indexable` is false for noindex pages. */
export function publicHead(indexable: boolean, env: Env = process.env): string {
	const tags: string[] = [];
	const init = sentryInit(env);
	if (init) {
		tags.push(
			`<script src="${SENTRY_CDN}/${SENTRY_BUNDLE_VERSION}/bundle.tracing.min.js" integrity="${SENTRY_BUNDLE_INTEGRITY}" crossorigin="anonymous"></script>`,
			`<script src="${sentryInitUrl}" data-sentry="${esc(JSON.stringify(init))}"></script>`
		);
	}
	const token = analyticsToken(env);
	if (indexable && token) {
		tags.push(`<script src="${analyticsUrl}" data-site-token="${esc(token)}" defer></script>`);
	}
	tags.push(`<script src="${firstTouchUrl}" defer></script>`);
	return tags.join('\n');
}

/**
 * Adds the public pages' hosts to the Content-Security-Policy that SvelteKit writes into a
 * prerendered page's <meta> tag (vite.config.ts states the policy every page shares).
 */
export function widenPublicCsp(html: string, env: Env = process.env): string {
	const add: Record<string, string[]> = { 'form-action': KIT_FORM_ACTIONS };
	const dsn = sentryDsn(env);
	if (dsn) {
		add['script-src'] = [SENTRY_CDN];
		add['connect-src'] = [`https://${new URL(dsn).host}`];
	}
	if (analyticsToken(env)) {
		add['script-src'] = [...(add['script-src'] ?? []), BEACON_SCRIPT_ORIGIN];
		add['connect-src'] = [...(add['connect-src'] ?? []), BEACON_CONNECT_ORIGIN];
	}
	let found = false;
	const out = html.replace(
		/(<meta http-equiv="content-security-policy" content=")([^"]*)(")/,
		(_, open: string, policy: string, close: string) => {
			found = true;
			const directives = policy.split(';').map((d) => d.trim());
			for (const [name, sources] of Object.entries(add)) {
				const i = directives.findIndex((d) => d.split(/\s+/)[0] === name);
				if (i === -1) directives.push(`${name} ${sources.join(' ')}`);
				else directives[i] = `${directives[i]} ${sources.join(' ')}`;
			}
			return `${open}${directives.join('; ')}${close}`;
		}
	);
	if (!found) throw new Error('prerendered page has no Content-Security-Policy meta tag');
	return out;
}

/** Everything a prerendered public page gets: its scripts and the wider policy. */
export function decoratePublicPage(html: string, env: Env = process.env): string {
	const indexable = !/<meta name="robots" content="noindex"/.test(html);
	return widenPublicCsp(html, env).replace('</head>', `${publicHead(indexable, env)}\n</head>`);
}
