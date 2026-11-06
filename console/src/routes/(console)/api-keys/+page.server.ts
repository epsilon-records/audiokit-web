import { fail } from '@sveltejs/kit';
import { apiFor, ApiError } from '#lib/api-client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const keys = await apiFor(locals.sessionToken).getApiKeys();
	return { keys };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const label = String(form.get('label') ?? '');
		try {
			const created = await apiFor(locals.sessionToken).createApiKey(label);
			return { created };
		} catch (error) {
			if (error instanceof ApiError) return fail(400, { createError: error.message });
			throw error;
		}
	},

	revoke: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		try {
			const key = await apiFor(locals.sessionToken).revokeApiKey(id);
			return { revoked: key.label };
		} catch (error) {
			if (error instanceof ApiError) return fail(400, { revokeError: error.message });
			throw error;
		}
	}
};
