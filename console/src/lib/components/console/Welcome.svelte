<script lang="ts">
	import Alert from './Alert.svelte';
	import AuthCard from './AuthCard.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import CopyButton from './CopyButton.svelte';
	import Panel from './Panel.svelte';
	import { actions, formStack, link, muted } from './classes';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
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
	subtitle="Your email is verified. Your Free plan is ready: 100 credits each calendar month. No card required."
>
	<form method="POST" action="/onboarding?/complete" class={formStack}>
		<input type="hidden" name="next" value={next} />
		<h2>1. Your profile</h2>
		<p class={muted}>{email}</p>
		<Field.Field>
			<Field.Label for="name">Name</Field.Label>
			<Input id="name" name="name" autocomplete="name" maxlength={255} value={name} required />
		</Field.Field>
		<Field.Field>
			<Field.Label for="company">Company (optional)</Field.Label>
			<Input
				id="company"
				name="company"
				autocomplete="organization"
				maxlength={255}
				value={company}
			/>
		</Field.Field>
		<h2>2. Save your first API key</h2>
		{#if apiKey}
			<p class={muted}>
				Shown once. Store this key in a password manager or secret store. Never put it in browser
				code or source control.
			</p>
			<Panel code label="Default key">
				{#snippet bar()}<CopyButton value={apiKey} label="Copy key" />{/snippet}
				<CodeBlock value={apiKey} />
			</Panel>
			{#if webhookSecret}
				<p class={muted}>
					AudioKit signs this key's result webhooks with its webhook secret. Verify the
					<code>X-Signature</code> header with it. It is also shown only once.
				</p>
				<Panel code label="Webhook secret">
					{#snippet bar()}<CopyButton value={webhookSecret} label="Copy webhook secret" />{/snippet}
					<CodeBlock value={webhookSecret} />
				</Panel>
			{/if}
			<h2>3. Explore the API</h2>
			<p class={muted}>
				List available operations without submitting a job. This endpoint is public; job requests
				use your API key.
			</p>
			<Panel code label="Terminal">
				{#snippet bar()}<CopyButton value={example} label="Copy example" />{/snippet}
				<CodeBlock value={example} />
			</Panel>
			<Field.Field orientation="horizontal" class="items-start">
				<Checkbox id="savedKey" name="savedKey" required class="mt-0.5" />
				<Field.Label for="savedKey" class="text-[15px] font-normal text-soft"
					>{webhookSecret
						? 'I have saved my API key and webhook secret securely.'
						: 'I have saved my API key securely.'}</Field.Label
				>
			</Field.Field>
		{:else}
			<Alert tone="warn">
				The original key can only be shown once. If you did not save it, create a replacement below
				and revoke the unused key in API keys.
			</Alert>
		{/if}
		{#if error}<Field.Error>{error}</Field.Error>{/if}
		<Button type="submit" variant="primary">Finish setup</Button>
	</form>
	{#if !apiKey}
		<form method="POST" action="/onboarding?/createKey" class={actions}>
			<Button type="submit">Create a replacement key</Button>
		</form>
	{/if}
	<p class={muted}>
		Manage keys and usage in your console. <a class={link} href="https://audiokit.ai/docs/"
			>Read the API guide</a
		>.
	</p>
</AuthCard>
