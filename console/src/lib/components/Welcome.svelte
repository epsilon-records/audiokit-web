<script lang="ts">
	import AuthCard from './AuthCard.svelte';
	import CopyButton from './CopyButton.svelte';
	let {
		email,
		apiKey = null,
		webhookSecret = null,
		next = '/dashboard',
		name = '',
		company = '',
		error = null
	}: {
		email: string;
		apiKey?: string | null;
		/** The key's webhook secret, shown once beside it (EPSILON-124). */
		webhookSecret?: string | null;
		next?: string;
		name?: string;
		company?: string;
		error?: string | null;
	} = $props();
	const example = $derived(
		'curl https://api.audiokit.ai/v1/capabilities -H "Authorization: Bearer ' +
			(apiKey ?? 'YOUR_API_KEY') +
			'"'
	);
</script>

<AuthCard
	title="Welcome to AudioKit"
	subtitle="Your email is verified. Your Free plan is ready: 100 jobs/month, including up to 10 stem separations. No card required."
>
	<form method="POST" action="/onboarding?/complete" class="form-stack">
		<input type="hidden" name="next" value={next} />
		<h2>1. Your profile</h2>
		<p class="muted">{email}</p>
		<div class="field">
			<label for="name">Name</label><input
				class="input"
				id="name"
				name="name"
				autocomplete="name"
				maxlength="255"
				value={name}
				required
			/>
		</div>
		<div class="field">
			<label for="company">Company (optional)</label><input
				class="input"
				id="company"
				name="company"
				autocomplete="organization"
				maxlength="255"
				value={company}
			/>
		</div>
		<h2>2. Save your first API key</h2>
		{#if apiKey}
			<p class="muted">
				Shown once. Store this key in a password manager or secret store. Never put it in browser
				code or source control.
			</p>
			<div class="panel">
				<div class="panel-bar">
					<span>Default key</span><CopyButton value={apiKey} label="Copy key" />
				</div>
				<pre class="code">{apiKey}</pre>
			</div>
			{#if webhookSecret}
				<p class="muted">
					AudioKit signs this key's result webhooks with its webhook secret. Verify the
					<code>X-Signature</code> header with it. It is also shown only once.
				</p>
				<div class="panel">
					<div class="panel-bar">
						<span>Webhook secret</span><CopyButton
							value={webhookSecret}
							label="Copy webhook secret"
						/>
					</div>
					<pre class="code">{webhookSecret}</pre>
				</div>
			{/if}
			<h2>3. Explore the API</h2>
			<p class="muted">
				List available operations without submitting a job. This endpoint is public; job requests
				use your API key.
			</p>
			<div class="panel">
				<div class="panel-bar">
					<span>Terminal</span><CopyButton value={example} label="Copy example" />
				</div>
				<pre class="code">{example}</pre>
			</div>
			<label class="checkbox"
				><input type="checkbox" name="savedKey" required /><span
					>{webhookSecret
						? 'I have saved my API key and webhook secret securely.'
						: 'I have saved my API key securely.'}</span
				></label
			>
		{:else}
			<p class="notice notice-warn">
				The original key can only be shown once. If you did not save it, create a replacement below
				and revoke the unused key in API keys.
			</p>
		{/if}
		{#if error}<p class="field-error" role="alert">{error}</p>{/if}
		<button type="submit" class="btn btn-primary">Finish setup</button>
	</form>
	{#if !apiKey}
		<form method="POST" action="/onboarding?/createKey" class="actions">
			<button type="submit" class="btn btn-ghost">Create a replacement key</button>
		</form>
	{/if}
	<p class="auth-sub">
		Manage keys and usage in your console. <a class="link" href="https://audiokit.ai/docs/"
			>Read the API guide</a
		>.
	</p>
</AuthCard>
