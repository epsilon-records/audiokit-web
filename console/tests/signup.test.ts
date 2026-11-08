import { expect, it } from 'vitest';
import { createApiClient } from '../src/lib/api-client';
it('signup uses the signup endpoint and preserves the onboarding key', async () => {
	const calls: string[] = [];
	const client = createApiClient({
		baseUrl: 'https://billing.test',
		fetch: (async (url: string) => {
			calls.push(String(url));
			return Response.json(
				String(url).endsWith('/exchange')
					? { user: { email: 'new@example.com' }, token: 'jwt', created: true, api_key: 'ak_once' }
					: { email: 'new@example.com', expires_at: '2026-11-14T12:15:00Z' }
			);
		}) as typeof fetch
	});
	await client.requestMagicLink('new@example.com', { signup: true });
	expect(calls[0]).toBe('https://billing.test/v1/auth/signup');
	expect(await client.exchangeMagicLink('token')).toMatchObject({
		ok: true,
		created: true,
		apiKey: 'ak_once'
	});
});
