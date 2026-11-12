<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Alert from '#lib/components/Alert.svelte';

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
		<Alert tone="ok"><span>Your 1,000-credit pack is on your account.</span></Alert>
	{/snippet}
</Story>

<Story name="Warning">
	{#snippet template()}
		<Alert tone="warn" role="alert">
			<span><strong>Out of credits.</strong> Buy a credit pack to keep submitting jobs.</span>
		</Alert>
	{/snippet}
</Story>
