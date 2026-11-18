import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import staticConfig from '../../site.config.mjs';
import { siteConfig } from '../src/lib/site/config';

/**
 * EPSILON-169 PR 2 moves the public pages into this app with their text as it is. Until the
 * cut-over the static site in ../src still serves audiokit.ai, so the two copies must not drift
 * (the plan freezes site copy; legal and pricing fixes land in both). This test fails when they
 * do. It goes with the static site's source in the cleanup (plan, X).
 */

const repo = fileURLToPath(new URL('../../', import.meta.url));
const app = fileURLToPath(new URL('../', import.meta.url));
const read = (path: string) => readFileSync(path, 'utf8');

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

/**
 * The only text changes, all in the privacy notice, following Nate's rule on knowledge#135 (shared
 * 0012): the fonts are self-hosted (PR 1), the notice takes effect at the cut-over (23 Nov
 * 2026), and nothing refers to the console, which goes away with the cut-over. The cookie keeps
 * its real name, ak_console_session.
 */
const PRIVACY_CHANGES: [string, string][] = [
	[
		'"description": "What AudioKit collects on audiokit.ai, in the console and through the API,',
		'"description": "What AudioKit collects on audiokit.ai and through the API,'
	],
	[
		'when you visit audiokit.ai, use the console at {{CONSOLE_URL}} or call the API,',
		'when you visit audiokit.ai, sign in to your account there or call the API,'
	],
	[
		'<p class="note">Effective from 12 November 2026.</p>',
		'<p class="note">Effective from 23 November 2026.</p>'
	],
	[
		'<li>The public site sets no cookies. The console sets one sign-in cookie.</li>',
		'<li>Public pages set no cookies. Signing in sets one cookie.</li>'
	],
	[
		'<p>Pages on audiokit.ai load their typefaces from Google Fonts (<code>fonts.googleapis.com</code> and <code>fonts.gstatic.com</code>). Your browser therefore connects to Google and sends it your IP address and browser details when you open a page.</p>',
		'<p>Pages on audiokit.ai load their typefaces from our own site, not from a font provider. Opening a page sends nothing to another company for fonts.</p>'
	],
	[
		'It is not used in the console, the API or the billing service,',
		'It is not used on signed-in pages, the API or the billing service,'
	],
	['<h2 id="account">Your account and the console</h2>', '<h2 id="account">Your account</h2>'],
	[
		'<p>Once you are signed in, the console sets one cookie, <code>ak_console_session</code>. It keeps you signed in, cannot be read by scripts on the page, and expires after 8 hours. The console needs it to work. The console runs no analytics script.</p>',
		'<p>Once you are signed in, audiokit.ai sets one cookie, <code>ak_console_session</code>. It keeps you signed in, cannot be read by scripts on the page, and expires after 8 hours. Signed-in pages need it to work, and they run no analytics script.</p>'
	],
	[
		'<p>If you pick Light or Dark with the theme switch on audiokit.ai, your browser keeps that choice in its local storage as <code>ak-theme</code>. It is saved only when you pick a theme, is used for nothing else, and is removed when you pick System again.</p>',
		'<p>If you choose Light or Dark on audiokit.ai, your browser remembers that choice on this device. Choosing System clears the saved choice and follows your device’s appearance settings.</p>'
	],
	[
		'If you arrive at the console directly, the host name',
		'If you go straight to the sign-up page, the host name'
	],
	[
		'a different list from the email preferences in the console.',
		'a different list from the email preferences in your account settings.'
	],
	[
		'which you can withdraw in the console at any time</td>',
		'which you can withdraw in your account settings at any time</td>'
	],
	[
		'<tr><td>Netlify</td><td>Hosts audiokit.ai and the console</td>',
		'<tr><td>Netlify</td><td>Hosts audiokit.ai</td>'
	],
	['    <tr><td>Google Fonts</td><td>Typefaces for the site</td><td>United States</td></tr>\n', ''],
	[
		'    <li><strong>Google Fonts:</strong> your browser contacts Google directly, not through us. See <a href="https://policies.google.com/privacy">Google\'s privacy policy</a> for how Google handles international transfers.</li>\n',
		''
	],
	['<li><strong>Console sign-in cookie:</strong>', '<li><strong>Sign-in cookie:</strong>'],
	[
		'You can delete your account yourself in the console, or email',
		'You can delete your account yourself in your account settings, or email'
	],
	[
		"(you can change your name in the console's settings)",
		'(you can change your name in your account settings)'
	]
];

describe('the public pages are the static site’s, as they are', () => {
	const staticPages = join(repo, 'src/pages');
	const appPages = join(app, 'src/lib/site/pages');
	const files = walk(staticPages).map((f) => relative(staticPages, f));

	it('has every page and no other', () => {
		expect(
			walk(appPages)
				.map((f) => relative(appPages, f))
				.sort()
		).toEqual([...files].sort());
	});

	for (const file of files) {
		it(file, () => {
			let expected = read(join(staticPages, file));
			if (file === 'privacy.html') {
				for (const [from, to] of PRIVACY_CHANGES) {
					expect(expected.split(from).length, from).toBe(2);
					expected = expected.replace(from, to);
				}
			}
			expect(read(join(appPages, file))).toBe(expected);
		});
	}
});

describe('the build modules are the static site’s, as they are', () => {
	for (const [ours, theirs] of [
		['src/lib/site/reference.js', 'scripts/reference.mjs'],
		['src/lib/site/kit-form.js', 'scripts/kit-form.mjs'],
		['src/lib/site/release-gaps.js', 'scripts/release-gaps.mjs'],
		['src/lib/site/analytics-config.js', 'scripts/analytics-config.mjs'],
		['src/lib/site/llms.txt', 'src/static/llms.txt'],
		['src/lib/public/analytics.js', 'src/static/analytics.js']
	]) {
		it(ours, () => expect(read(join(app, ours))).toBe(read(join(repo, theirs))));
	}

	it('first-touch.js differs only in finding sign-up and sign-in on its own origin', () => {
		const ours = read(join(app, 'src/lib/public/first-touch.js'));
		const theirs = read(join(repo, 'src/static/first-touch.js'));
		const from =
			'    const consoleUrl = document.currentScript?.dataset.consoleUrl;\n    if (!consoleUrl) return;';
		const to =
			"    // One app (AudioKit 0053, EPSILON-169): sign-up and sign-in are on this page's own origin,\n    // unless the script names another.\n    const consoleUrl = document.currentScript?.dataset.consoleUrl || location.origin;";
		expect(theirs.split(from).length).toBe(2);
		expect(ours).toBe(theirs.replace(from, to));
	});

	it('the settings match site.config.mjs', () => {
		for (const key of Object.keys(siteConfig) as (keyof typeof siteConfig)[]) {
			expect(siteConfig[key], key).toBe(staticConfig[key]);
		}
	});

	it('the shared images are the same files', () => {
		for (const file of ['favicon.svg', 'og.png', 'logo.png']) {
			expect(
				readFileSync(join(app, 'static', file)).equals(
					readFileSync(join(repo, 'src/static', file))
				),
				file
			).toBe(true);
		}
	});
});
