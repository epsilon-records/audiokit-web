import { fail, redirect } from '@sveltejs/kit';
import { apiFor, ApiError } from '#lib/api-client';
import { SESSION_COOKIE } from '#lib/session';
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
	},

	/** Decision 0042: delete the account once the typed address matches, then end the session. */
	deleteAccount: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const confirmEmail = String(form.get('confirmEmail') ?? '').trim();
		const client = apiFor(locals.sessionToken);
		const account = await client.getAccount();
		if (confirmEmail.toLowerCase() !== account.email.toLowerCase()) {
			return fail(400, { deleteError: 'Type the email address of this account to confirm.' });
		}
		try {
			await client.deleteAccount(confirmEmail);
		} catch (error) {
			// The account may be half deleted (keys already revoked): say so and let them repeat it.
			if (error instanceof ApiError)
				return fail(error.code === 'network' ? 503 : 400, { deleteError: error.message });
			throw error;
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login?deleted=1');
	}
};
