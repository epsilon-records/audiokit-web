<script lang="ts">
	import { formatNumber, formatPercent, percent } from '#lib/format';

	type Props = {
		rows: { operation: string; jobs: number }[];
	};

	let { rows }: Props = $props();

	let view: 'bars' | 'table' = $state('bars');
	const total = $derived(rows.reduce((sum, row) => sum + row.jobs, 0));
</script>

<div class="breakdown">
	<div class="actions breakdown-toggle">
		<button
			type="button"
			class="btn btn-ghost btn-sm"
			aria-pressed={view === 'table'}
			onclick={() => (view = view === 'bars' ? 'table' : 'bars')}
		>
			{view === 'bars' ? 'Show as table' : 'Show as bars'}
		</button>
	</div>

	{#if view === 'bars'}
		{#each rows as row (row.operation)}
			<div class="breakdown-row">
				<span class="name">{row.operation}</span>
				<div class="meter">
					<div
						class="meter-track"
						role="progressbar"
						aria-label="{row.operation} share of jobs"
						aria-valuemin={0}
						aria-valuemax={total}
						aria-valuenow={row.jobs}
						aria-valuetext="{row.jobs} jobs ({formatPercent(percent(row.jobs, total))})"
					>
						<div class="meter-fill" style:width="{percent(row.jobs, total)}%"></div>
					</div>
				</div>
				<span class="count"
					>{formatNumber(row.jobs)} · {formatPercent(percent(row.jobs, total))}</span
				>
			</div>
		{/each}
	{:else}
		<div class="table-box">
			<table>
				<caption>Jobs by operation this period</caption>
				<thead>
					<tr>
						<th scope="col">Operation</th>
						<th scope="col" class="numeric">Jobs</th>
						<th scope="col" class="numeric">Share</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.operation)}
						<tr>
							<td class="mono">{row.operation}</td>
							<td class="numeric">{formatNumber(row.jobs)}</td>
							<td class="numeric">{formatPercent(percent(row.jobs, total))}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
