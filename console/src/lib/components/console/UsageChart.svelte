<script lang="ts">
	import { formatNumber, formatShortDate } from '#lib/format';

	type Props = {
		daily: { date: string; jobs: number }[];
	};

	let { daily }: Props = $props();

	// Inline SVG: no charting vendor (design open question on charts).
	const width = 720;
	const height = 180;
	const plotHeight = 140;
	const gap = 4;

	const max = $derived(Math.max(1, ...daily.map((point) => point.jobs)));
	const barWidth = $derived(
		daily.length > 0 ? Math.max(2, (width - gap * (daily.length - 1)) / daily.length) : 0
	);
	const total = $derived(daily.reduce((sum, point) => sum + point.jobs, 0));
	const busiest = $derived(
		daily.reduce((best, point) => (point.jobs > best.jobs ? point : best), {
			date: '',
			jobs: 0
		})
	);
	const first = $derived(daily.at(0));
	const last = $derived(daily.at(-1));
	const firstLabel = $derived(first ? formatShortDate(first.date) : '');
	const lastLabel = $derived(last ? formatShortDate(last.date) : '');
	const summary = $derived(
		daily.length === 0
			? 'No jobs in this period.'
			: `${formatNumber(total)} jobs across ${daily.length} days. Busiest day: ${formatShortDate(busiest.date)} with ${busiest.jobs} jobs.`
	);
</script>

<figure class="rounded-card border border-border bg-surface-2 p-4 max-stack:p-3">
	<svg
		class="block h-auto w-full"
		viewBox="0 0 {width} {height + 26}"
		role="img"
		aria-label="Jobs per day this period. {summary}"
	>
		{#each [0, 0.5, 1] as ratio (ratio)}
			<line
				class="stroke-border"
				x1="0"
				x2={width}
				y1={plotHeight * ratio}
				y2={plotHeight * ratio}
			/>
		{/each}

		{#each daily as point, index (point.date)}
			{@const barHeight = max === 0 ? 0 : (point.jobs / max) * (plotHeight - 4)}
			{@const x = index * (barWidth + gap)}
			<rect
				class="fill-accent hover:fill-accent-hover"
				{x}
				y={plotHeight - barHeight}
				width={barWidth}
				height={barHeight}
				rx="2"
				role="img"
				aria-label="{formatShortDate(point.date)}: {point.jobs} jobs"
			>
				<title>{formatShortDate(point.date)}: {point.jobs} jobs</title>
			</rect>
		{/each}

		{#if first && last}
			<text class="fill-faint font-mono text-[10px]" x="0" y={height + 22}>{firstLabel}</text>
			<text class="fill-faint font-mono text-[10px]" x={width} y={height + 22} text-anchor="end"
				>{lastLabel}</text
			>
		{/if}
		<text class="fill-faint font-mono text-[10px]" x="0" y="10">{formatNumber(max)} max</text>
	</svg>
	<figcaption class="mt-2 text-[12px] text-faint">
		Jobs per day · {summary} The table below is the text equivalent.
	</figcaption>
</figure>
