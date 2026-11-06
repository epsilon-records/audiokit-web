<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PlanCard from '#lib/components/PlanCard.svelte';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const planLabel = $derived(
		{ free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }[data.account.plan] ?? data.account.plan
	);
	const checkout = $derived(form && 'checkout' in form ? form.checkout : null);
	const checkoutPlan = $derived(
		form && 'planId' in form ? data.plans.find((plan) => plan.id === form?.planId) : null
	);
	const actionError = $derived(form && 'error' in form ? form.error : null);
</script>

<svelte:head>
	<title>Plan · AudioKit console</title>
</svelte:head>

<PageHeader
	title="Plan"
	kicker="Pricing"
	description="You're on the {planLabel} plan. Change plan here; the public pricing page stays the marketing page."
/>

{#if checkout?.status === 'success'}
	<div class="notice notice-ok" role="status">
		<span>
			<strong>You're on {checkoutPlan?.name ?? planLabel}.</strong>
			{checkout.renewsAt ? `Renews ${formatDate(checkout.renewsAt)}.` : ''}
			Mock checkout — no card was charged.
		</span>
		<div class="actions"><a class="link" href="/settings/billing">View billing</a></div>
	</div>
{:else if checkout?.status === 'processing'}
	<div class="notice notice-info" role="status">
		Payment received — activating your plan. This usually takes a few seconds.
	</div>
{:else if checkout?.status === 'cancelled'}
	<div class="notice" role="status">Checkout cancelled — you haven't been charged.</div>
{:else if checkout?.status === 'failed'}
	<div class="notice notice-warn" role="alert">
		That payment did not go through. Nothing has changed.
	</div>
{/if}

{#if actionError}
	<p class="notice notice-warn" role="alert">{actionError}</p>
{/if}

<div class="pricing-grid">
	{#each data.plans as plan (plan.id)}
		{@const current = plan.id === data.account.plan}
		<PlanCard {plan} {current}>
			{#if current}
				<button type="button" class="btn btn-ghost" disabled>Current plan</button>
			{:else if plan.id === 'enterprise'}
				<a class="btn btn-ghost" href="mailto:sales@audiokit.ai">Contact sales</a>
			{:else}
				<form method="POST" action="?/upgrade" use:enhance>
					<input type="hidden" name="planId" value={plan.id} />
					<button type="submit" class="btn btn-primary">
						{plan.id === 'free' ? 'Downgrade to Free' : `Upgrade to ${plan.name}`}
					</button>
				</form>
			{/if}
		</PlanCard>
	{/each}
</div>

<div class="section-block" style="margin-top: 32px">
	<h2>What changes</h2>
	<p class="muted">
		The Free plan includes 100 jobs a month and hard-stops at the limit. Pro includes 10,000 jobs a
		month, priority processing, and bills overage at $0.01 per job. Plan changes are applied at the
		period boundary by the billing service; this scaffold applies them immediately so the flow can
		be walked.
	</p>
	<p class="faint">
		Already paid? Manage payment details and invoices in <a class="link" href="/settings/billing"
			>Billing</a
		>.
	</p>
</div>
