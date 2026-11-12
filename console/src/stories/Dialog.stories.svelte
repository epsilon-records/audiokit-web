<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Dialog from '#lib/components/Dialog.svelte';

	const { Story } = defineMeta({
		title: 'Console/Dialog',
		component: Dialog,
		tags: ['autodocs']
	});
</script>

<Story name="Revoke a key">
	{#snippet template()}
		<Dialog open title="Revoke this key?">
			<p>Calls made with the key "laptop" stop working straight away. This cannot be undone.</p>
			{#snippet actions()}
				<button type="button" class="btn btn-ghost">Cancel</button>
				<button type="button" class="btn btn-primary">Revoke key</button>
			{/snippet}
		</Dialog>
	{/snippet}
</Story>

<Story name="Not dismissible">
	{#snippet template()}
		<Dialog open dismissible={false} title="Revoking key">
			<p>Working on it. This takes a moment.</p>
		</Dialog>
	{/snippet}
</Story>
