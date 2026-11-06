import { fail, redirect } from '@sveltejs/kit';
import { apiFor, ApiError } from '#lib/api-client';
import type { PlanId } from '#lib/types';
import type { Actions, PageServerLoad } from './$types';

const planIds: PlanId[] = ['free', 'pro', 'enterprise'];

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
	upgrade: async ({ request, locals }) => {
		const form = await request.formData();
		const planId = String(form.get('planId') ?? '') as PlanId;
		if (!planIds.includes(planId)) return fail(400, { error: 'Unknown plan.' });

		try {
			const checkout = await apiFor(locals.sessionToken).startCheckout(planId);
			// A real service hands off to a hosted checkout page; the mock does not.
			if (checkout.url) redirect(303, checkout.url);
			return { checkout, planId };
		} catch (error) {
			if (error instanceof ApiError) return fail(400, { error: error.message, planId });
			throw error;
		}
	}
};
