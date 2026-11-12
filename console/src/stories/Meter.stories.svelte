<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Meter from '#lib/components/Meter.svelte';
	import { FREE_CREDITS_PER_MONTH, creditsUsed } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/Meter',
		component: Meter,
		tags: ['autodocs'],
		args: {
			label: 'Free credits used this month',
			used: creditsUsed,
			limit: FREE_CREDITS_PER_MONTH
		}
	});
</script>

<Story name="Near the limit" />
<Story name="Plenty left" args={{ used: 12 }} />
<Story name="All spent" args={{ used: FREE_CREDITS_PER_MONTH }} />
<Story name="Without caption" args={{ showCaption: false }} />
