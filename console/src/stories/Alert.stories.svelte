<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Alert from '#lib/components/Alert.svelte';
	import { outOfCreditsNotice } from '#lib/credits';

	const { Story } = defineMeta({
		title: 'Console/Alert',
		component: Alert,
		tags: ['autodocs']
	});
</script>

<Story name="Info">
	{#snippet template()}
		<Alert tone="info"><span>Confirm your email to unlock API keys.</span></Alert>
	{/snippet}
</Story>

<Story name="Success">
	{#snippet template()}
		<Alert tone="ok"><span>Your email address is confirmed.</span></Alert>
	{/snippet}
</Story>

<Story name="Warning">
	{#snippet template()}
		<Alert tone="warn" role="alert">
			<span
				><strong>Out of credits.</strong>
				{outOfCreditsNotice(new Date('2026-11-14T12:00:00.000Z'))}</span
			>
		</Alert>
	{/snippet}
</Story>
