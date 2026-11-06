import { fail } from '@sveltejs/kit';
import { api, MockApiError } from '#lib/api-client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const keys = await api.getApiKeys();
	return { keys };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const label = String(form.get('label') ?? '');
		try {
			const created = await api.createApiKey(label);
			return { created };
		} catch (error) {
			if (error instanceof MockApiError) return fail(400, { createError: error.message });
			throw error;
		}
	},

	revoke: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		try {
			const key = await api.revokeApiKey(id);
			return { revoked: key.label };
		} catch (error) {
			if (error instanceof MockApiError) return fail(400, { revokeError: error.message });
			throw error;
		}
	}
};
