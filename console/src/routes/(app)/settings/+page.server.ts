import { fail, redirect } from '@sveltejs/kit';
import { apiFor, ApiError } from '#lib/api-client';
import type { Cookies } from '@sveltejs/kit';
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
		const client = apiFor(locals.sessionToken);
		// Quota emails are gone (AudioKit 0066), so the form no longer has a toggle for them. Billing
		// still stores the field; send back what it holds so saving here never changes it (EPSILON-169).
		const { quotaWarnings } = await client.getNotificationPreferences();
		const preferences = await client.updateNotificationPreferences({
			quotaWarnings,
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
		let account;
		try {
			account = await client.getAccount();
		} catch (error) {
			// The session has ended (EPSILON-114): the account is already gone, or signed out.
			if (isUnauthorized(error)) signedOut(cookies);
			throw error;
		}
		if (confirmEmail.toLowerCase() !== account.email.toLowerCase()) {
			return fail(400, { deleteError: 'Type the email address of this account to confirm.' });
		}
		try {
			await client.deleteAccount(confirmEmail);
		} catch (error) {
			if (isUnauthorized(error)) signedOut(cookies);
			// The account may be half deleted (keys already revoked): say so and let them repeat it.
			if (error instanceof ApiError)
				return fail(error.code === 'network' ? 503 : 400, { deleteError: error.message });
			throw error;
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login?deleted=1');
	}
};

function isUnauthorized(error: unknown): boolean {
	return error instanceof ApiError && error.code === 'unauthorized';
}

/** Drop the dead session's cookie and send the user to sign in. */
function signedOut(cookies: Cookies): never {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/login');
}
