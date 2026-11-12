<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AuthCard from '#lib/components/AuthCard.svelte';

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
			<form class="form-stack">
				<div class="field">
					<label for="email">Email</label>
					<input class="input" id="email" type="email" value="you@example.com" />
				</div>
				<button type="submit" class="btn btn-primary">Email me a link</button>
			</form>
		</AuthCard>
	{/snippet}
</Story>
