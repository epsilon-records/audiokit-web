<script lang="ts">
	import { enhance } from '$app/forms';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { formatDate, relativeTime } from '#lib/format';
	import type { ApiKey } from '#lib/types';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let createOpen = $state(false);
	let revealOpen = $state(false);
	let revokeOpen = $state(false);
	let revokeTarget: ApiKey | null = $state(null);

	const activeKeys = $derived(data.keys.filter((key) => !key.revoked));
	const created = $derived(form && 'created' in form ? form.created : null);
	const createError = $derived(form && 'createError' in form ? form.createError : null);
	const revokeError = $derived(form && 'revokeError' in form ? form.revokeError : null);
	const revokedLabel = $derived(form && 'revoked' in form ? form.revoked : null);

	// `form` keeps the created key until the next action, so the reveal renders from `reveal`
	// instead: once the dialog closes (Done, ✕ or Esc) that key is dismissed and neither it nor its
	// webhook secret stays in the DOM (EPSILON-124).
	let dismissedId: string | null = $state(null);
	const reveal = $derived(created && created.id !== dismissedId ? created : null);
	let revealShown = false;

	// Close the create dialog and open the one-time reveal when a key is created; drop the reveal
	// once it has been shown and closed.
	$effect(() => {
		// Read both up front: an effect only re-runs for what it read on its last run.
		const open = revealOpen;
		if (reveal && !revealShown) {
			revealShown = true;
			createOpen = false;
			revealOpen = true;
		} else if (reveal && !open) {
			revealShown = false;
			dismissedId = reveal.id;
		}
	});

	// Close the revoke dialog after a successful revoke.
	$effect(() => {
		if (revokedLabel) {
			revokeOpen = false;
			revokeTarget = null;
		}
	});
</script>

<svelte:head>
	<title>API keys · AudioKit console</title>
</svelte:head>

<PageHeader
	title="API keys"
	kicker="Access"
	description="Keep keys secret. They authorise jobs and are billed to your plan."
>
	{#snippet actions()}
		<button type="button" class="btn btn-primary" onclick={() => (createOpen = true)}>
			Create key
		</button>
	{/snippet}
</PageHeader>

{#if revokedLabel}
	<div class="notice notice-ok" role="status">
		Revoked <strong>{revokedLabel}</strong>. Any client using it will fail immediately.
	</div>
{/if}

{#if data.keys.length === 0}
	<EmptyState title="No API keys yet">
		Create a key, then submit your first job.
		<div class="actions">
			<button type="button" class="btn btn-primary" onclick={() => (createOpen = true)}>
				Create API key
			</button>
			<a class="link" href="https://audiokit.ai/docs/">Read the guide ↗</a>
		</div>
	</EmptyState>
{:else}
	<div class="table-box">
		<table class="stack">
			<caption>
				{activeKeys.length} active {activeKeys.length === 1 ? 'key' : 'keys'}. Revoked rows are kept
				for audit.
			</caption>
			<thead>
				<tr>
					<th scope="col">Label</th>
					<th scope="col">Key</th>
					<th scope="col">Created</th>
					<th scope="col">Last used</th>
					<th scope="col">State</th>
					<th scope="col"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.keys as key (key.id)}
					<tr>
						<td data-label="Label">{key.label}</td>
						<td class="mono" data-label="Key">{key.prefix}</td>
						<td class="mono" data-label="Created">{formatDate(key.createdAt)}</td>
						<td class="mono" data-label="Last used">{relativeTime(key.lastUsedAt)}</td>
						<td data-label="State">
							<StatusBadge status={key.revoked ? 'revoked' : 'active'} />
						</td>
						<td class="row-actions" data-label="Actions">
							{#if !key.revoked}
								<button
									type="button"
									class="btn btn-quiet btn-sm"
									onclick={() => {
										revokeTarget = key;
										revokeOpen = true;
									}}
								>
									Revoke
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<p class="faint">
	Only the key prefix is shown after creation. The full key and its webhook secret are displayed
	once, immediately after the key is made.
</p>

<!-- Create -->
<Dialog bind:open={createOpen} title="Create API key">
	<form method="POST" action="?/create" class="form-stack" use:enhance>
		<div class="field">
			<label for="key-label">Label (optional)</label>
			<input
				class="input"
				id="key-label"
				name="label"
				type="text"
				maxlength="40"
				placeholder="staging"
			/>
			<p class="field-hint">A name only you see, so you can tell keys apart.</p>
			{#if createError}
				<p class="field-error" role="alert">{createError}</p>
			{/if}
		</div>
		<div class="actions actions-end">
			<button type="button" class="btn btn-ghost" onclick={() => (createOpen = false)}
				>Cancel</button
			>
			<button type="submit" class="btn btn-primary">Create key</button>
		</div>
	</form>
</Dialog>

<!-- Reveal once -->
<Dialog bind:open={revealOpen} title="Key created — copy it now">
	{#if reveal}
		<p class="muted">This is the only time we'll show it. Store it somewhere safe.</p>
		<div class="panel">
			<div class="panel-bar">
				<span>{reveal.label}</span>
				<CopyButton value={reveal.secret} label="Copy key" />
			</div>
			<pre class="code">{reveal.secret}</pre>
		</div>
		{#if reveal.webhookSecret}
			<p class="muted">
				AudioKit signs this key's result webhooks with its webhook secret. Verify the
				<code>X-Signature</code> header with it (<a
					class="link"
					href="https://audiokit.ai/docs/#webhooks">how</a
				>). It is also shown only now.
			</p>
			<div class="panel">
				<div class="panel-bar">
					<span>Webhook secret</span>
					<CopyButton value={reveal.webhookSecret} label="Copy webhook secret" />
				</div>
				<pre class="code">{reveal.webhookSecret}</pre>
			</div>
		{/if}
		<div class="actions">
			<button type="button" class="btn btn-primary" onclick={() => (revealOpen = false)}
				>Done</button
			>
		</div>
	{/if}
</Dialog>

<!-- Revoke -->
<Dialog bind:open={revokeOpen} title="Revoke API key">
	{#if revokeTarget}
		<p class="muted">
			Revoke <strong>{revokeTarget.label}</strong> ({revokeTarget.prefix})? Any client using this
			key will start failing immediately. This can't be undone.
		</p>
		{#if revokeError}
			<p class="field-error" role="alert">{revokeError}</p>
		{/if}
		<form method="POST" action="?/revoke" use:enhance>
			<input type="hidden" name="id" value={revokeTarget.id} />
			<div class="actions actions-end">
				<button
					type="button"
					class="btn btn-ghost"
					onclick={() => {
						revokeOpen = false;
						revokeTarget = null;
					}}
				>
					Keep key
				</button>
				<button type="submit" class="btn btn-danger">Revoke key</button>
			</div>
		</form>
	{/if}
</Dialog>
