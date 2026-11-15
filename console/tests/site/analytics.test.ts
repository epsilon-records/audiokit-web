// The Cloudflare Web Analytics loader on the public pages (shared decision 0011). Ported from the
// static site's test/analytics.test.mjs (EPSILON-169 PR 2); the loader is the same file.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'vitest';
import { analyticsToken, TOKEN_VARIABLE } from '../../src/lib/site/analytics-config.js';
import { siteConfig as config } from '../../src/lib/site/config';
import { publicHead } from '../../src/lib/server/site/public-head';

const source = readFileSync(new URL('../../src/lib/public/analytics.js', import.meta.url), 'utf8');
const safe = 'https://audiokit.ai/';
const token = 'a'.repeat(32); // Test-only fixture; never a configured/shipped tracker.

type Run = {
	current?: string;
	original?: string;
	referrer?: string | null;
	id?: string | null;
	entries?: { name?: string }[];
	duplicate?: boolean;
};
function run({
	current = safe,
	original = safe,
	referrer = '',
	id = token,
	entries,
	duplicate = false
}: Run = {}) {
	const scripts: Record<string, string>[] = [];
	const context = vm.createContext({
		URL,
		location: { href: current },
		performance: { getEntriesByType: () => entries ?? [{ name: original }] },
		window: {},
		document: {
			currentScript: { dataset: { siteToken: id } },
			referrer,
			querySelector: () => duplicate,
			createElement: () => ({
				setAttribute(this: Record<string, string>, k: string, v: string) {
					this[k] = v;
				}
			}),
			head: { append: (s: Record<string, string>) => scripts.push(s) }
		}
	});
	vm.runInContext(source, context);
	vm.runInContext(source, context);
	return scripts;
}

test('missing real configuration stays disabled', () => {
	assert.equal(
		'cloudflareWebAnalyticsToken' in config,
		false,
		'the token is not committed in the config'
	);
	for (const id of ['', null, 'UNKNOWN', 'example']) assert.equal(run({ id }).length, 0);
});

test('clean public documents load exactly once with document-only metrics', () => {
	const [beacon] = run();
	assert.equal(run().length, 1);
	assert.equal(beacon.referrerPolicy, 'no-referrer');
	assert.deepEqual(JSON.parse(beacon['data-cf-beacon']), { token, spa: false });
	assert.equal(run({ duplicate: true }).length, 0);
});

test('current, original navigation and referrer all fail closed', () => {
	const unsafe = [
		safe + '?token=FABRICATED_SECRET',
		safe + '#FABRICATED_SECRET',
		safe + '?',
		safe + '#',
		'https://audiokit.ai/auth/callback',
		'https://audiokit.ai/login',
		'https://audiokit.ai/dashboard',
		'https://audiokit.ai/billing/',
		'https://audiokit.ai/search/',
		'https://audiokit.ai/catalog/FABRICATED_SECRET',
		'https://audiokit.ai/docs/unknown/',
		'https://audiokit.ai/%61uth/',
		'not a URL'
	];
	for (const url of unsafe)
		for (const key of ['current', 'original', 'referrer']) {
			assert.equal(run({ [key]: url }).length, 0, `${key}: ${url}`);
		}
	for (const host of [
		'console.audiokit.ai',
		'api.audiokit.ai',
		'billing.audiokit.ai',
		'preview.netlify.app',
		'www.audiokit.ai',
		'localhost'
	]) {
		assert.equal(run({ current: `https://${host}/` }).length, 0);
		assert.equal(run({ original: `https://${host}/` }).length, 0);
	}
	for (const entries of [[], [{ name: safe }, { name: safe }], [{}]])
		assert.equal(run({ entries }).length, 0);
	assert.equal(run({ referrer: null }).length, 0);
});

test('the token comes from the environment, in the production context only', () => {
	assert.equal(TOKEN_VARIABLE, 'PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN');
	const env = (extra: Record<string, string | undefined>) => ({
		[TOKEN_VARIABLE]: token,
		...extra
	});
	assert.equal(analyticsToken(env({ CONTEXT: 'production' })), token);
	assert.equal(
		analyticsToken(env({ CONTEXT: 'production', [TOKEN_VARIABLE]: ` ${token}\n` })),
		token
	);
	for (const value of [undefined, '', 'short', 'z'.repeat(32), token + 'a', 'example']) {
		assert.equal(analyticsToken({ CONTEXT: 'production', [TOKEN_VARIABLE]: value }), '');
	}
	assert.equal(analyticsToken({ CONTEXT: 'production' }), '');
	for (const CONTEXT of ['deploy-preview', 'branch-deploy', 'dev', '', undefined]) {
		assert.equal(analyticsToken(env({ CONTEXT })), '', String(CONTEXT));
	}
});

test('the loader goes on indexable public pages in production builds only', () => {
	const env = { CONTEXT: 'production', [TOKEN_VARIABLE]: token };
	assert.match(
		publicHead(true, env),
		new RegExp(`<script src="[^"]*analytics[^"]*" data-site-token="${token}" defer></script>`)
	);
	assert.doesNotMatch(
		publicHead(false, env),
		/analytics|data-site-token/,
		'noindex pages never load it'
	);
	assert.doesNotMatch(
		publicHead(true, { [TOKEN_VARIABLE]: token }),
		/data-site-token/,
		'not outside production'
	);
	assert.doesNotMatch(
		publicHead(true, env),
		/cloudflareinsights|data-cf-beacon/,
		'only the guarded loader'
	);
});

test('no Cloudflare site token is committed in the source', () => {
	for (const file of [
		'src/lib/site/config.ts',
		'src/lib/server/site/public-head.ts',
		'src/lib/site/analytics-config.js'
	]) {
		const text = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
		assert.doesNotMatch(text, /["'`][a-f0-9]{32}["'`]/i, file);
	}
});
