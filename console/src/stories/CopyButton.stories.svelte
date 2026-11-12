<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CopyButton from '#lib/components/CopyButton.svelte';

	const { Story } = defineMeta({
		title: 'Console/CopyButton',
		component: CopyButton,
		tags: ['autodocs'],
		args: { value: 'ak_live_example_not_a_real_key' }
	});
</script>

<Story name="Default" />
<Story name="Custom label" args={{ label: 'Copy key' }} />
