<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import UsageChart from '#lib/components/UsageChart.svelte';
	import { usage } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/UsageChart',
		component: UsageChart,
		tags: ['autodocs'],
		args: { daily: usage.daily }
	});
</script>

<Story name="Fourteen days" />
<Story name="Single day" args={{ daily: usage.daily.slice(0, 1) }} />
<Story name="No activity" args={{ daily: [] }} />
