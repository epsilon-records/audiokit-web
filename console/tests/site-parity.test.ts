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

const repo = new URL('../../', import.meta.url).pathname;
const app = new URL('../', import.meta.url).pathname;
const read = (path: string) => readFileSync(path, 'utf8');

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

/**
 * The only text changes, all in the privacy notice, each for Nate's approval (shared 0012):
 * the fonts are self-hosted now (PR 1, plan "Fonts"), and the theme switch is on the public
 * pages too (AudioKit 0079).
 */
const PRIVACY_CHANGES: [string, string][] = [
	[
		'<p>Pages on audiokit.ai and in the console load their typefaces from Google Fonts (<code>fonts.googleapis.com</code> and <code>fonts.gstatic.com</code>). Your browser therefore connects to Google and sends it your IP address and browser details when you open a page.</p>',
		'<p>Pages on audiokit.ai and in the console load their typefaces from our own site, not from a font provider. Opening a page sends nothing to another company for fonts.</p>'
	],
	["with the console's theme switch,", 'with the theme switch on audiokit.ai or in the console,'],
	[
		'    <tr><td>Google Fonts</td><td>Typefaces for the site and console</td><td>United States</td></tr>\n',
		''
	],
	[
		`    <li><strong>Google Fonts:</strong> your browser contacts Google directly, not through us. See <a href="https://policies.google.com/privacy">Google's privacy policy</a> for how Google handles international transfers.</li>\n`,
		''
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
