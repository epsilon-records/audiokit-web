import { describe, expect, it } from 'vitest';
import page from '../src/routes/auth/callback/+page.svelte?raw';
import { handle } from '../src/hooks.server';

describe('magic-link callback security headers', () => {
	it('uses an origin-only referrer without breaking same-site form origins', async () => {
		const response = await handle({
			event: {
				url: new URL('https://console.audiokit.ai/auth/callback?token=secret'),
				cookies: { get: () => undefined },
				locals: {}
			},
			resolve: async () => new Response('callback')
		} as unknown as Parameters<typeof handle>[0]);
		expect(response.headers.get('referrer-policy')).toBe('origin');
		expect(response.headers.get('cache-control')).toBe('no-store');
		// A meta policy overrides the HTTP header. It must not restore no-referrer:
		// Chromium then sends Origin: null for the welcome form and CSRF rejects it.
		expect(page).toMatch(/name="referrer"[\s\S]*?content="origin"/);
		expect(page).not.toContain('no-referrer');
	});
});
