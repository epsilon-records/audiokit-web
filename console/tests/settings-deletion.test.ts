// Account deletion from settings when the session has already ended (EPSILON-114). Once the
// account is gone, billing refuses its token, so a second submit of the delete form (a double
// click, the back button) gets `unauthorized`. That must sign the browser out, not show a 500.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '../src/lib/errors';

const client = {
	getAccount: vi.fn(),
	deleteAccount: vi.fn()
};

vi.mock('#lib/api-client', async (importOriginal) => {
	const original = await importOriginal<typeof import('../src/lib/api-client')>();
	return { ...original, apiFor: () => client };
});

const { actions } = await import('../src/routes/(console)/settings/+page.server');
const { SESSION_COOKIE } = await import('../src/lib/session');

function event() {
	const form = new FormData();
	form.set('confirmEmail', 'you@example.com');
	const cookies = { delete: vi.fn() };
	return {
		cookies,
		input: {
			request: new Request('https://console.test/settings?/deleteAccount', {
				method: 'POST',
				body: form
			}),
			locals: { sessionToken: 'token' },
			cookies
		} as unknown as Parameters<typeof actions.deleteAccount>[0]
	};
}

async function redirectOf(result: unknown) {
	try {
		await result;
	} catch (thrown) {
		return thrown as { status: number; location: string };
	}
	throw new Error('expected a redirect');
}

describe('settings: delete account with an ended session', () => {
	beforeEach(() => {
		client.getAccount.mockReset();
		client.deleteAccount.mockReset();
	});

	it('signs out when the account can no longer be read', async () => {
		client.getAccount.mockRejectedValue(new ApiError('unauthorized', 'Sign in again to continue.'));
		const { cookies, input } = event();
		const thrown = await redirectOf(actions.deleteAccount(input));
		expect(thrown).toMatchObject({ status: 303, location: '/login' });
		expect(cookies.delete).toHaveBeenCalledWith(SESSION_COOKIE, { path: '/' });
		expect(client.deleteAccount).not.toHaveBeenCalled();
	});

	it('signs out when the delete call itself is refused', async () => {
		client.getAccount.mockResolvedValue({ email: 'you@example.com' });
		client.deleteAccount.mockRejectedValue(
			new ApiError('unauthorized', 'Sign in again to continue.')
		);
		const { cookies, input } = event();
		const thrown = await redirectOf(actions.deleteAccount(input));
		expect(thrown).toMatchObject({ status: 303, location: '/login' });
		expect(cookies.delete).toHaveBeenCalledWith(SESSION_COOKIE, { path: '/' });
	});

	it('still reports a half-finished deletion as retryable', async () => {
		client.getAccount.mockResolvedValue({ email: 'you@example.com' });
		client.deleteAccount.mockRejectedValue(new ApiError('server-error', 'Try again in a moment.'));
		const { cookies, input } = event();
		const result = await actions.deleteAccount(input);
		expect(result).toMatchObject({ status: 400, data: { deleteError: 'Try again in a moment.' } });
		expect(cookies.delete).not.toHaveBeenCalled();
	});
});
