import { fail } from '@sveltejs/kit';
import { api } from '#lib/api-client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [account, preferences] = await Promise.all([
		api.getAccount(),
		api.getNotificationPreferences()
	]);
	return { account, preferences };
};

export const actions: Actions = {
	saveProfile: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (name.length === 0) return fail(400, { profileError: 'Enter a name.' });
		const account = await api.updateProfile(name);
		return { profileSaved: true, account };
	},

	savePreferences: async ({ request }) => {
		const form = await request.formData();
		const preferences = await api.updateNotificationPreferences({
			quotaWarnings: form.get('quotaWarnings') === 'on',
			paymentReceipts: form.get('paymentReceipts') === 'on',
			productUpdates: form.get('productUpdates') === 'on'
		});
		return { preferencesSaved: true, preferences };
	}
};
