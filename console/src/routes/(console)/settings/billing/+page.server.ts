import { fail } from '@sveltejs/kit';
import { apiFor, ApiError } from '#lib/api-client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const client = apiFor(locals.sessionToken);
	let [account, billing, plans] = await Promise.all([
		client.getAccount(),
		client.getBilling(),
		client.getPlans()
	]);
	const plan = plans.find((candidate) => candidate.id === billing.plan) ?? null;
	const checkout = url.searchParams.get('checkout');
	const checkoutResult = checkout === 'success' || checkout === 'canceled'
		? await client.getCheckoutResult(checkout)
		: null;
	if (checkoutResult?.status === 'success') {
		[account, billing] = await Promise.all([client.getAccount(), client.getBilling()]);
	}
	return { account, billing, plan, checkoutResult };
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
