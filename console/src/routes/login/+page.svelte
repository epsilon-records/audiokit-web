<script lang="ts">
	import AuthCard from '#lib/components/AuthCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Sign in · AudioKit console</title>
</svelte:head>

<AuthCard
	title={form?.sent ? 'Check your inbox' : 'Sign in to your console'}
	subtitle={form?.sent
		? `We sent a sign-in link to ${form.email}. It works once and expires in 10 minutes.`
		: 'No password — we email you a magic link.'}
>
	{#if form?.sent}
		<div class="form-stack">
			<p class="muted">
				Open the link on this device to finish signing in. If it doesn't arrive, check spam or send
				another.
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
				<button type="submit" class="btn btn-ghost">Send a new link</button>
				<a class="link" href="/login">Use a different email</a>
			</form>
		</div>
	{:else}
		<form method="POST" action="?/send" class="form-stack">
			<input type="hidden" name="next" value={data.next} />

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

			<button type="submit" class="btn btn-primary">Email me a sign-in link</button>
		</form>

		<p class="auth-sub">
			New to AudioKit? <a class="link" href="https://audiokit.ai/pricing/">Start on the Free plan</a
			>
			— 100 jobs a month, no card.
		</p>
	{/if}
</AuthCard>
