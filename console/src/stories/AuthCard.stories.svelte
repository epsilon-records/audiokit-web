<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AuthCard from '#lib/components/console/AuthCard.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';

	const { Story } = defineMeta({
		title: 'Console/AuthCard',
		component: AuthCard,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Sign in">
	{#snippet template()}
		<AuthCard title="Sign in" subtitle="We email you a link. No password.">
			<form class="flex flex-col gap-[18px]" onsubmit={(event) => event.preventDefault()}>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" type="email" value="you@example.com" />
				</Field.Field>
				<Button type="submit" variant="primary">Email me a link</Button>
			</form>
		</AuthCard>
	{/snippet}
</Story>
