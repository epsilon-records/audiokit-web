<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Button } from '#lib/components/ui/button/index.js';
	import PageHeader from '#lib/components/console/PageHeader.svelte';

	const { Story } = defineMeta({
		title: 'Console/PageHeader',
		component: PageHeader,
		tags: ['autodocs'],
		args: {
			title: 'API keys',
			kicker: 'Console',
			description: 'Keys authenticate your calls to the AudioKit API.'
		}
	});
</script>

<Story name="Default" />
<Story name="With meta" args={{ meta: 'Updated 14 Nov 2026' }} />
<Story name="With actions">
	{#snippet template(args)}
		<PageHeader {...args}>
			{#snippet actions()}
				<Button variant="primary">Create a key</Button>
			{/snippet}
		</PageHeader>
	{/snippet}
</Story>
