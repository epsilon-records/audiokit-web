<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SettingsTabs from '#lib/components/SettingsTabs.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { formatDate, formatNumber } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const planLabel = $derived(data.plan?.name ?? data.account.plan);
	const actionError = $derived(form && 'error' in form ? form.error : null);
</script>

<svelte:head>
	<title>Billing · AudioKit console</title>
</svelte:head>

<PageHeader
	title="Billing"
	kicker="Settings"
	description="Your plan, payment method and invoices. Payment details and invoices are managed in the billing portal."
/>

<SettingsTabs />

{#if data.checkoutResult?.status === 'success'}
	<p class="notice notice-ok" role="status">Checkout complete. Pro is active.</p>
{:else if data.checkoutResult?.status === 'processing'}
	<p class="notice notice-info" role="status">Payment received — activating Pro. Refresh shortly to check your plan.</p>
{:else if data.checkoutResult?.status === 'cancelled'}
	<p class="notice" role="status">Checkout canceled. You have not been charged.</p>
{/if}
{#if actionError}<p class="notice notice-warn" role="alert">{actionError}</p>{/if}

{#if data.account.pastDue}
	<p class="notice notice-warn" role="alert">
		<strong>Payment failed, update your card.</strong> Update your card to keep {planLabel} after
		{formatDate(data.account.renewsAt)}.
	</p>
{/if}

<div class="stack">
	<section class="panel" aria-labelledby="plan-heading">
		<div class="panel-bar">
			<span id="plan-heading">Plan</span>
			<span class="mono">{planLabel}</span>
		</div>
		<div class="panel-body">
			<dl class="readout">
				<div>
					<dt>Plan</dt>
					<dd>{planLabel}</dd>
				</div>
				<div>
					<dt>Jobs / month</dt>
					<dd>{data.plan?.jobLimit ? formatNumber(data.plan.jobLimit) : 'Custom'}</dd>
				</div>
				<div>
					<dt>{data.account.cancelsAt ? 'Access ends' : 'Renews / resets'}</dt>
					<dd>{data.account.cancelsAt ? `Pro until ${formatDate(data.account.cancelsAt)}` : formatDate(data.account.renewsAt)}</dd>
				</div>
			</dl>
			<div class="actions">
				<a class="btn btn-primary" href="/pricing">Change plan</a>
				<form method="POST" action="?/portal"><button type="submit" class="btn btn-ghost">Manage billing ↗</button></form>
			</div>
		</div>
	</section>

	<section class="panel" aria-labelledby="payment-heading">
		<div class="panel-bar">
			<span id="payment-heading">Payment</span>
		</div>
		<div class="panel-body">
			{#if data.billing.paymentMethod}
				<p class="muted">Card on file: <span class="mono">{data.billing.paymentMethod}</span></p>
			{:else}
				<p class="muted">No payment method on file. The Free plan does not need one.</p>
			{/if}
		</div>
	</section>

	<section class="section-block" aria-labelledby="invoices-heading">
		<h2 id="invoices-heading">Invoices</h2>
		{#if data.billing.invoices.length === 0}
			<EmptyState title="No invoices yet">
				Invoices appear here after the first paid period. Free-plan usage is not invoiced.
			</EmptyState>
		{:else}
			<div class="table-box">
				<table class="stack">
					<caption>Invoices for this account, newest first.</caption>
					<thead>
						<tr>
							<th scope="col">Date</th>
							<th scope="col" class="numeric">Amount</th>
							<th scope="col">Status</th>
							<th scope="col">Invoice</th>
						</tr>
					</thead>
					<tbody>
						{#each data.billing.invoices as invoice (invoice.id)}
							<tr>
								<td class="mono" data-label="Date">{formatDate(invoice.date)}</td>
								<td class="numeric" data-label="Amount">{invoice.amount}</td>
								<td data-label="Status"><StatusBadge status={invoice.status} /></td>
								<td data-label="Invoice">
									<a class="link" href={invoice.url} rel="noopener">View ↗</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
