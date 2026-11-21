<script lang="ts">
	import Alert from '#lib/components/console/Alert.svelte';
	import AuthCard from '#lib/components/console/AuthCard.svelte';
	import { actions, formStack, link, linkTarget, muted } from '#lib/components/console/classes';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import SignupSourceFields from '#lib/components/console/SignupSourceFields.svelte';
	import { signupSourceQuery } from '#lib/signup-source';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// First-touch signup source (decision 0040), kept across a resend and between the screens.
	let source = $derived(form?.source ?? data.source);
	let carry = $derived(signupSourceQuery(source ?? undefined));
</script>

<svelte:head>
	<title>Sign in · AudioKit console</title>
</svelte:head>

<AuthCard
	title={form?.sent ? 'Check your inbox' : 'Sign in to your console'}
	subtitle={form?.sent
		? `We sent a sign-in link to ${form.email}. It works once and expires in 15 minutes.`
		: 'No password — we email you a magic link.'}
>
	{#if form?.sent}
		<div class={formStack}>
			<p class={muted}>
				Open the link on this device to finish signing in. If it doesn't arrive, check spam or send
				another.
			</p>

			{#if form.devLink}
				<!-- Mock-first: the billing service emails this link in production. It is shown
				     here so the flow can be walked without an inbox. -->
				<Alert tone="info" role="status">
					<span>Mock mode: no email is sent. Use the link below.</span>
					<div class="ml-auto">
						<Button variant="primary" size="small" href={form.devLink}>Open the magic link</Button>
					</div>
				</Alert>
			{/if}

			<form method="POST" action="?/send" class={actions}>
				<input type="hidden" name="email" value={form.email} />
				<input type="hidden" name="next" value={form.next} />
				<SignupSourceFields {source} />
				<Button type="submit">Send a new link</Button>
				<a class={linkTarget} href={`/login${carry}`}>Use a different email</a>
			</form>
		</div>
	{:else}
		<form method="POST" action="?/send" class={formStack}>
			{#if data.deleted}
				<Alert tone="ok" role="status">Your account was deleted.</Alert>
			{/if}
			<input type="hidden" name="next" value={data.next} />
			<SignupSourceFields {source} />

			<Field.Field data-invalid={form?.error ? 'true' : undefined}>
				<Field.Label for="email">Email</Field.Label>
				<Input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					placeholder="you@example.com"
					value={form?.email ?? ''}
					aria-invalid={form?.error ? 'true' : undefined}
					aria-describedby={form?.error ? 'email-error' : undefined}
				/>
				{#if form?.error}
					<Field.Error id="email-error">{form.error}</Field.Error>
				{/if}
			</Field.Field>

			<Button type="submit" variant="primary">Email me a sign-in link</Button>
		</form>

		<p class={muted}>
			New to AudioKit? <a class={link} href={`/signup${carry}`}>Start on the Free plan</a>
			— 100 credits a month, no card.
		</p>
	{/if}
</AuthCard>
