<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import OperationBreakdown from '#lib/components/OperationBreakdown.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import UsageChart from '#lib/components/UsageChart.svelte';
	import { formatDate, formatNumber, formatPercent, percent } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const usage = $derived(data.usage);
	const usedShare = $derived(percent(usage.jobsUsed, usage.jobLimit));
	const hasActivity = $derived(usage.jobsUsed > 0 || usage.daily.some((day) => day.jobs > 0));
</script>

<svelte:head>
	<title>Usage · AudioKit console</title>
</svelte:head>

<PageHeader
	title="Usage"
	kicker="Metering"
	description="Every submitted operation counts as one job. The current period runs {formatDate(
		usage.periodStart
	)} – {formatDate(usage.periodEnd)} (UTC)."
/>

{#if !hasActivity}
	<EmptyState title="No jobs this period">
		Submit your first job with an API key, and usage will appear here.
		<div class="actions">
			<a class="btn btn-primary" href="/api-keys">Create API key</a>
			<a class="link" href="https://audiokit.ai/docs/">Read the guide ↗</a>
		</div>
	</EmptyState>
{:else}
	<section class="panel" aria-labelledby="period-usage">
		<div class="panel-bar">
			<span id="period-usage">This billing period</span>
			<span>{formatNumber(usage.jobsUsed)} / {formatNumber(usage.jobLimit)} jobs</span>
		</div>
		<div class="panel-body">
			<Meter used={usage.jobsUsed} limit={usage.jobLimit} label="Jobs used this billing period" />
			<p class="faint">
				{formatPercent(usedShare)} of the {formatNumber(usage.jobLimit)}-job limit used · resets
				{formatDate(usage.periodEnd)}
			</p>
			<UsageChart daily={usage.daily} />
		</div>
	</section>

	<section class="section-block" aria-labelledby="by-operation">
		<h2 id="by-operation">By operation</h2>
		<p>Share of this period's jobs by operation, with retired operations in “other”.</p>
		<OperationBreakdown rows={usage.byOperation} />
	</section>

	<section class="section-block" aria-labelledby="history">
		<h2 id="history">History — last 12 periods</h2>
		<div class="table-box">
			<table class="stack">
				<caption>Job counts and limits for the last 12 billing periods (UTC).</caption>
				<thead>
					<tr>
						<th scope="col">Period</th>
						<th scope="col" class="numeric">Jobs</th>
						<th scope="col" class="numeric">Limit</th>
						<th scope="col">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each usage.history as period (period.period)}
						<tr>
							<td data-label="Period">{period.period}</td>
							<td class="numeric" data-label="Jobs">{formatNumber(period.jobs)}</td>
							<td class="numeric" data-label="Limit">{formatNumber(period.limit)}</td>
							<td data-label="Status"><StatusBadge status={period.status} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}
