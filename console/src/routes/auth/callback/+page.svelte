<script lang="ts">
	import AuthCard from '#lib/components/AuthCard.svelte';
	import Welcome from '#lib/components/Welcome.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head
	><title>Welcome · AudioKit console</title><meta name="referrer" content="origin" /></svelte:head
>
{#if data.ok === true && typeof data.email === 'string'}
	<Welcome
		email={data.email}
		apiKey={data.apiKey}
		webhookSecret={data.webhookSecret}
		next={data.next}
	/>
{:else}
	<AuthCard
		title="That link did not work"
		subtitle="Links are single use and expire after 15 minutes."
	>
		<p class="muted" role="alert">{data.error}</p>
		<a class="btn btn-primary" href="/login">Request a new link</a>
		<p class="auth-sub">
			Already verified your email? <a class="link" href="/onboarding">Resume setup</a>.
		</p>
	</AuthCard>
{/if}
