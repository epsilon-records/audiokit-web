<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatTile from '#lib/components/console/StatTile.svelte';
	import { outOfCreditsNotice } from '#lib/credits';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { creditsLeft } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/StatTile',
		component: StatTile,
		tags: ['autodocs'],
		args: {
			label: 'Credit balance',
			value: String(creditsLeft),
			hint: 'Free credits renew each calendar month (UTC)'
		}
	});
</script>

<Story name="Default" />
<Story
	name="Out of credits"
	args={{
		tone: 'warn',
		value: '0',
		hint: `Out of credits. ${outOfCreditsNotice(new Date('2026-11-14T12:00:00.000Z'))}`
	}}
/>
<Story name="Balance unavailable" args={{ value: 'Balance unavailable' }} />
<Story
	name="Jobs this month"
	args={{ label: 'Jobs this month', value: '84', hint: 'Submitted this period · Free plan' }}
/>
<Story name="With low-balance badge" args={{ tone: 'warn', value: '12' }}>
	{#snippet template(args)}
		<StatTile {...args}>
			<p class="flex flex-wrap items-center gap-2 text-[13px] text-muted">
				<Badge tone="warn">Low</Badge><span>Below 20 credits since 14 Nov.</span>
			</p>
		</StatTile>
	{/snippet}
</Story>
