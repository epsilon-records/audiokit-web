<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { formatNumber, formatPercent, percent } from '#lib/format';

	type Props = {
		rows: { operation: string; jobs: number }[];
	};

	let { rows }: Props = $props();

	let view: 'bars' | 'table' = $state('bars');
	const total = $derived(rows.reduce((sum, row) => sum + row.jobs, 0));
</script>

<div class="flex flex-col gap-3.5">
	<div class="flex justify-end">
		<Button
			size="small"
			aria-pressed={view === 'table'}
			onclick={() => (view = view === 'bars' ? 'table' : 'bars')}
		>
			{view === 'bars' ? 'Show as table' : 'Show as bars'}
		</Button>
	</div>

	{#if view === 'bars'}
		{#each rows as row (row.operation)}
			<div
				class="grid grid-cols-[9rem_minmax(0,1fr)_5.5rem] items-center gap-4 text-[14px] max-stack:grid-cols-[minmax(0,1fr)_auto] max-stack:gap-x-2.5 max-stack:gap-y-1.5"
			>
				<span class="min-w-0 truncate font-mono text-foreground">{row.operation}</span>
				<div class="max-stack:col-span-2 max-stack:row-start-2">
					<div
						class="h-2 overflow-hidden rounded-full border border-border bg-surface-2"
						role="progressbar"
						aria-label="{row.operation} share of jobs"
						aria-valuemin={0}
						aria-valuemax={total}
						aria-valuenow={row.jobs}
						aria-valuetext="{row.jobs} jobs ({formatPercent(percent(row.jobs, total))})"
					>
						<div
							class="h-full rounded-full bg-accent"
							style:width="{percent(row.jobs, total)}%"
						></div>
					</div>
				</div>
				<span class="text-right font-mono text-muted"
					>{formatNumber(row.jobs)} · {formatPercent(percent(row.jobs, total))}</span
				>
			</div>
		{/each}
	{:else}
		<Table.Root>
			<Table.Caption>Jobs by operation this period</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>Operation</Table.Head>
					<Table.Head class="text-right">Jobs</Table.Head>
					<Table.Head class="text-right">Share</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each rows as row (row.operation)}
					<Table.Row>
						<Table.Cell class={Table.cellMono}>{row.operation}</Table.Cell>
						<Table.Cell class={Table.cellNumeric}>{formatNumber(row.jobs)}</Table.Cell>
						<Table.Cell class={Table.cellNumeric}
							>{formatPercent(percent(row.jobs, total))}</Table.Cell
						>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
