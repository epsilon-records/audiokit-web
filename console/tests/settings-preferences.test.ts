// Quota emails are gone (AudioKit 0066), so the settings form has no toggle for them. Saving the
// other preferences must send back whatever billing holds for that field rather than reset it.
import { describe, expect, it, vi } from 'vitest';

const client = {
	getNotificationPreferences: vi.fn(),
	updateNotificationPreferences: vi.fn()
};

vi.mock('#lib/api-client', async (importOriginal) => {
	const original = await importOriginal<typeof import('../src/lib/api-client')>();
	return { ...original, apiFor: () => client };
});

const { actions } = await import('../src/routes/(app)/settings/+page.server');

describe('settings: save preferences', () => {
	it('keeps the stored quota-warnings value and takes the rest from the form', async () => {
		client.getNotificationPreferences.mockResolvedValue({
			quotaWarnings: true,
			paymentReceipts: true,
			productUpdates: false
		});
		client.updateNotificationPreferences.mockImplementation(async (next) => next);

		const form = new FormData();
		form.set('productUpdates', 'on');
		const result = await actions.savePreferences({
			request: new Request('https://console.test/settings?/savePreferences', {
				method: 'POST',
				body: form
			}),
			locals: { sessionToken: 'token' }
		} as unknown as Parameters<typeof actions.savePreferences>[0]);

		expect(client.updateNotificationPreferences).toHaveBeenCalledWith({
			quotaWarnings: true,
			paymentReceipts: false,
			productUpdates: true
		});
		expect(result).toMatchObject({ preferencesSaved: true });
	});

	// EPSILON-257: the low-balance switch is saved only when billing reports the preference.
	async function save(form: FormData) {
		return actions.savePreferences({
			request: new Request('https://console.test/settings?/savePreferences', {
				method: 'POST',
				body: form
			}),
			locals: { sessionToken: 'token' }
		} as unknown as Parameters<typeof actions.savePreferences>[0]);
	}

	it('saves the low-balance switch when billing has the preference', async () => {
		client.updateNotificationPreferences.mockClear();
		client.getNotificationPreferences.mockResolvedValue({
			quotaWarnings: true,
			paymentReceipts: true,
			productUpdates: false,
			lowBalanceAlerts: true
		});
		client.updateNotificationPreferences.mockImplementation(async (next) => next);

		const off = new FormData();
		off.set('paymentReceipts', 'on');
		await save(off);
		expect(client.updateNotificationPreferences).toHaveBeenLastCalledWith({
			quotaWarnings: true,
			paymentReceipts: true,
			productUpdates: false,
			lowBalanceAlerts: false
		});

		const on = new FormData();
		on.set('lowBalanceAlerts', 'on');
		await save(on);
		expect(client.updateNotificationPreferences).toHaveBeenLastCalledWith(
			expect.objectContaining({ lowBalanceAlerts: true })
		);
	});

	it('never sends the low-balance preference when billing does not report it', async () => {
		client.updateNotificationPreferences.mockClear();
		client.getNotificationPreferences.mockResolvedValue({
			quotaWarnings: true,
			paymentReceipts: true,
			productUpdates: false
		});
		client.updateNotificationPreferences.mockImplementation(async (next) => next);

		// Even a forged field is ignored: there is no switch to have sent it.
		const form = new FormData();
		form.set('lowBalanceAlerts', 'on');
		await save(form);
		expect(client.updateNotificationPreferences.mock.lastCall?.[0]).not.toHaveProperty(
			'lowBalanceAlerts'
		);
	});
});
