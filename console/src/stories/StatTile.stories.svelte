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
			label: 'Credits left',
			value: String(creditsLeft),
			hint: 'Free credits reset on 1 December (UTC)'
		}
	});
</script>

<Story name="Default" />
<Story name="Warning" args={{ tone: 'warn', value: '3', hint: 'Buy a pack to keep going' }} />
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
