<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Button } from '#lib/components/ui/button/index.js';
	import EmptyState from '#lib/components/console/EmptyState.svelte';

	const { Story } = defineMeta({
		title: 'Console/EmptyState',
		component: EmptyState,
		tags: ['autodocs']
	});
</script>

<Story name="With action">
	{#snippet template()}
		<EmptyState title="No API keys yet">
			<p>Create a key to call the AudioKit API.</p>
			{#snippet actions()}
				<Button variant="primary">Create a key</Button>
			{/snippet}
		</EmptyState>
	{/snippet}
</Story>

<Story name="Title only">
	{#snippet template()}
		<EmptyState title="No jobs in this period" />
	{/snippet}
</Story>
