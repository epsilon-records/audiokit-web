<script lang="ts">
	import EmptyState from '#lib/components/console/EmptyState.svelte';
	import OperationBreakdown from '#lib/components/console/OperationBreakdown.svelte';
	import PageHeader from '#lib/components/console/PageHeader.svelte';
	import Panel from '#lib/components/console/Panel.svelte';
	import UsageChart from '#lib/components/console/UsageChart.svelte';
	import {
		actions,
		faint,
		linkTarget,
		section,
		sectionTitle
	} from '#lib/components/console/classes';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { formatDate, formatNumber } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const usage = $derived(data.usage);
	const hasActivity = $derived(usage.jobsUsed > 0 || usage.daily.some((day) => day.jobs > 0));
</script>

<svelte:head>
	<title>Usage · AudioKit console</title>
</svelte:head>

<PageHeader
	title="Usage"
	kicker="Metering"
	description="Jobs you have submitted. Each one spends credits by operation; your balance is on the dashboard. The current period runs {formatDate(
		usage.periodStart
	)} – {formatDate(usage.periodEnd)} (UTC)."
/>

{#if !hasActivity}
	<EmptyState title="No jobs this period">
		Submit your first job with an API key, and usage will appear here.
		<div class={actions}>
			<Button variant="primary" href="/api-keys">Create API key</Button>
			<a class={linkTarget} href="https://audiokit.ai/docs/">Read the guide ↗</a>
		</div>
	</EmptyState>
{:else}
	<Panel
		as="section"
		class="mb-6"
		aria-labelledby="period-usage"
		label="This billing period"
		labelId="period-usage"
	>
		{#snippet bar()}<span class="pr-3">{formatNumber(usage.jobsUsed)} jobs</span>{/snippet}
		<div class="flex flex-col gap-4 p-5 max-stack:p-4">
			<p class={faint}>
				{formatNumber(usage.jobsUsed)} jobs this period · ends {formatDate(usage.periodEnd)}
				{#if usage.stemsUsed > 0}
					· {formatNumber(usage.stemsUsed)} of them stem separations
				{/if}
			</p>
			<UsageChart daily={usage.daily} />
		</div>
	</Panel>

	<section class="{section} mb-6" aria-labelledby="by-operation">
		<h2 class={sectionTitle} id="by-operation">By operation</h2>
		<p class="max-w-[68ch] text-[15px] text-muted">
			Share of this period's jobs by operation, with retired operations in “other”.
		</p>
		<OperationBreakdown rows={usage.byOperation} />
	</section>

	<section class={section} aria-labelledby="history">
		<h2 class={sectionTitle} id="history">History — last 12 periods</h2>
		<Table.Root stack>
			<Table.Caption>Job counts for the last 12 billing periods (UTC).</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>Period</Table.Head>
					<Table.Head class="text-right">Jobs</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each usage.history as period (period.period)}
					<Table.Row>
						<Table.Cell data-label="Period">{period.period}</Table.Cell>
						<Table.Cell class={Table.cellNumeric} data-label="Jobs"
							>{formatNumber(period.jobs)}</Table.Cell
						>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</section>
{/if}
