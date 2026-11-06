import { fail } from '@sveltejs/kit';
import { api, MockApiError } from '#lib/api-client';
import type { PlanId } from '#lib/types';
import type { Actions, PageServerLoad } from './$types';

const planIds: PlanId[] = ['free', 'pro', 'enterprise'];

export const load: PageServerLoad = async () => {
	const [account, plans, billing] = await Promise.all([
		api.getAccount(),
		api.getPlans(),
		api.getBilling()
	]);
	return { account, plans, billing };
};

export const actions: Actions = {
	upgrade: async ({ request }) => {
		const form = await request.formData();
		const planId = String(form.get('planId') ?? '') as PlanId;
		if (!planIds.includes(planId)) return fail(400, { error: 'Unknown plan.' });

		try {
			const checkout = await api.startCheckout(planId);
			return { checkout, planId };
		} catch (error) {
			if (error instanceof MockApiError) return fail(400, { error: error.message, planId });
			throw error;
		}
	}
};
