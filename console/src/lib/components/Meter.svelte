<script lang="ts">
	import { formatPercent, percent } from '#lib/format';

	type Props = {
		used: number;
		limit: number;
		/** Accessible name for the progressbar. */
		label: string;
		/** Percentage at which the bar switches to the warning colour. */
		warnAt?: number;
		showCaption?: boolean;
	};

	let { used, limit, label, warnAt = 80, showCaption = true }: Props = $props();

	const value = $derived(percent(used, limit));
	const atLimit = $derived(used >= limit);
</script>

<div class="meter">
	<div
		class="meter-track"
		role="progressbar"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={limit}
		aria-valuenow={used}
		aria-valuetext="{used} of {limit} used"
	>
		<div class="meter-fill" class:meter-fill-warn={value >= warnAt} style:width="{value}%"></div>
	</div>
	{#if showCaption}
		<div class="meter-caption">
			<span>{atLimit ? 'Quota reached' : `${formatPercent(value)} used`}</span>
			<span>{used} / {limit}</span>
		</div>
	{/if}
</div>
