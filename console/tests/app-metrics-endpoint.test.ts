import { it, expect, vi } from 'vitest';
import { createRelay } from '../src/lib/server/app-metrics-relay';
import { createReceiver } from '../src/lib/server/app-metrics-receiver';
import { METRICS_ORIGIN } from '../src/lib/app-metrics-contract';
import { handle } from '../src/hooks.server';
const secret = 'SYNTHETIC_MACHINE_CREDENTIAL_FOR_TESTS_ONLY';
const sample = { v: 1, route: 'dashboard', metric: 'document_mount_ms', ms: 420 };
const headers = {
	origin: METRICS_ORIGIN,
	'sec-fetch-site': 'same-origin',
	'content-type': 'application/json'
};
const req = (body = JSON.stringify(sample), extra: Record<string, string> = {}) =>
	new Request(METRICS_ORIGIN + '/api/app-metrics', {
		method: 'POST',
		headers: { ...headers, ...extra },
		body
	});
it('forwards only a reconstructed finite body and dedicated machine auth', async () => {
	const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
	const r = await createRelay({ enabled: true, secret, fetch })(req());
	expect(r.status).toBe(204);
	const [url, options] = fetch.mock.calls[0];
	expect(url).toBe('https://billing.audiokit.ai/v1/internal/app-metrics');
	expect(options.headers).toEqual({
		'Content-Type': 'application/json',
		Authorization: 'Bearer ' + secret
	});
	expect(JSON.parse(options.body)).toEqual(sample);
	expect(options).toMatchObject({
		credentials: 'omit',
		referrerPolicy: 'no-referrer',
		redirect: 'error',
		cache: 'no-store',
		keepalive: false
	});
});
it('disabled, unconfigured, foreign and credential-bearing requests never reach sink', async () => {
	const fetch = vi.fn();
	expect((await createRelay({ enabled: false, secret, fetch })(req())).status).toBe(204);
	expect((await createRelay({ enabled: true, secret: '', fetch })(req())).status).toBe(503);
	for (const key of [
		'cookie',
		'authorization',
		'referer',
		'baggage',
		'sentry-trace',
		'traceparent',
		'x-session-id'
	])
		expect(
			(
				await createRelay({ enabled: true, secret, fetch })(
					req(undefined, { [key]: 'FAKE_SECRET' })
				)
			).status
		).toBe(403);
	expect(
		(
			await createRelay({ enabled: true, secret, fetch })(
				req(undefined, { origin: 'https://other.invalid' })
			)
		).status
	).toBe(403);
	expect(fetch).not.toHaveBeenCalled();
});
it('strict bounded streaming, byte and time limits reject without forwarding', async () => {
	const record = vi.fn();
	for (const [body, status] of [
		[JSON.stringify({ ...sample, id: 'FAKE_SECRET' }), 400],
		['x'.repeat(257), 413]
	] as const)
		expect((await createReceiver()(req(body), record, true)).status).toBe(status);
	const stream = new ReadableStream({ start() {} });
	const request = new Request(METRICS_ORIGIN + '/api/app-metrics', {
		method: 'POST',
		headers,
		body: stream,
		duplex: 'half'
	} as RequestInit);
	const before = Date.now();
	expect((await createReceiver()(request, record, true)).status).toBe(503);
	expect(Date.now() - before).toBeLessThan(1400);
	expect(record).not.toHaveBeenCalled();
});
it('sink failures, redirects and aborts produce empty responses and no logs', async () => {
	const logs = vi.spyOn(console, 'error');
	for (const status of [302, 400, 401, 500]) {
		const fetch = vi.fn().mockResolvedValue(new Response(null, { status }));
		const r = await createRelay({ enabled: true, secret, fetch })(req());
		expect(r.status).toBe(503);
		expect(await r.text()).toBe('');
	}
	const fetch = vi.fn(
		(_url, options) =>
			new Promise((_resolve, reject) =>
				options.signal.addEventListener('abort', () => reject(new Error('FAKE_TOKEN')))
			)
	);
	expect(
		(await createRelay({ enabled: true, secret, fetch: fetch as typeof globalThis.fetch })(req()))
			.status
	).toBe(503);
	expect(logs).not.toHaveBeenCalled();
	logs.mockRestore();
});
it('exact hook bypasses cookie and session work, keeps auth callback policy untouched', async () => {
	const resolve = vi.fn(async () => new Response(null, { status: 204 }));
	const event = {
		url: new URL(METRICS_ORIGIN + '/api/app-metrics'),
		request: req(),
		cookies: {
			get() {
				throw Error('cookie must not be read');
			}
		},
		locals: {}
	};
	expect((await handle({ event, resolve } as never)).status).toBe(204);
	expect(resolve).toHaveBeenCalledOnce();
});
it('normalizes only hosting traces with adapter-owned matching site context', async () => {
	for (const trusted of [true, false]) {
		const request = req(undefined, {
			traceparent: 'FAKE_TRANSPORT',
			'x-nf-trace-span-id': 'FAKE_TRANSPORT',
			baggage: 'FAKE_MUST_REJECT',
			authorization: 'FAKE_MUST_REJECT'
		});
		const event = {
			url: new URL(request.url),
			request,
			cookies: {
				get() {
					throw Error('cookie access');
				}
			},
			locals: {},
			platform: {
				context: { site: { id: trusted ? 'bf5e8d56-ab54-47ef-a7ca-89d152c94fe3' : 'foreign' } }
			}
		};
		const resolve = vi.fn(async (received: typeof event) => {
			expect(received.request.headers.has('traceparent')).toBe(!trusted);
			expect(received.request.headers.has('x-nf-trace-span-id')).toBe(!trusted);
			expect(received.request.headers.has('authorization')).toBe(true);
			expect(received.request.headers.has('baggage')).toBe(true);
			expect(await received.request.text()).toBe(JSON.stringify(sample));
			return new Response(null, { status: 204 });
		});
		expect((await handle({ event, resolve } as never)).status).toBe(204);
	}
});
