import { fail, redirect } from '@sveltejs/kit';
import { apiFor, ApiError } from '#lib/api-client';
import { safeNext } from '#lib/session';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	if (!locals.session) redirect(303, '/login?next=/onboarding');
	const account = await apiFor(locals.sessionToken).getAccount();
	return { email: account.email, name: account.name === account.email ? '' : account.name };
};
export const actions: Actions = {
	complete: async ({ request, locals }) => {
		if (!locals.session) redirect(303, '/login?next=/onboarding');
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const company = String(form.get('company') ?? '').trim();
		if (!name || name.length > 255 || company.length > 255)
			return fail(400, {
				error:
					'Enter your name (up to 255 characters). Company must also be at most 255 characters.',
				name,
				company
			});
		try {
			await apiFor(locals.sessionToken).updateProfile(name, company);
		} catch (error) {
			if (error instanceof ApiError) return fail(400, { error: error.message, name, company });
			throw error;
		}
		const next = safeNext(String(form.get('next') ?? ''));
		redirect(303, next === '/onboarding' || next.startsWith('/auth/') ? '/dashboard' : next);
	},
	createKey: async ({ locals }) => {
		if (!locals.session) redirect(303, '/login?next=/onboarding');
		try {
			const key = await apiFor(locals.sessionToken).createApiKey('Onboarding');
			return { apiKey: key.secret };
		} catch (error) {
			if (error instanceof ApiError) return fail(400, { error: error.message });
			throw error;
		}
	}
};
