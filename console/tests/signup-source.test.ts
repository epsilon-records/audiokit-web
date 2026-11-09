import { describe, expect, it } from 'vitest';
import { createApiClient } from '../src/lib/api-client';
import {
	readSignupSource,
	signupSourceEntries,
	signupSourceQuery,
	toWireSignupSource
} from '../src/lib/signup-source';

// First-touch signup source (AudioKit decision 0040, EPSILON-98).

const params = (query: string) => new URLSearchParams(query);

describe('readSignupSource', () => {
	it('reads what the public site adds to its console links', () => {
		expect(
			readSignupSource(
				params(
					'ak_ref=news.ycombinator.com&utm_source=hn&utm_medium=social&utm_campaign=launch&ak_landing=%2Fpricing%2F&next=%2Fdashboard'
				)
			)
		).toEqual({
			referrerHost: 'news.ycombinator.com',
			utmSource: 'hn',
			utmMedium: 'social',
			utmCampaign: 'launch',
			landingPath: '/pricing/'
		});
	});

	it('returns nothing when there is nothing to send', () => {
		expect(readSignupSource(params('next=%2Fdashboard'))).toBeUndefined();
		expect(readSignupSource(params(''), 'https://console.audiokit.ai/login')).toBeUndefined();
		expect(readSignupSource(params(''), 'https://audiokit.ai/pricing/')).toBeUndefined();
	});

	it('falls back to the Referer host for a direct landing, and keeps only the host', () => {
		expect(readSignupSource(params(''), 'https://www.google.com/search?q=private')).toEqual({
			referrerHost: 'www.google.com'
		});
		expect(
			readSignupSource(params('ak_ref=example.org'), 'https://www.google.com/')?.referrerHost
		).toBe('example.org');
	});

	it('rejects values that are not what they claim to be', () => {
		const source = readSignupSource(
			params(
				'ak_ref=https%3A%2F%2Fevil.test%2Fpath&ak_landing=https%3A%2F%2Fevil.test%2F&utm_term=%20a%0Ab%20'
			)
		);
		expect(source).toEqual({ utmTerm: 'a b' });
		expect(readSignupSource(params('ak_landing=%2F%2Fevil.test'))).toBeUndefined();
		expect(readSignupSource(params('ak_landing=%2Fdocs%2F%3Ftoken%3Dx'))).toBeUndefined();
		expect(readSignupSource(params('ak_ref=console.audiokit.ai'))).toBeUndefined();
		expect(readSignupSource(params('ak_ref=10.0.0.1'))).toBeUndefined();
		expect(readSignupSource(params('utm_source=jane%40example.com&utm_medium=email'))).toEqual({
			utmMedium: 'email'
		});
	});

	it('caps every value', () => {
		const long = 'x'.repeat(500);
		const source = readSignupSource(params(`utm_source=${long}&ak_landing=/${long}`));
		expect(source?.utmSource).toHaveLength(100);
		expect(source?.landingPath).toHaveLength(200);
	});

	it('reads the hidden form fields back the same way', () => {
		const form = new FormData();
		for (const [name, value] of signupSourceEntries({
			referrerHost: 'example.org',
			utmSource: 'hn'
		}))
			form.set(name, value);
		expect(readSignupSource(form)).toEqual({ referrerHost: 'example.org', utmSource: 'hn' });
	});
});

describe('carrying and sending the source', () => {
	it('builds a query for links between the auth screens', () => {
		expect(signupSourceQuery(undefined)).toBe('');
		expect(signupSourceQuery({ utmSource: 'a b', landingPath: '/' })).toBe(
			'?utm_source=a+b&ak_landing=%2F'
		);
	});

	it('maps to the (assumed) billing field shape and drops empty keys', () => {
		expect(toWireSignupSource(undefined)).toBeUndefined();
		expect(toWireSignupSource({})).toBeUndefined();
		expect(
			toWireSignupSource({
				referrerHost: 'example.org',
				utmSource: 's',
				utmMedium: 'm',
				utmCampaign: 'c',
				utmTerm: 't',
				utmContent: 'x',
				landingPath: '/'
			})
		).toEqual({
			referrer_host: 'example.org',
			utm_source: 's',
			utm_medium: 'm',
			utm_campaign: 'c',
			utm_term: 't',
			utm_content: 'x',
			landing_path: '/'
		});
	});

	function recordingClient() {
		const bodies: { url: string; body: Record<string, unknown> }[] = [];
		const client = createApiClient({
			baseUrl: 'https://billing.test',
			fetch: (async (url: string, init?: RequestInit) => {
				bodies.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
				return Response.json({ email: 'new@example.com', expires_at: '2026-11-14T12:15:00Z' });
			}) as typeof fetch
		});
		return { client, bodies };
	}

	it('sends the source on signup and on sign-in, which also creates accounts', async () => {
		const { client, bodies } = recordingClient();
		const source = { referrerHost: 'example.org', utmCampaign: 'launch' };
		await client.requestMagicLink('new@example.com', { signup: true, source });
		await client.requestMagicLink('new@example.com', { source });
		expect(bodies.map((b) => b.url)).toEqual([
			'https://billing.test/v1/auth/signup',
			'https://billing.test/v1/auth/magic-link'
		]);
		for (const { body } of bodies)
			expect(body.signup_source).toEqual({ referrer_host: 'example.org', utm_campaign: 'launch' });
	});

	it('sends no signup_source key when nothing was captured', async () => {
		const { client, bodies } = recordingClient();
		await client.requestMagicLink('new@example.com', { signup: true });
		expect(bodies[0].body).not.toHaveProperty('signup_source');
	});

	it('the mock adapter accepts a source', async () => {
		const mock = createApiClient();
		await expect(
			mock.requestMagicLink('new@example.com', { signup: true, source: { utmSource: 'hn' } })
		).resolves.toMatchObject({ sent: true });
	});
});
