import { it, expect, vi, afterEach } from 'vitest';
import { createCollector, createLifetime } from '../src/lib/app-metrics-client';
import { METRICS_ORIGIN } from '../src/lib/app-metrics-contract';
afterEach(() => vi.useRealTimers());
function setup(enabled = true, origin = METRICS_ORIGIN) {
	let time = 42,
		visible = true;
	const fetch = vi
		.fn<typeof globalThis.fetch>()
		.mockResolvedValue(new Response(null, { status: 204 }));
	const client = createCollector({
		enabled,
		origin,
		fetch,
		now: () => time,
		visible: () => visible
	});
	return { client, fetch, time: (n: number) => (time = n), hide: () => (visible = false) };
}
it('sends one fresh fixed object through credential-free native fetch options', async () => {
	const { client, fetch } = setup();
	client.after('/(console)/dashboard', 'enter');
	client.after('/(console)/dashboard', 'enter');
	expect(fetch).toHaveBeenCalledTimes(1);
	const [url, options] = fetch.mock.calls[0];
	expect(url).toBe('/api/app-metrics');
	expect(options).toMatchObject({
		method: 'POST',
		mode: 'same-origin',
		credentials: 'omit',
		referrerPolicy: 'no-referrer',
		redirect: 'error',
		cache: 'no-store',
		keepalive: false,
		headers: { 'Content-Type': 'application/json' }
	});
	expect(JSON.parse(options!.body as string)).toEqual({
		v: 1,
		route: 'dashboard',
		metric: 'document_mount_ms',
		ms: 42
	});
});
it('drops disabled/wrong-origin/unknown/hidden initial documents', () => {
	for (const s of [setup(false), setup(true, 'http://localhost'), setup()]) {
		s.hide();
		s.client.after('/(console)/dashboard', 'enter');
		expect(s.fetch).not.toHaveBeenCalled();
	}
	const s = setup();
	s.client.after('/auth/callback', 'enter');
	s.client.after('/(console)/dashboard', 'link');
	expect(s.fetch).not.toHaveBeenCalled();
});
it('conservatively drops same-symbol, excluded, canceled, stale and form navigation', () => {
	const { client, fetch, time } = setup();
	client.after('/login', 'enter');
	time(2000);
	for (const type of ['link', 'goto', 'popstate', 'form']) {
		client.before({ from: '/(console)/dashboard', to: '/(console)/dashboard', type });
		client.after('/(console)/dashboard', type);
		client.before({ from: '/(console)/dashboard', to: '/releases/[id]', type });
		client.after('/releases/[id]', type);
		client.before({ from: '/releases/[id]', to: '/(console)/dashboard', type });
		client.invalidate();
		client.after('/(console)/dashboard', type);
	}
	client.before({
		from: '/(console)/dashboard',
		to: '/(console)/dashboard',
		type: 'link',
		leaving: true
	});
	client.destroy();
	client.after('/(console)/dashboard', 'enter');
	expect(fetch).not.toHaveBeenCalled();
});
it('aborts on deadline and lifecycle invalidation; catches failures', async () => {
	vi.useFakeTimers();
	const s = setup();
	s.fetch.mockImplementation(
		(_url, options) =>
			new Promise((_resolve, reject) =>
				options!.signal!.addEventListener('abort', () => reject(new Error('fake')))
			)
	);
	s.client.after('/(console)/dashboard', 'enter');
	const signal = s.fetch.mock.calls[0][1]!.signal!;
	await vi.advanceTimersByTimeAsync(1000);
	expect(signal.aborted).toBe(true);
	const t = setup();
	t.client.after('/(console)/dashboard', 'enter');
	t.client.invalidate();
	expect(t.fetch.mock.calls[0][1]!.signal!.aborted).toBe(true);
});

it('shares one document mount/budget across duplicate initialization and root remount', () => {
	const lifetime = createLifetime();
	const fetch = vi
		.fn<typeof globalThis.fetch>()
		.mockResolvedValue(new Response(null, { status: 204 }));
	const options = {
		enabled: true,
		origin: METRICS_ORIGIN,
		fetch,
		now: () => 100,
		visible: () => true,
		lifetime
	};
	const first = createCollector(options);
	first.after('/(console)/dashboard', 'enter');
	const second = createCollector(options);
	second.after('/(console)/dashboard', 'enter');
	first.after('/(console)/dashboard', 'enter');
	first.destroy();
	second.after('/(console)/dashboard', 'enter');
	expect(fetch).toHaveBeenCalledTimes(1);
	second.destroy();
	createCollector(options).after('/(console)/dashboard', 'enter');
	expect(fetch).toHaveBeenCalledTimes(1);
});
