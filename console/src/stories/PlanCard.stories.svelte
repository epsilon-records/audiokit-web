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

<!--
	Only the current-plan state is shown. The card prints its own "jobs / month" line for a plan
	that is not current, and that copy still has to move to credits in the component.
-->
<Story name="Free, current">
	{#snippet template()}
		<PlanCard plan={freePlan} current>
			<button type="button" class="btn btn-ghost" disabled>Current plan</button>
		</PlanCard>
	{/snippet}
</Story>
