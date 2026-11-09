import { fail, redirect } from '@sveltejs/kit';
import { apiFor, ApiError, HttpApiError } from '#lib/api-client';
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
	// Downgrades are managed in Stripe's portal so the subscription remains
	// active until the configured period end. The Checkout endpoint only
	// supports Pro and must never be used to switch a customer to Free.
	downgrade: async ({ locals }) => {
		try {
			redirect(303, await apiFor(locals.sessionToken).createBillingPortal());
		} catch (error) {
			if (error instanceof ApiError) return fail(400, { error: error.message });
			throw error;
		}
	},
	upgrade: async ({ request, locals }) => {
		const form = await request.formData();
		const planId = String(form.get('planId') ?? '') as PlanId;
		const interval = form.get('interval') === 'year' ? 'year' : 'month';
		if (!planIds.includes(planId)) return fail(400, { error: 'Unknown plan.' });

		try {
			const checkout = await apiFor(locals.sessionToken).startCheckout(planId, interval);
			// A real service hands off to a hosted checkout page; the mock does not.
			if (checkout.url) redirect(303, checkout.url);
			return { checkout, planId };
		} catch (error) {
			if (error instanceof HttpApiError && error.status === 409) {
				try {
					redirect(303, await apiFor(locals.sessionToken).createBillingPortal());
				} catch (portalError) {
					if (portalError instanceof ApiError) return fail(400, { error: portalError.message, planId });
					throw portalError;
				}
			}
			if (error instanceof ApiError) return fail(400, { error: error.message, planId });
			throw error;
		}
	}
};
