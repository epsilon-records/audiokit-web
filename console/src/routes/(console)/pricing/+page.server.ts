import { fail } from '@sveltejs/kit';
import { apiFor, ApiError } from '#lib/api-client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const client = apiFor(locals.sessionToken);
	const [account, plans, billing] = await Promise.all([
		client.getAccount(),
		client.getPlans(),
		client.getBilling()
	]);
	return { account, plans, billing };
};

export const actions: Actions = {
	// The subscription Checkout action that lived here is gone: billing removes
	// POST /v1/subscriptions/checkout with prepaid credits (AudioKit 0052, 0058,
	// epsilon-billing#59), and this page has nothing to buy. The portal stays.
	downgrade: async ({ locals }) => {
		try {
			return { portalUrl: await apiFor(locals.sessionToken).createBillingPortal() };
		} catch (error) {
			if (error instanceof ApiError) return fail(400, { error: error.message });
			throw error;
		}
	}
};
