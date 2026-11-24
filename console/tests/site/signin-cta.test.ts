import { fileURLToPath } from 'node:url';
// Every sign-in and sign-up CTA on the public pages points at this app's own /login and /signup
// (AudioKit 0053: one app at audiokit.ai), and the early-access "Request access" form stays gone.
// Ported from the static site's test/signin-cta.test.mjs (EPSILON-169 PR 2), where the links were
// absolute because the console was a separate site.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'vitest';
import { SITE_PAGES } from '../../src/lib/site/routes';
import { renderSitePage } from '../../src/lib/server/site/render';

const app = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string) => readFileSync(join(app, rel), 'utf8');

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

const pageDir = join(app, 'src/lib/site/pages');
const pageFiles = walk(pageDir).map((f) => relative(pageDir, f));
const pages = pageFiles.map((f) => readFileSync(join(pageDir, f), 'utf8'));
const allPages = pages.join('\n');
const rendered = await Promise.all(SITE_PAGES.map((p) => renderSitePage(p.path)));
const header = read('src/lib/components/SiteHeader.svelte');
const render = read('src/lib/server/site/render.ts');

test('the sign-in and sign-up targets are this app’s routes', () => {
	assert.ok(existsSync(join(app, 'src/routes/login/+page.svelte')), '/login is the link target');
	assert.ok(existsSync(join(app, 'src/routes/signup/+page.svelte')), '/signup is the link target');
	assert.match(render, /CONSOLE_LOGIN: '\/login'/);
	assert.match(render, /CONSOLE_SIGNUP: '\/signup'/);
});

test("the header's CTAs sign in and sign up, with a full page load into the app", () => {
	assert.match(header, /<Button href="\/login" data-sveltekit-reload>Sign in<\/Button>/);
	assert.match(
		header,
		/<Button href="\/signup" variant="primary" data-sveltekit-reload>Start free<\/Button>/
	);
});

test('pages link sign-in through a token, never a hardcoded origin', () => {
	assert.ok(allPages.includes('{{CONSOLE_LOGIN}}'), 'pages should use {{CONSOLE_LOGIN}}');
	assert.doesNotMatch(allPages, /console\.audiokit\.ai/, "the console's origin is not in a page");
	for (const page of rendered) {
		assert.doesNotMatch(page.body, /https:\/\/console\.audiokit\.ai\/(login|signup)/, page.path);
	}
});

test('no request-access form, link or copy is left behind', () => {
	assert.doesNotMatch(allPages + render, /Request( an?| API)? access/i);
	assert.doesNotMatch(allPages + render, /#access/, 'the removed section was /#access');
	assert.ok(!pageFiles.includes('thanks.html'), "the form's destination page is gone");
});

test('no unpublished mailbox is advertised', () => {
	// The one exception is the privacy contact Nate chose in shared decision 0013
	// (hello@epsilonrecords.com), and only on the privacy notice and the terms (AudioKit 0088, 0090).
	const PRIVACY_CONTACT = 'mailto:hello@epsilonrecords.com';
	pageFiles.forEach((file, i) => {
		const html =
			file.endsWith('privacy.html') || file.endsWith('terms.html')
				? pages[i].replaceAll(`"${PRIVACY_CONTACT}"`, '""')
				: pages[i];
		assert.doesNotMatch(
			html,
			/mailto:/i,
			`${file}: pages must not advertise an address that cannot receive`
		);
	});
	assert.doesNotMatch(allPages, /contact (us|sales)/i, 'there is no contact channel to point at');
});
