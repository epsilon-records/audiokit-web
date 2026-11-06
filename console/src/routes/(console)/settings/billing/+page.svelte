<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SettingsTabs from '#lib/components/SettingsTabs.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { formatDate, formatNumber } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const planLabel = $derived(data.plan?.name ?? data.account.plan);
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

{#if data.account.pastDue}
	<p class="notice notice-warn" role="alert">
		<strong>Payment failed.</strong> Update your card to keep {planLabel} after
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
					<dt>{data.account.cancelsAt ? 'Reverts' : 'Renews / resets'}</dt>
					<dd>{formatDate(data.account.renewsAt)}</dd>
				</div>
			</dl>
			<div class="actions">
				<a class="btn btn-primary" href="/pricing">Change plan</a>
				{#if data.billing.portalUrl}
					<a class="btn btn-ghost" href={data.billing.portalUrl} rel="noopener"
						>Open billing portal ↗</a
					>
				{:else}
					<button type="button" class="btn btn-ghost" disabled>Open billing portal ↗</button>
				{/if}
			</div>
			{#if !data.billing.portalUrl}
				<p class="field-hint">
					The hosted billing portal is not wired up yet (Stripe approval is an open decision). In
					mock mode this button is disabled.
				</p>
			{/if}
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
