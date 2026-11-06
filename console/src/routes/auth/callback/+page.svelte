<script lang="ts">
	import AuthCard from '#lib/components/AuthCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Signing in · AudioKit console</title>
</svelte:head>

<AuthCard
	title={data.ok === false ? 'That link did not work' : 'Signing you in'}
	subtitle={data.ok === false
		? 'Sign-in links are single use and expire quickly.'
		: 'Hang on while we check your link.'}
>
	{#if data.ok === false}
		<p class="muted" role="alert">{data.error}</p>
		<a class="btn btn-primary" href="/login">Request a new link</a>
	{:else}
		<p class="muted" aria-live="polite">Verifying your link…</p>
	{/if}
</AuthCard>
