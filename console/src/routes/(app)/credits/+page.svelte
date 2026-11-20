<script lang="ts">
	// Credits (EPSILON-169 PR 3): the balance, the lots it comes from, recent movements and the
	// credit packs, read-only. The figures are billing's `GET /v1/credits`, which the console layout
	// already reads with its 2 s deadline; when billing doesn't answer, the page still renders.
	// Buying a pack (the Buy button and Stripe's return) is PR 5.
	import EmptyState from '#lib/components/console/EmptyState.svelte';
	import PageHeader from '#lib/components/console/PageHeader.svelte';
	import StatTile from '#lib/components/console/StatTile.svelte';
	import { muted, section, sectionTitle } from '#lib/components/console/classes';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import {
		CREDIT_PACKS,
		entryKindLabel,
		lotExpiry,
		lotSourceLabel,
		lowBalanceDetail,
		lowBalanceLabel,
		packPrice,
		signedCredits
	} from '#lib/credits';
	import { formatDate, formatNumber, formatTime } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const credits = $derived(data.credits);
	const low = $derived(credits?.lowBalance);
	const onSale = $derived(new Set((credits?.packs ?? []).map((pack) => pack.pack)));
	const lowTone = $derived(low?.state === 'ok' ? 'ok' : 'warn');
</script>

<svelte:head>
	<title>Credits · AudioKit console</title>
</svelte:head>

<PageHeader
	title="Credits"
	kicker="Billing"
	description="Your credit balance, the credits it is made of, recent movements and the credit packs."
	meta="Times shown in UTC"
/>

<div class="mb-7 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 max-stack:grid-cols-1">
	<StatTile
		label="Credit balance"
		value={credits ? formatNumber(credits.balance) : 'Balance unavailable'}
		hint={credits ? 'Free credits renew each calendar month (UTC)' : undefined}
		tone={low && low.state !== 'ok' ? 'warn' : 'default'}
	>
		{#if low}
			<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
				<Badge tone={lowTone}>{lowBalanceLabel(low.state)}</Badge>
				<span>{lowBalanceDetail(low)}</span>
			</p>
		{/if}
	</StatTile>
</div>

{#if credits}
	<section class="{section} mb-7" aria-labelledby="lots-heading">
		<h2 class={sectionTitle} id="lots-heading">Where your balance comes from</h2>
		{#if !credits.lots}
			<EmptyState title="Credit sources unavailable">
				Billing did not send the credits this balance is made of. Try again in a moment.
			</EmptyState>
		{:else if credits.lots.length === 0}
			<EmptyState title="No credits to spend">
				Your free credits renew on the first day of each month (UTC).
			</EmptyState>
		{:else}
			<Table.Root stack>
				<Table.Caption>Credits you can spend, in the order jobs use them.</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head>Source</Table.Head>
						<Table.Head class="text-right">Remaining</Table.Head>
						<Table.Head>Expiry</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each credits.lots as lot, index (index)}
						<Table.Row>
							<Table.Cell data-label="Source">{lotSourceLabel(lot.source)}</Table.Cell>
							<Table.Cell class={Table.cellNumeric} data-label="Remaining"
								>{formatNumber(lot.remaining)} of {formatNumber(lot.credits)}</Table.Cell
							>
							<Table.Cell data-label="Expiry">{lotExpiry(lot)}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</section>

	<section class="{section} mb-7" aria-labelledby="movements-heading">
		<h2 class={sectionTitle} id="movements-heading">Recent movements</h2>
		{#if !credits.entries}
			<EmptyState title="Movements unavailable">
				Billing did not send recent movements. Try again in a moment.
			</EmptyState>
		{:else if credits.entries.length === 0}
			<EmptyState title="No movements yet">
				Credits added, spent and returned will appear here.
			</EmptyState>
		{:else}
			<Table.Root stack>
				<Table.Caption>Newest first. Times shown in UTC.</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head>When</Table.Head>
						<Table.Head>Movement</Table.Head>
						<Table.Head class="text-right">Credits</Table.Head>
						<Table.Head>Job</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each credits.entries as entry, index (index)}
						<Table.Row>
							<Table.Cell class={Table.cellMono} data-label="When"
								>{formatDate(entry.createdAt)} · {formatTime(entry.createdAt)}</Table.Cell
							>
							<Table.Cell data-label="Movement">{entryKindLabel(entry.kind)}</Table.Cell>
							<Table.Cell class={Table.cellNumeric} data-label="Credits"
								>{signedCredits(entry.credits)}</Table.Cell
							>
							<Table.Cell class={Table.cellMono} data-label="Job"
								>{entry.ref ? `… ${entry.ref}` : '—'}</Table.Cell
							>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</section>
{/if}

<section class={section} aria-labelledby="packs-heading">
	<h2 class={sectionTitle} id="packs-heading">Credit packs</h2>
	<p class={muted}>1 credit is $0.01. Your Free plan adds 100 credits each calendar month.</p>
	<ul class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 max-stack:grid-cols-1">
		{#each CREDIT_PACKS as pack (pack.pack)}
			<li class="flex flex-col gap-2 rounded-card border border-border bg-surface px-[18px] py-4">
				<p class="font-mono text-[22px] leading-tight text-foreground">
					{formatNumber(pack.credits)} credits
				</p>
				<p class="text-[15px] text-soft">{packPrice(pack.priceCents)}</p>
				{#if !onSale.has(pack.pack)}
					<p class="text-[13px] text-faint">Not on sale yet</p>
				{/if}
			</li>
		{/each}
	</ul>
</section>
