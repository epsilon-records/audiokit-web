<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Welcome from '#lib/components/Welcome.svelte';
	import { account } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/Welcome',
		component: Welcome,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { email: account.email, name: account.name }
	});
</script>

<!-- The example keys below are placeholders. No real key or secret is ever used in a story. -->
<Story
	name="New account"
	args={{
		apiKey: 'ak_live_example_not_a_real_key',
		webhookSecret: 'whsec_example_not_a_real_secret'
	}}
/>
<Story name="Returning, no key shown" />
<Story name="With an error" args={{ error: 'Enter your name to continue.' }} />
