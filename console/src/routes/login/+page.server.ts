import { fail, redirect } from '@sveltejs/kit';
import { api, ApiError } from '#lib/api-client';
import { safeNext } from '#lib/session';
import { readSignupSource } from '#lib/signup-source';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, request }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.session) redirect(303, next);
	// First-touch source (decision 0040): from the site's link, or from a direct landing here.
	// Carried in hidden fields to the link request; the console keeps none of it.
	const source = readSignupSource(url.searchParams, request.headers.get('referer')) ?? null;
	return { next, source };
};

export const actions: Actions = {
	/** Ask the billing service to email a magic link. */
	send: async ({ request, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const next = safeNext(String(form.get('next') ?? '') || url.searchParams.get('next'));
		// Sign-in creates the account for a new address too (0033), so both screens send it.
		const source = readSignupSource(form) ?? null;

		try {
			const result = await api.requestMagicLink(email, {
				next,
				signup: url.pathname === '/signup',
				source: source ?? undefined
			});
			return { sent: true, email: result.email, devLink: result.devLink ?? null, next, source };
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(400, { sent: false, email, next, source, error: error.message });
			}
			throw error;
		}
	}
};
