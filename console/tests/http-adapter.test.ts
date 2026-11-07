import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	api,
	apiFor,
	ApiError,
	billingApiUrl,
	createApiClient,
	HttpApiError
} from '../src/lib/api-client';

const fixedNow = () => new Date('2026-11-14T12:00:00.000Z');

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

/** A minimal `fetch` that records calls and answers from a table. */
function fetchMock(
	handler: (url: string, init: RequestInit) => Response | Promise<Response>
): typeof fetch & { calls: { url: string; init: RequestInit }[] } {
	const calls: { url: string; init: RequestInit }[] = [];
	const mock = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
		const url = typeof input === 'string' ? input : input.toString();
		calls.push({ url, init });
		return handler(url, init);
	}) as typeof fetch & { calls: { url: string; init: RequestInit }[] };
	mock.calls = calls;
	return mock;
}

function header(init: RequestInit, name: string): string | null {
	return new Headers(init.headers).get(name);
}

function jwt(payload: Record<string, unknown>): string {
	const encode = (value: object) =>
		btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('adapter selection', () => {
	it('defaults to the mock when no billing URL is configured', () => {
		const client = createApiClient();
		expect(client).toBeDefined();
		// The mock resolves a mock-format token and needs no network.
		expect(client.parseSessionToken('mock.you%40example.com')?.email).toBe('you@example.com');
	});

	it('selects the HTTP adapter when a base URL is given', async () => {
		const fetchImpl = fetchMock(() => jsonResponse({ sent: true, email: 'you@example.com' }));
		const client = createApiClient({
			baseUrl: 'https://billing.test/',
			fetch: fetchImpl,
			now: fixedNow
		});

		await client.requestMagicLink('you@example.com');
		expect(fetchImpl.calls[0].url).toBe('https://billing.test/v1/auth/magic-link');
	});

	it('requires a base URL for the http adapter', () => {
		expect(() => createApiClient({ adapter: 'http' })).toThrow(/billing service URL/);
	});

	it('reads the base URL from the environment', () => {
		expect(billingApiUrl()).toBeUndefined();
		vi.stubEnv('PUBLIC_BILLING_API_URL', 'https://billing.test');
		expect(billingApiUrl()).toBe('https://billing.test');
	});

	it('rejects unknown adapters', () => {
		expect(() => createApiClient({ adapter: 'nope' as never })).toThrow(/Unknown API adapter/);
	});

	it('apiFor returns the shared mock when no URL is set', () => {
		expect(apiFor()).toBe(api);
	});
});

describe('http adapter: magic link', () => {
	it('posts the email and maps the response, including the dev link', async () => {
		const fetchImpl = fetchMock(() =>
			jsonResponse({
				sent: true,
				email: 'you@example.com',
				expires_at: '2026-11-14T12:10:00.000Z',
				dev_link: '/auth/callback?token=abc'
			})
		);
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			fetch: fetchImpl,
			now: fixedNow
		});

		const result = await client.requestMagicLink('  YOU@Example.COM ', { next: '/usage' });

		expect(result).toEqual({
			sent: true,
			email: 'you@example.com',
			expiresAt: '2026-11-14T12:10:00.000Z',
			devLink: '/auth/callback?token=abc'
		});
		const [call] = fetchImpl.calls;
		expect(call.url).toBe('https://billing.test/v1/auth/magic-link');
		expect(header(call.init, 'authorization')).toBeNull();
		expect(JSON.parse(String(call.init.body))).toEqual({
			email: 'you@example.com',
			next: '/usage'
		});
	});

	it('rejects a bad email without calling the service', async () => {
		const fetchImpl = fetchMock(() => jsonResponse({}));
		const client = createApiClient({ baseUrl: 'https://billing.test', fetch: fetchImpl });

		await expect(client.requestMagicLink('not-an-email')).rejects.toMatchObject({
			name: 'HttpApiError',
			code: 'invalid-email'
		});
		expect(fetchImpl.calls).toHaveLength(0);
	});

	it('exchanges a token for a session token', async () => {
		const fetchImpl = fetchMock(() =>
			jsonResponse({ user: { email: 'you@example.com' }, token: 'session.jwt.value' })
		);
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			fetch: fetchImpl,
			now: fixedNow
		});

		const result = await client.exchangeMagicLink('one-time');

		expect(result).toEqual({
			ok: true,
			token: 'session.jwt.value',
			session: { email: 'you@example.com', issuedAt: '2026-11-14T12:00:00.000Z' }
		});
		expect(fetchImpl.calls[0].url).toBe('https://billing.test/v1/auth/magic-link/exchange');
	});

	it('turns a rejected token into a result, not a throw', async () => {
		const fetchImpl = fetchMock(() => jsonResponse({ error: 'invalid_token' }, 401));
		const client = createApiClient({ baseUrl: 'https://billing.test', fetch: fetchImpl });

		await expect(client.exchangeMagicLink('used')).resolves.toEqual({
			ok: false,
			error: 'invalid-token'
		});
	});
});

describe('http adapter: reads', () => {
	it('combines /v1/auth/me and /v1/subscriptions/current into an account', async () => {
		const fetchImpl = fetchMock((url) => {
			if (url.endsWith('/v1/auth/me')) {
				return jsonResponse({
					user: {
						id: 'u1',
						email: 'you@example.com',
						name: 'Example User',
						email_verified_at: '2026-11-01T00:00:00.000Z'
					}
				});
			}
			if (url.endsWith('/v1/subscriptions/current')) {
				return jsonResponse({
					subscription: {
						id: 's1',
						tier: 'pro',
						status: 'active',
						current_period_start: '2026-11-01T00:00:00.000Z',
						current_period_end: '2026-12-01T00:00:00.000Z',
						cancel_at_period_end: true
					}
				});
			}
			return jsonResponse({}, 404);
		});
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			sessionToken: 'session-token',
			fetch: fetchImpl
		});

		const account = await client.getAccount();

		expect(account).toEqual({
			id: 'u1',
			name: 'Example User',
			email: 'you@example.com',
			emailVerified: true,
			plan: 'pro',
			renewsAt: '2026-12-01T00:00:00.000Z',
			pastDue: false,
			cancelsAt: '2026-12-01T00:00:00.000Z'
		});
		expect(
			fetchImpl.calls.every((call) => header(call.init, 'authorization') === 'Bearer session-token')
		).toBe(true);
	});

	it('sends no bearer and fails clearly without a session', async () => {
		const fetchImpl = fetchMock(() => jsonResponse({}));
		const client = createApiClient({ baseUrl: 'https://billing.test', fetch: fetchImpl });

		await expect(client.getAccount()).rejects.toMatchObject({ code: 'unauthorized' });
		expect(fetchImpl.calls).toHaveLength(0);
	});

	it('maps usage and history from the service', async () => {
		const fetchImpl = fetchMock((url) => {
			if (url.includes('/v1/usage/current')) {
				return jsonResponse({
					tier: 'free',
					jobCount: 84,
					jobCountByOperation: { analyze: 34, transcode: 50 },
					quotaLimit: 100,
					overageCount: 0,
					periodStart: '2026-11-01T00:00:00.000Z',
					periodEnd: '2026-11-30T23:59:59.000Z'
				});
			}
			return jsonResponse({
				history: [
					{ period_start: '2026-11-01T00:00:00.000Z', job_count: 100, quota_limit: 100 },
					{ period_start: '2026-10-01T00:00:00.000Z', job_count: 120, quota_limit: 100 }
				]
			});
		});
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			sessionToken: 'session-token',
			fetch: fetchImpl
		});

		const usage = await client.getUsage();

		expect(usage.jobsUsed).toBe(84);
		expect(usage.jobLimit).toBe(100);
		expect(usage.byOperation).toEqual([
			{ operation: 'transcode', jobs: 50 },
			{ operation: 'analyze', jobs: 34 }
		]);
		expect(usage.history[0]).toEqual({
			period: 'Nov 2026',
			jobs: 100,
			limit: 100,
			status: 'quota reached'
		});
		expect(usage.history[1]).toEqual({
			period: 'Oct 2026',
			jobs: 120,
			limit: 100,
			status: 'overage'
		});
	});

	it('maps API keys and a one-time secret', async () => {
		const fetchImpl = fetchMock((url) => {
			if (url.endsWith('/v1/api-keys')) {
				return jsonResponse({
					api_keys: [
						{
							id: 'k1',
							name: 'production',
							key_prefix: 'ak_live_…4f2',
							is_active: true,
							last_used_at: null,
							created_at: '2026-11-01T09:00:00.000Z'
						}
					]
				});
			}
			return jsonResponse({}, 404);
		});
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			sessionToken: 'session-token',
			fetch: fetchImpl
		});

		expect(await client.getApiKeys()).toEqual([
			{
				id: 'k1',
				label: 'production',
				prefix: 'ak_live_…4f2',
				createdAt: '2026-11-01T09:00:00.000Z',
				lastUsedAt: null,
				revoked: false
			}
		]);
	});
});

describe('http adapter: session token', () => {
	it('decodes the JWT payload and rejects expired or malformed tokens', () => {
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			fetch: fetchMock(() => jsonResponse({}))
		});

		const valid = jwt({ email: 'you@example.com', iat: 1_760_000_000, exp: 4_000_000_000 });
		expect(client.parseSessionToken(valid)).toEqual({
			email: 'you@example.com',
			issuedAt: new Date(1_760_000_000 * 1000).toISOString()
		});

		const expired = jwt({ email: 'you@example.com', exp: 1 });
		expect(client.parseSessionToken(expired)).toBeNull();
		expect(client.parseSessionToken('not-a-jwt')).toBeNull();
		expect(client.parseSessionToken(null)).toBeNull();
	});
});

describe('http adapter: errors', () => {
	it('starts annual Checkout, opens the portal, and reads the confirmed return', async () => {
		const fetchImpl = fetchMock((url) => {
			if (url.endsWith('/v1/subscriptions/checkout')) {
				return jsonResponse({ status: 'processing', tier: 'pro', url: 'https://checkout.stripe.com/session', session_id: 'cs_test' });
			}
			if (url.endsWith('/v1/subscriptions/portal')) return jsonResponse({ url: 'https://billing.stripe.com/session' });
			if (url.endsWith('/v1/subscriptions/current')) return jsonResponse({ subscription: { id: 's1', tier: 'pro', status: 'active', current_period_start: '2026-11-01T00:00:00.000Z', current_period_end: '2026-12-01T00:00:00.000Z' } });
			return jsonResponse({}, 404);
		});
		const client = createApiClient({ baseUrl: 'https://billing.test', sessionToken: 'token', fetch: fetchImpl });

		await expect(client.startCheckout('pro', 'year')).resolves.toMatchObject({ url: 'https://checkout.stripe.com/session' });
		expect(JSON.parse(String(fetchImpl.calls[0].init.body))).toEqual({ tier: 'pro', interval: 'year' });
		await expect(client.createBillingPortal()).resolves.toBe('https://billing.stripe.com/session');
		await expect(client.getCheckoutResult('success')).resolves.toMatchObject({ status: 'success', plan: 'pro' });
		await expect(client.getCheckoutResult('canceled')).resolves.toMatchObject({ status: 'cancelled' });
	});

	it('maps service errors to typed failures', async () => {
		const fetchImpl = fetchMock(() =>
			jsonResponse({ error: 'unauthorized', message: 'Nope' }, 401)
		);
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			sessionToken: 'expired',
			fetch: fetchImpl
		});

		const error = await client.getAccount().catch((caught) => caught);
		expect(error).toBeInstanceOf(HttpApiError);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({ code: 'unauthorized', status: 401, message: 'Nope' });
	});

	it('maps a network failure', async () => {
		const fetchImpl = fetchMock(() => {
			throw new Error('offline');
		});
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			sessionToken: 'session-token',
			fetch: fetchImpl
		});

		await expect(client.getAccount()).rejects.toMatchObject({ code: 'network' });
	});

	it('refuses self-serve enterprise checkout', async () => {
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			sessionToken: 'session-token',
			fetch: fetchMock(() => jsonResponse({}))
		});

		await expect(client.startCheckout('enterprise')).rejects.toMatchObject({
			code: 'invalid-request'
		});
	});
});
