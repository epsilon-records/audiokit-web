<script lang="ts">
	import AuthCard from '#lib/components/AuthCard.svelte';
	import SignupSourceFields from '#lib/components/SignupSourceFields.svelte';
	import { signupSourceQuery } from '#lib/signup-source';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// First-touch signup source (decision 0040), kept across a resend and between the screens.
	let source = $derived(form?.source ?? data.source);
	let carry = $derived(signupSourceQuery(source ?? undefined));
</script>

<svelte:head>
	<title>Create account · AudioKit console</title>
</svelte:head>

<AuthCard
	title={form?.sent ? 'Check your inbox' : 'Create your AudioKit account'}
	subtitle={form?.sent
		? `We sent a verification link to ${form.email}. It works once and expires in 15 minutes.`
		: 'Start free: 100 credits each calendar month. No card or password.'}
>
	{#if form?.sent}
		<div class="form-stack">
			<p class="muted">
				Open the link on this device to verify your email and create your account. If it doesn't
				arrive, check spam or send another.
			</p>

			{#if form.devLink}
				<!-- Mock-first: the billing service emails this link in production. It is shown
				     here so the flow can be walked without an inbox. -->
				<div class="notice notice-info">
					<span>Mock mode: no email is sent. Use the link below.</span>
					<div class="actions">
						<a class="btn btn-primary btn-sm" href={form.devLink}>Open the magic link</a>
					</div>
				</div>
			{/if}

			<form method="POST" action="?/send" class="actions">
				<input type="hidden" name="email" value={form.email} />
				<input type="hidden" name="next" value={form.next} />
				<SignupSourceFields {source} />
				<button type="submit" class="btn btn-ghost">Send a new link</button>
				<a class="link" href={`/signup${carry}`}>Use a different email</a>
			</form>
		</div>
	{:else}
		<form method="POST" action="?/send" class="form-stack">
			<input type="hidden" name="next" value={data.next} />
			<SignupSourceFields {source} />

			<div class="field">
				<label for="email">Email</label>
				<input
					class="input"
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					placeholder="you@example.com"
					value={form?.email ?? ''}
					aria-describedby={form?.error ? 'email-error' : undefined}
				/>
				{#if form?.error}
					<p class="field-error" id="email-error" role="alert">{form.error}</p>
				{/if}
			</div>

			<button type="submit" class="btn btn-primary">Email me a signup link</button>
		</form>

		<p class="auth-sub">
			Already have an account? <a class="link" href={`/login${carry}`}>Sign in</a>.
		</p>
	{/if}
</AuthCard>
