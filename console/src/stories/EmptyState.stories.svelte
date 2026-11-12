<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import EmptyState from '#lib/components/EmptyState.svelte';

	const { Story } = defineMeta({
		title: 'Console/EmptyState',
		component: EmptyState,
		tags: ['autodocs']
	});
</script>

<Story name="With action">
	{#snippet template()}
		<EmptyState title="No API keys yet">
			<p class="muted">Create a key to call the AudioKit API.</p>
			{#snippet actions()}
				<button type="button" class="btn btn-primary">Create a key</button>
			{/snippet}
		</EmptyState>
	{/snippet}
</Story>

<Story name="Title only">
	{#snippet template()}
		<EmptyState title="No jobs in this period" />
	{/snippet}
</Story>
