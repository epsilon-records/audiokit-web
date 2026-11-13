<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatTile from '#lib/components/StatTile.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import { FREE_CREDITS_PER_MONTH, creditsLeft, creditsUsed } from './mock-data';

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
		hint: 'Out of credits. New jobs are refused until the account tops up'
	}}
/>
<Story name="Balance unavailable" args={{ value: 'Balance unavailable' }} />
<Story
	name="Jobs this month"
	args={{ label: 'Jobs this month', value: '84', hint: 'Submitted this period · Free plan' }}
/>
<Story name="With meter">
	{#snippet template(args)}
		<StatTile {...args}>
			<Meter
				used={creditsUsed}
				limit={FREE_CREDITS_PER_MONTH}
				label="Free credits used this month"
				showCaption={false}
			/>
		</StatTile>
	{/snippet}
</Story>
