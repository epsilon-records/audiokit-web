import { fail, redirect } from '@sveltejs/kit';
import { api, MockApiError } from '#lib/api-client';
import { safeNext } from '#lib/session';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.session) redirect(303, next);
	return { next };
};

export const actions: Actions = {
	/** Ask the billing service to email a magic link. */
	send: async ({ request, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const next = safeNext(String(form.get('next') ?? '') || url.searchParams.get('next'));

		try {
			const result = await api.requestMagicLink(email, { next });
			return { sent: true, email: result.email, devLink: result.devLink ?? null, next };
		} catch (error) {
			if (error instanceof MockApiError) {
				return fail(400, { sent: false, email, next, error: error.message });
			}
			throw error;
		}
	}
};
