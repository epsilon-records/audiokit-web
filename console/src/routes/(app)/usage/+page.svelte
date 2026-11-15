<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import OperationBreakdown from '#lib/components/OperationBreakdown.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import UsageChart from '#lib/components/UsageChart.svelte';
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
		<div class="actions">
			<a class="btn btn-primary" href="/api-keys">Create API key</a>
			<a class="link" href="https://audiokit.ai/docs/">Read the guide ↗</a>
		</div>
	</EmptyState>
{:else}
	<section class="panel" aria-labelledby="period-usage">
		<div class="panel-bar">
			<span id="period-usage">This billing period</span>
			<span>{formatNumber(usage.jobsUsed)} jobs</span>
		</div>
		<div class="panel-body">
			<p class="faint">
				{formatNumber(usage.jobsUsed)} jobs this period · ends {formatDate(usage.periodEnd)}
				{#if usage.stemsUsed > 0}
					· {formatNumber(usage.stemsUsed)} of them stem separations
				{/if}
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
				<caption>Job counts for the last 12 billing periods (UTC).</caption>
				<thead>
					<tr>
						<th scope="col">Period</th>
						<th scope="col" class="numeric">Jobs</th>
					</tr>
				</thead>
				<tbody>
					{#each usage.history as period (period.period)}
						<tr>
							<td data-label="Period">{period.period}</td>
							<td class="numeric" data-label="Jobs">{formatNumber(period.jobs)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}
