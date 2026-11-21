import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { htmlFiles, readBuilt } from './lib';

/**
 * The prerendered pages fit the Content-Security-Policy SvelteKit writes into each one
 * (vite.config.ts, widened for the public pages by src/lib/server/site/public-head.ts).
 * Ported from the static site's test/csp-output.mjs (EPSILON-118, EPSILON-169 PR 2): there the
 * policy was a header in netlify.toml and the pages had no inline script; here SvelteKit's own
 * inline script is allowed by its hash, and every other script must be a file.
 */

const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');

function policy(html: string, where: string) {
	const meta = /<meta http-equiv="content-security-policy" content="([^"]+)"/.exec(html);
	expect(meta, `${where}: Content-Security-Policy meta tag`).toBeTruthy();
	return new Map(
		meta![1]
			.split(';')
			.map((d) => d.trim().split(/\s+/))
			.map(([name, ...sources]) => [name, sources] as const)
	);
}

describe('the headers Netlify adds to every file', () => {
	it('keeps HSTS, framing, nosniff, referrer and permissions headers', () => {
		expect(toml).toMatch(/Strict-Transport-Security = "max-age=31536000; includeSubDomains"/);
		expect(toml).toMatch(/X-Frame-Options = "DENY"/);
		expect(toml).toMatch(/X-Content-Type-Options = "nosniff"/);
		expect(toml).toMatch(/Referrer-Policy = "strict-origin-when-cross-origin"/);
		expect(toml).toMatch(/Permissions-Policy = "camera=\(\), microphone=\(\), geolocation=\(\)"/);
	});
});

describe('each prerendered page fits its policy', () => {
	it('has the expected pages', () => {
		expect(htmlFiles).toEqual([
			'404.html',
			'check-your-inbox/index.html',
			'docs/index.html',
			'docs/mcp/index.html',
			'docs/reference/index.html',
			'docs/sdks/index.html',
			'index.html',
			'pricing/index.html',
			'privacy/index.html',
			'subscribed/index.html'
		]);
	});

	for (const file of htmlFiles) {
		it(file, () => {
			const html = readBuilt(file);
			const csp = policy(html, file);
			const allows = (directive: string, url: string) => {
				const sources = csp.get(directive) ?? csp.get('default-src') ?? [];
				if (url.startsWith('/') || url.startsWith('.')) return sources.includes("'self'");
				return sources.includes(new URL(url).origin);
			};
			for (const [name, value] of [
				['object-src', "'none'"],
				['base-uri', "'self'"],
				['default-src', "'self'"]
			]) {
				expect(csp.get(name), name).toEqual([value]);
			}
			// Inline style attributes are allowed by the app's policy (vite.config.ts); scripts are not.
			expect(csp.get('style-src')).toContain("'unsafe-inline'");
			expect(csp.get('script-src')).not.toContain("'unsafe-inline'");

			for (const [, tag, body] of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)) {
				const type = /\stype\s*=\s*"([^"]*)"/i.exec(tag)?.[1].trim().toLowerCase();
				if (type === 'application/ld+json') {
					expect(() => JSON.parse(body), `${file}: JSON-LD parses`).not.toThrow();
					continue;
				}
				const src = /\ssrc="([^"]+)"/.exec(tag)?.[1];
				if (src) {
					expect(allows('script-src', src), `${file}: script-src allows ${src}`).toBe(true);
					expect(src, `${file}: no data: script`).not.toMatch(/^data:/);
				} else {
					const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
					expect(csp.get('script-src'), `${file}: inline script has its hash`).toContain(hash);
				}
			}
			expect(html, `${file}: inline <style>`).not.toMatch(/<style\b/);
			expect(html, `${file}: inline event handler`).not.toMatch(/<[^>]+\son[a-z]+="/);
			for (const [, a, b] of html.matchAll(
				/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"|<link[^>]*href="([^"]+)"[^>]*rel="stylesheet"/g
			)) {
				expect(allows('style-src', a ?? b), `${file}: style-src allows ${a ?? b}`).toBe(true);
			}
			for (const [, action] of html.matchAll(/<form[^>]*\saction="([^"]+)"/g)) {
				expect(allows('form-action', action), `${file}: form-action allows ${action}`).toBe(true);
			}
			// The Kit form's redirect comes back to audiokit.ai (shared 0027).
			expect(csp.get('form-action')).toEqual([
				"'self'",
				'https://app.kit.com',
				'https://audiokit.ai'
			]);
			// No font, style or script from Google (shared 0039, audit F-08).
			expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
		});
	}
});
