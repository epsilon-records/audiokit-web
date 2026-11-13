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

const { actions } = await import('../src/routes/(console)/settings/+page.server');

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
});
