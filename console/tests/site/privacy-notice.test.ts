// The privacy notice (EPSILON-99, shared decision 0012) and its release gate, on the public page
// this app serves. Ported from the static site's test/privacy-notice.test.mjs (EPSILON-169 PR 2).
// The notice must describe what the code actually does. Its changes from the static site's copy
// (self-hosted fonts; the theme switch on the public pages too) are Nate's to approve, and
// tests/site-parity.test.ts lists them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { assertNoGaps, findGaps, isRelease } from '../../src/lib/site/release-gaps.js';
import { renderSitePage } from '../../src/lib/server/site/render';

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const notice = read('src/lib/site/pages/privacy.html');
const session = read('src/lib/session.ts');
const theme = read('src/lib/theme.ts');
const text = notice.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('the public footer links the notice', () => {
	assert.match(
		read('src/lib/components/SiteFooter.svelte'),
		/href: '\/privacy\/', label: 'Privacy'/
	);
});

test('the console links the notice on the auth screens and in the shell', () => {
	for (const file of [
		'src/lib/components/console/AuthCard.svelte',
		'src/lib/components/console/SideNav.svelte'
	]) {
		assert.match(read(file), /href="https:\/\/audiokit\.ai\/privacy\/"/, file);
	}
});

test('it names every provider that handles personal data', () => {
	for (const name of [
		'Railway',
		'Modal',
		'Netlify',
		'Stripe',
		'Sentry',
		'Resend',
		'Cloudflare Web Analytics',
		'GitHub'
	]) {
		assert.ok(text.includes(name), name);
	}
});

test('fonts are self-hosted, so Google Fonts is no longer a provider (shared 0039, audit F-08)', () => {
	assert.doesNotMatch(text, /Google|fonts\.googleapis\.com|fonts\.gstatic\.com/);
	assert.match(text, /load their typefaces from our own site, not from a font provider/);
	assert.doesNotMatch(read('src/app.html'), /fonts\.googleapis|fonts\.gstatic/);
});

test("it states GitHub's role, safeguard and 90-day retention for encrypted backups (decision 0048)", () => {
	assert.match(text, /GitHub[^]*?encrypted backups of our databases/);
	assert.match(text, /GitHub:[^]*?Data Privacy Framework[^]*?standard contractual clauses/);
	assert.match(text, /Encrypted database backups at GitHub: 90 days/);
});

test('it has the sections a notice needs', () => {
	for (const id of ['controller', 'bases', 'providers', 'transfers', 'retention', 'rights']) {
		assert.match(notice, new RegExp(`<h2 id="${id}"`), id);
	}
});

test('device storage it describes matches the code', () => {
	const cookie = /SESSION_COOKIE = '([^']+)'/.exec(session)![1];
	assert.ok(text.includes(cookie), `notice names the ${cookie} cookie`);
	assert.match(session, /SESSION_MAX_AGE_SECONDS = 60 \* 60 \* 8;/);
	assert.match(text, /expires after 8 hours/);
	// The signup source stores nothing on the device (decisions 0040 and 0041, EPSILON-98).
	assert.match(text, /Nothing is stored on your device for this: no cookie and no browser storage/);
	assert.doesNotMatch(text, /sessionStorage|localStorage|ak_first_touch/);
	assert.match(text, /Public pages set no cookies/);
});

test('the theme choice it describes matches the code, on the public pages too (AudioKit 0079)', () => {
	const key = /THEME_STORAGE_KEY = '([^']+)'/.exec(theme)![1];
	assert.ok(!text.includes(key), 'notice omits the internal theme storage key');
	assert.ok(
		text.includes(
			'If you choose Light or Dark on audiokit.ai, your browser remembers that choice on this device. Choosing System clears the saved choice and follows your device’s appearance settings.'
		)
	);
	assert.match(theme, /if \(choice === 'system'\) storage\?\.removeItem\(THEME_STORAGE_KEY\)/);
	// The switch the notice describes is in the public footer.
	assert.match(read('src/lib/components/SiteFooter.svelte'), /<ThemeToggle \/>/);
});

test('it describes the first-touch signup source billing stores (decision 0040)', () => {
	for (const s of ['host name only', 'utm_', 'landing', 'set once, when the account is created']) {
		assert.ok(text.includes(s), s);
	}
});

test('it names the controller, address and contact Nate supplied (shared 0013, 0015)', () => {
	assert.match(
		text,
		/The controller for the personal data described here is Epsilon Records LLC, a company registered in Nevada, USA, with its address at Nieuwe Uilenburgerstraat 21C, 1011LM Amsterdam\./
	);
	assert.match(notice, /href="mailto:hello@epsilonrecords\.com">hello@epsilonrecords\.com</);
	assert.doesNotMatch(text, /Epsilon Records (B\.V\.|BV|V\.O\.F|VOF|Ltd|Inc)/i);
});

test('the analytics statement follows the configured beacon', () => {
	assert.match(notice, /\{\{ANALYTICS_STATUS\}\}/);
	assert.match(
		read('src/lib/server/site/render.ts'),
		/ANALYTICS_STATUS: analyticsStatus\(analyticsToken\(\) !== ''\)/
	);
});

test('no client is named on the public page', () => {
	assert.doesNotMatch(notice, /\bERMS\b|Epsilon Records Management/i);
});

test('gaps are found, and refused only in a release build', () => {
	const html =
		'<p><mark class="gap">TODO(privacy): the controller</mark> and <mark class="gap">TODO(privacy): a contact</mark></p>';
	assert.deepEqual(findGaps(html), ['the controller', 'a contact']);
	assert.doesNotThrow(() => assertNoGaps(new Map([['/privacy/', html]]), false));
	assert.throws(
		() => assertNoGaps(new Map([['/privacy/', html]]), true),
		/2 fact\(s\) still missing/
	);
	assert.doesNotThrow(() => assertNoGaps(new Map([['/privacy/', '<p>complete</p>']]), true));
	assert.equal(isRelease({ CONTEXT: 'production' }, []), true);
	assert.equal(isRelease({ CONTEXT: 'deploy-preview' }, []), false);
	assert.equal(isRelease({}, ['node', 'build', '--release']), true);
	assert.equal(isRelease({}, []), false);
});

test('every gap in the notice is a visible, marked placeholder', () => {
	const marked = [...notice.matchAll(/<mark class="gap">TODO\(privacy\):[^<]+<\/mark>/g)].length;
	assert.equal(marked, findGaps(notice).length, 'each TODO(privacy) sits in a <mark class="gap">');
});

test('a release build refuses to render the notice while it has gaps', async () => {
	const before = process.env.CONTEXT;
	process.env.CONTEXT = 'production';
	try {
		const run = renderSitePage('/privacy/');
		if (findGaps(notice).length) await assert.rejects(run, /release build refused/);
		else await run;
	} finally {
		if (before === undefined) delete process.env.CONTEXT;
		else process.env.CONTEXT = before;
	}
});
