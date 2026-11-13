// The signed-in layout reads the credit balance only for the out-of-credits banner. A billing
// service that errors or stalls on that read must not hang or break every console page.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const client = {
	getAccount: vi.fn(),
	getUsage: vi.fn(),
	getCredits: vi.fn()
};

vi.mock('#lib/api-client', async (importOriginal) => {
	const original = await importOriginal<typeof import('../src/lib/api-client')>();
	return { ...original, apiFor: () => client };
});

const { load } = await import('../src/routes/(console)/+layout.server');
const { CREDITS_DEADLINE_MS } = await import('../src/lib/credits');

const account = { id: 'a', email: 'you@example.com' };
const usage = { jobsUsed: 1 };

function signalOfLastRead(): AbortSignal {
	return client.getCredits.mock.calls.at(-1)?.[0] as AbortSignal;
}

function run() {
	return load({
		locals: { session: { email: 'you@example.com' }, sessionToken: 'token' },
		url: new URL('https://console.test/dashboard'),
		cookies: { delete: vi.fn() }
	} as unknown as Parameters<typeof load>[0]) as Promise<{ credits: unknown }>;
}

beforeEach(() => {
	vi.useFakeTimers();
	client.getAccount.mockResolvedValue(account);
	client.getUsage.mockResolvedValue(usage);
});

afterEach(() => {
	vi.useRealTimers();
	vi.clearAllMocks();
});

describe('layout load: credit balance', () => {
	it('returns the balance and leaves no timer behind', async () => {
		client.getCredits.mockResolvedValue({ balance: 16 });
		expect((await run()).credits).toEqual({ balance: 16 });
		expect(vi.getTimerCount()).toBe(0);
		expect(signalOfLastRead().aborted).toBe(false);
	});

	it('returns null when the read rejects', async () => {
		client.getCredits.mockRejectedValue(new Error('billing down'));
		expect((await run()).credits).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('returns null at the deadline when the read never resolves', async () => {
		client.getCredits.mockReturnValue(new Promise(() => {}));
		let settled = false;
		const result = run().then((value) => {
			settled = true;
			return value;
		});
		await vi.advanceTimersByTimeAsync(CREDITS_DEADLINE_MS - 1);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect((await result).credits).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
		expect(signalOfLastRead().aborted).toBe(true);
	});

	it('returns null when the abort rejects the read', async () => {
		client.getCredits.mockImplementation(
			(signal: AbortSignal) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () => reject(new Error('aborted')));
				})
		);
		const result = run();
		await vi.advanceTimersByTimeAsync(CREDITS_DEADLINE_MS);
		expect((await result).credits).toBeNull();
	});
});
