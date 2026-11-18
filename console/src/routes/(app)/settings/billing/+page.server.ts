import { fail } from '@sveltejs/kit';
import { apiFor, ApiError } from '#lib/api-client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const client = apiFor(locals.sessionToken);
	const [account, billing, plans] = await Promise.all([
		client.getAccount(),
		client.getBilling(),
		client.getPlans()
	]);
	const plan = plans.find((candidate) => candidate.id === billing.plan) ?? null;
	return { account, billing, plan };
};

export const actions: Actions = {
	portal: async ({ locals }) => {
		try {
			return { portalUrl: await apiFor(locals.sessionToken).createBillingPortal() };
		} catch (error) {
			if (error instanceof ApiError) return fail(400, { error: error.message });
			throw error;
		}
	}
};
