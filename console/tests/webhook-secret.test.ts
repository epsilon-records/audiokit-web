import { describe, expect, it } from 'vitest';
import { createApiClient } from '../src/lib/api-client';

/**
 * EPSILON-124: billing returns each key's webhook secret once, with the key — inside `api_key` on
 * `POST /v1/api-keys`, and beside `api_key` on the exchange that creates the account. The console
 * carries it to the reveal screens, and reads a billing service that predates it (no member) as
 * null rather than failing. Secrets here are generated per run, never literals.
 */

const randomHex = (bytes: number) =>
	Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
		b.toString(16).padStart(2, '0')
	).join('');
const freshKey = () => `ak_test_${randomHex(12)}`;
const freshWebhookSecret = () => `whsec_${randomHex(24)}`;

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function clientFor(build: (url: string, init: RequestInit) => Response) {
	return createApiClient({
		baseUrl: 'https://billing.test',
		sessionToken: 'session-token',
		fetch: (async (input: RequestInfo | URL, init: RequestInit = {}) =>
			build(typeof input === 'string' ? input : input.toString(), init)) as typeof fetch
	});
}

const createdKey = (extra: Record<string, unknown> = {}) => ({
	id: 'k1',
	name: 'CI',
	api_key: freshKey(),
	key_prefix: 'ak_test_012',
	tier: 'pro',
	created_at: '2026-11-11T09:00:00.000Z',
	sync_state: 'synced',
	warning: 'Save this key and its webhook secret now.',
	...extra
});

describe('http adapter: webhook secret on a new key', () => {
	it('maps api_key.webhook_secret from POST /v1/api-keys', async () => {
		const webhookSecret = freshWebhookSecret();
		const resource = createdKey({ webhook_secret: webhookSecret });
		const created = await clientFor(() => jsonResponse({ api_key: resource })).createApiKey('CI');

		expect(created.secret).toBe(resource.api_key);
		expect(created.webhookSecret).toBe(webhookSecret);
		expect(created.webhookSecret).not.toBe(created.secret);
	});

	it('reads a billing service that does not return one yet as null', async () => {
		const created = await clientFor(() => jsonResponse({ api_key: createdKey() })).createApiKey(
			'CI'
		);
		expect(created.webhookSecret).toBeNull();
		expect(created.secret).toMatch(/^ak_test_/);
	});

	it('never puts a webhook secret on listed keys', async () => {
		const keys = await clientFor(() =>
			jsonResponse({
				api_keys: [
					{
						id: 'k1',
						name: 'CI',
						key_prefix: 'ak_test_012',
						is_active: true,
						last_used_at: null,
						created_at: '2026-11-11T09:00:00.000Z'
					}
				]
			})
		).getApiKeys();
		expect(keys[0]).not.toHaveProperty('webhookSecret');
		expect(keys[0]).not.toHaveProperty('secret');
	});
});

describe('http adapter: webhook secret on the account-creating exchange', () => {
	it('maps the top-level webhook_secret beside api_key', async () => {
		const apiKey = freshKey();
		const webhookSecret = freshWebhookSecret();
		const result = await clientFor(() =>
			jsonResponse({
				user: { email: 'new@example.com' },
				token: 'session.jwt.value',
				created: true,
				api_key: apiKey,
				webhook_secret: webhookSecret
			})
		).exchangeMagicLink('one-time');

		expect(result).toMatchObject({ ok: true, created: true, apiKey, webhookSecret });
	});

	it('is null on a sign-in, and when billing predates it', async () => {
		const signIn = await clientFor(() =>
			jsonResponse({
				user: { email: 'you@example.com' },
				token: 'session.jwt.value',
				created: false,
				api_key: null,
				webhook_secret: null
			})
		).exchangeMagicLink('one-time');
		expect(signIn).toMatchObject({ ok: true, apiKey: null, webhookSecret: null });

		const older = await clientFor(() =>
			jsonResponse({
				user: { email: 'new@example.com' },
				token: 'session.jwt.value',
				created: true,
				api_key: freshKey()
			})
		).exchangeMagicLink('one-time');
		expect(older).toMatchObject({ ok: true, created: true, webhookSecret: null });
	});
});

describe('mock adapter: webhook secret', () => {
	const mock = () => createApiClient({ adapter: 'mock' });

	it('returns a fresh webhook secret with every created key', async () => {
		const client = mock();
		const [a, b] = [await client.createApiKey('a'), await client.createApiKey('b')];
		expect(a.webhookSecret).toMatch(/^whsec_mock_[0-9a-f]{32}$/);
		expect(b.webhookSecret).not.toBe(a.webhookSecret);
		for (const key of await client.getApiKeys()) expect(key).not.toHaveProperty('webhookSecret');
	});

	it('reveals one on the exchange that creates an account, and not on a sign-in', async () => {
		const client = mock();
		const tokenFor = async (email: string) => {
			const request = await client.requestMagicLink(email);
			return new URL(request.devLink!, 'https://console.test').searchParams.get('token')!;
		};

		const created = await client.exchangeMagicLink(await tokenFor('someone-new@example.com'));
		expect(created).toMatchObject({ ok: true, created: true });
		if (!created.ok) throw new Error('expected ok');
		expect(created.webhookSecret).toMatch(/^whsec_mock_/);

		const signIn = await client.exchangeMagicLink(await tokenFor('you@example.com'));
		expect(signIn).toMatchObject({ ok: true, created: false, webhookSecret: null });
	});
});
