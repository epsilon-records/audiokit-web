<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import OperationBreakdown from '#lib/components/OperationBreakdown.svelte';
	import { usage } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/OperationBreakdown',
		component: OperationBreakdown,
		tags: ['autodocs'],
		args: { rows: usage.byOperation }
	});
</script>

<Story name="Default" />
<Story name="Two operations" args={{ rows: usage.byOperation.slice(0, 2) }} />
