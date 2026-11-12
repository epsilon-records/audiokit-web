<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PlanCard from '#lib/components/PlanCard.svelte';
	import { freePlan } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/PlanCard',
		component: PlanCard,
		tags: ['autodocs']
	});
</script>

<Story name="Free, current">
	{#snippet template()}
		<PlanCard plan={freePlan} current>
			<button type="button" class="btn btn-ghost" disabled>Current plan</button>
		</PlanCard>
	{/snippet}
</Story>

<!-- Shown to an account on another plan: the card states Free's 100 credits a month (0052). -->
<Story name="Free, not current">
	{#snippet template()}
		<PlanCard plan={freePlan} current={false}>
			<button type="button" class="btn btn-ghost">Choose Free</button>
		</PlanCard>
	{/snippet}
</Story>
