<script lang="ts">
	import type { Snippet } from 'svelte';
	import { FREE_CREDITS_PER_MONTH } from '#lib/credits';
	import type { Plan } from '#lib/types';

	type Props = {
		plan: Plan;
		current: boolean;
		children: Snippet;
	};

	let { plan, current, children }: Props = $props();
</script>

<article
	class="pricing-card"
	class:pricing-card-featured={plan.featured && !current}
	class:pricing-card-current={current}
>
	{#if plan.featured && !current}
		<span class="pricing-badge">Most popular</span>
	{/if}
	<div class="pricing-header">
		<h2>{plan.name}</h2>
		<p class="pricing-description">
			{#if current}Your current plan{:else if plan.id === 'free'}{FREE_CREDITS_PER_MONTH.toLocaleString(
					'en-GB'
				)} credits / month{:else}Custom volume{/if}
		</p>
	</div>
	<div class="pricing-price">
		<span class="price-amount">{plan.priceLabel}</span>
		<span class="price-period">{plan.priceMonthly === null ? '' : '/ month'}</span>
	</div>
	<ul class="pricing-features">
		{#each plan.features as feature (feature)}
			<li>{feature}</li>
		{/each}
	</ul>
	{#if plan.delta}<p class="plan-delta">{plan.delta}</p>{/if}
	<div class="actions">{@render children()}</div>
</article>
