<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '#lib/components/console/Alert.svelte';
	import EmptyState from '#lib/components/console/EmptyState.svelte';
	import Panel from '#lib/components/console/Panel.svelte';
	import {
		actions,
		link,
		linkTarget,
		muted,
		section,
		sectionTitle,
		stack
	} from '#lib/components/console/classes';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import PageHeader from '#lib/components/console/PageHeader.svelte';
	import SettingsTabs from '#lib/components/console/SettingsTabs.svelte';
	import StatusBadge from '#lib/components/console/StatusBadge.svelte';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const planLabel = $derived(data.plan?.name ?? data.account.plan);
	const actionError = $derived(form && 'error' in form ? form.error : null);

	$effect(() => {
		const target = form && 'portalUrl' in form ? form.portalUrl : null;
		if (typeof target === 'string' && /^https:\/\//.test(target)) {
			window.location.assign(target);
		}
	});
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

{#if actionError}<Alert tone="warn" role="alert" class="mb-5">{actionError}</Alert>{/if}

{#if data.account.pastDue}
	<Alert tone="warn" role="alert" class="mb-5">
		<span
			><strong>Payment failed, update your card.</strong> Update your card to keep {planLabel} after
			{formatDate(data.account.renewsAt)}.</span
		>
	</Alert>
{/if}

<div class={stack}>
	<Panel as="section" aria-labelledby="plan-heading" label="Plan" labelId="plan-heading">
		{#snippet bar()}<span class="pr-3">{planLabel}</span>{/snippet}
		<div class="flex flex-col gap-4 p-5 max-stack:p-4">
			<dl
				class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-px overflow-hidden rounded-control border border-border bg-border"
			>
				<div class="flex min-w-0 flex-col gap-1 bg-surface px-3.5 py-3">
					<dt class="text-[12px] text-faint">Plan</dt>
					<dd class="font-mono text-[16px] [overflow-wrap:anywhere]">{planLabel}</dd>
				</div>
				<div class="flex min-w-0 flex-col gap-1 bg-surface px-3.5 py-3">
					<!-- AudioKit 0052: Free is 100 credits a calendar month, not a job quota. Billing's
					     plan row still carries the old 100-job quota, so it is not read here. -->
					<dt class="text-[12px] text-faint">Free credits / month</dt>
					<dd class="font-mono text-[16px]">100</dd>
				</div>
				<div class="flex min-w-0 flex-col gap-1 bg-surface px-3.5 py-3">
					<dt class="text-[12px] text-faint">
						{data.account.cancelsAt ? 'Access ends' : 'Renews / resets'}
					</dt>
					<dd class="font-mono text-[16px] [overflow-wrap:anywhere]">
						{data.account.cancelsAt
							? `${planLabel} until ${formatDate(data.account.cancelsAt)}`
							: formatDate(data.account.renewsAt)}
					</dd>
				</div>
			</dl>
			<div class={actions}>
				<Button variant="primary" href="/pricing/" data-sveltekit-reload>See pricing</Button>
				<form method="POST" action="?/portal" use:enhance>
					<Button type="submit">Manage billing ↗</Button>
				</form>
				<!-- Billing's Stripe return URLs come back here, so the credits page is one link away. -->
				<a class={linkTarget} href="/credits">View credits</a>
			</div>
		</div>
	</Panel>

	<Panel as="section" aria-labelledby="payment-heading" label="Payment" labelId="payment-heading">
		<div class="p-5 max-stack:p-4">
			{#if data.billing.paymentMethod}
				<p class={muted}>
					Card on file: <span class="font-mono">{data.billing.paymentMethod}</span>
				</p>
			{:else if data.account.plan === 'free'}
				<p class={muted}>No payment method on file. The Free plan does not need one.</p>
			{:else}
				<p class={muted}>
					Payment details are managed in Stripe. Select <strong>Manage billing</strong> above to view
					or update your payment method.
				</p>
			{/if}
		</div>
	</Panel>

	<section class={section} aria-labelledby="invoices-heading">
		<h2 class={sectionTitle} id="invoices-heading">Invoices</h2>
		{#if data.billing.invoices.length === 0}
			<EmptyState title="No invoices yet">
				{data.account.plan === 'free'
					? 'Free-plan usage is not invoiced.'
					: 'Invoice history is available in Stripe. Select Manage billing above to view your invoices.'}
			</EmptyState>
		{:else}
			<Table.Root stack>
				<Table.Caption>Invoices for this account, newest first.</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head>Date</Table.Head>
						<Table.Head class="text-right">Amount</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Invoice</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.billing.invoices as invoice (invoice.id)}
						<Table.Row>
							<Table.Cell class={Table.cellMono} data-label="Date"
								>{formatDate(invoice.date)}</Table.Cell
							>
							<Table.Cell class={Table.cellNumeric} data-label="Amount">{invoice.amount}</Table.Cell
							>
							<Table.Cell data-label="Status"><StatusBadge status={invoice.status} /></Table.Cell>
							<Table.Cell data-label="Invoice">
								<a class={link} href={invoice.url} rel="noopener">View ↗</a>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</section>
</div>
