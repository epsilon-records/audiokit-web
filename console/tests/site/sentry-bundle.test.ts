// The Sentry browser bundle is the one third-party file a public page runs from another host at a
// fixed version (shared decision 0003). Its tag pins that exact file by checksum (audit A-20).
import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
	publicHead,
	SENTRY_BUNDLE_INTEGRITY,
	SENTRY_BUNDLE_VERSION,
	SENTRY_CDN
} from '../../src/lib/server/site/public-head';

const env = { SENTRY_DSN: 'https://public@o0.ingest.example.test/1' }; // Test-only fixture.

function bundleTag(html: string) {
	const tags = html.match(/<script\b[^>]*>/g) ?? [];
	return tags.filter((tag) => tag.includes(SENTRY_CDN));
}

test('the Sentry bundle tag pins the file by checksum', () => {
	const tags = bundleTag(publicHead(true, env));
	assert.equal(tags.length, 1);
	const [tag] = tags;
	assert.ok(tag.includes(`src="${SENTRY_CDN}/${SENTRY_BUNDLE_VERSION}/bundle.tracing.min.js"`));
	assert.ok(tag.includes(`integrity="${SENTRY_BUNDLE_INTEGRITY}"`));
	// Without CORS mode the browser cannot check a cross-origin file and blocks it.
	assert.ok(tag.includes('crossorigin="anonymous"'));
});

test('the checksum is a whole SHA-384 value', () => {
	const match = /^sha384-([A-Za-z0-9+/]{64})$/.exec(SENTRY_BUNDLE_INTEGRITY);
	assert.ok(match);
	assert.equal(Buffer.from(match[1], 'base64').length, 48);
});

test('no other script on a public page comes from another host', () => {
	const tags = publicHead(true, env).match(/<script\b[^>]*>/g) ?? [];
	const external = tags.filter((tag) => /src="https?:/.test(tag));
	assert.deepEqual(external, bundleTag(publicHead(true, env)));
});

test('a page without a DSN carries no Sentry bundle', () => {
	assert.deepEqual(bundleTag(publicHead(true, {})), []);
});
