import { fail } from '@sveltejs/kit';
import { apiFor } from '#lib/api-client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const client = apiFor(locals.sessionToken);
	const [account, preferences] = await Promise.all([
		client.getAccount(),
		client.getNotificationPreferences()
	]);
	return { account, preferences };
};

export const actions: Actions = {
	saveProfile: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (name.length === 0) return fail(400, { profileError: 'Enter a name.' });
		const account = await apiFor(locals.sessionToken).updateProfile(name);
		return { profileSaved: true, account };
	},

	savePreferences: async ({ request, locals }) => {
		const form = await request.formData();
		const preferences = await apiFor(locals.sessionToken).updateNotificationPreferences({
			quotaWarnings: form.get('quotaWarnings') === 'on',
			paymentReceipts: form.get('paymentReceipts') === 'on',
			productUpdates: form.get('productUpdates') === 'on'
		});
		return { preferencesSaved: true, preferences };
	}
};
