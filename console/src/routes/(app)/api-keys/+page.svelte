<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/console/Alert.svelte';
	import CodeBlock from '#lib/components/console/CodeBlock.svelte';
	import CopyButton from '#lib/components/console/CopyButton.svelte';
	import EmptyState from '#lib/components/console/EmptyState.svelte';
	import PageHeader from '#lib/components/console/PageHeader.svelte';
	import Panel from '#lib/components/console/Panel.svelte';
	import StatusBadge from '#lib/components/console/StatusBadge.svelte';
	import {
		actions as actionRow,
		faint,
		link,
		linkTarget,
		muted
	} from '#lib/components/console/classes';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { toast } from '#lib/components/ui/sonner/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
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
	// Without JavaScript a key is revoked in two requests: the row's Revoke link opens this
	// confirmation (`?revoke=<id>`), whose form posts to the same `?/revoke` action the dialog uses.
	const revokeParam = $derived(page.url.searchParams.get('revoke'));
	const pendingRevoke = $derived(data.keys.find((key) => key.id === revokeParam && !key.revoked));

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

	// Close the revoke dialog after a successful revoke, and say so in a toast. The same words stay
	// on the page for anyone without JavaScript (the <noscript> notice below).
	let toasted: unknown = null;
	$effect(() => {
		if (revokedLabel && form !== toasted) {
			toasted = form;
			revokeOpen = false;
			revokeTarget = null;
			toast.success(`Revoked ${revokedLabel}. Any client using it will fail immediately.`);
		}
	});
</script>

<svelte:head>
	<title>API keys · AudioKit console</title>
</svelte:head>

<PageHeader
	title="API keys"
	kicker="Access"
	description="Keep keys secret. They authorise jobs, which spend your credits."
>
	{#snippet actions()}
		<Button variant="primary" onclick={() => (createOpen = true)}>Create key</Button>
	{/snippet}
</PageHeader>

{#if revokedLabel}
	<noscript>
		<Alert tone="ok" class="mb-5">
			<span
				>Revoked <strong>{revokedLabel}</strong>. Any client using it will fail immediately.</span
			>
		</Alert>
	</noscript>
{/if}

<!-- Without JavaScript: the same actions as plain forms. The dialogs below are the enhancement. -->
<noscript>
	{#if created}
		<Panel code label={created.label}>
			{#snippet bar()}<span class={faint}>Copy this key now. It is shown once.</span>{/snippet}
			<CodeBlock value={created.secret} />
		</Panel>
		{#if created.webhookSecret}
			<Panel code label="Webhook secret">
				{#snippet bar()}<span class={faint}>Also shown only now.</span>{/snippet}
				<CodeBlock value={created.webhookSecret} />
			</Panel>
		{/if}
	{/if}
	{#if createError}
		<Alert tone="warn" role="alert" class="mb-5">{createError}</Alert>
	{/if}
	{#if revokeError}
		<Alert tone="warn" role="alert" class="mb-5">{revokeError}</Alert>
	{/if}
	{#if pendingRevoke}
		<form method="POST" action="?/revoke" class="mb-5">
			<input type="hidden" name="id" value={pendingRevoke.id} />
			<Alert tone="warn">
				<span>
					Revoke <strong>{pendingRevoke.label}</strong> ({pendingRevoke.prefix})? Any client using
					this key will start failing immediately. This can't be undone.
				</span>
				<span class={actionRow}>
					<Button type="submit" variant="danger">Revoke key</Button>
					<a class={linkTarget} href="/api-keys">Keep key</a>
				</span>
			</Alert>
		</form>
	{/if}
	<form method="POST" action="?/create" class="mb-5 flex flex-wrap items-end gap-3">
		<Field.Field>
			<Field.Label for="key-label-nojs">Label (optional)</Field.Label>
			<Input id="key-label-nojs" name="label" type="text" maxlength={40} placeholder="staging" />
		</Field.Field>
		<Button type="submit" variant="primary">Create key</Button>
	</form>
</noscript>

{#if data.keys.length === 0}
	<EmptyState title="No API keys yet">
		Create a key, then submit your first job.
		<div class={actionRow}>
			<Button variant="primary" onclick={() => (createOpen = true)}>Create API key</Button>
			<a class={linkTarget} href="https://audiokit.ai/docs/">Read the guide ↗</a>
		</div>
	</EmptyState>
{:else}
	<Table.Root stack>
		<Table.Caption>
			{activeKeys.length} active {activeKeys.length === 1 ? 'key' : 'keys'}. Revoked rows are kept
			for audit.
		</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head>Label</Table.Head>
				<Table.Head>Key</Table.Head>
				<Table.Head>Created</Table.Head>
				<Table.Head>Last used</Table.Head>
				<Table.Head>State</Table.Head>
				<Table.Head><span class="sr-only">Actions</span></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.keys as key (key.id)}
				<Table.Row>
					<Table.Cell data-label="Label">{key.label}</Table.Cell>
					<Table.Cell class={Table.cellMono} data-label="Key">{key.prefix}</Table.Cell>
					<Table.Cell class={Table.cellMono} data-label="Created"
						>{formatDate(key.createdAt)}</Table.Cell
					>
					<Table.Cell class={Table.cellMono} data-label="Last used"
						>{relativeTime(key.lastUsedAt)}</Table.Cell
					>
					<Table.Cell data-label="State">
						<StatusBadge status={key.revoked ? 'revoked' : 'active'} />
					</Table.Cell>
					<Table.Cell class="text-right" data-label="Actions">
						{#if !key.revoked}
							<noscript>
								<a class={linkTarget} href="?revoke={key.id}">Revoke</a>
							</noscript>
							<Button
								variant="ghost"
								size="small"
								onclick={() => {
									revokeTarget = key;
									revokeOpen = true;
								}}
							>
								Revoke
							</Button>
						{/if}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}

<p class="{faint} mt-4">
	Only the key prefix is shown after creation. The full key and its webhook secret are displayed
	once, immediately after the key is made.
</p>

<!-- Create -->
<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header><Dialog.Title>Create API key</Dialog.Title></Dialog.Header>
		<form method="POST" action="?/create" use:enhance>
			<Dialog.Body>
				<Field.Field data-invalid={createError ? 'true' : undefined}>
					<Field.Label for="key-label">Label (optional)</Field.Label>
					<Input
						id="key-label"
						name="label"
						type="text"
						maxlength={40}
						placeholder="staging"
						aria-describedby={createError ? 'key-label-hint key-label-error' : 'key-label-hint'}
						aria-invalid={createError ? 'true' : undefined}
					/>
					<Field.Description id="key-label-hint"
						>A name only you see, so you can tell keys apart.</Field.Description
					>
					{#if createError}
						<Field.Error id="key-label-error">{createError}</Field.Error>
					{/if}
				</Field.Field>
			</Dialog.Body>
			<Dialog.Footer>
				<Button onclick={() => (createOpen = false)}>Cancel</Button>
				<Button type="submit" variant="primary">Create key</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Reveal once -->
<Dialog.Root bind:open={revealOpen}>
	<Dialog.Content>
		<Dialog.Header><Dialog.Title>Key created — copy it now</Dialog.Title></Dialog.Header>
		{#if reveal}
			<Dialog.Body>
				<p class={muted}>This is the only time we'll show it. Store it somewhere safe.</p>
				<Panel code label={reveal.label}>
					{#snippet bar()}<CopyButton value={reveal.secret} label="Copy key" />{/snippet}
					<CodeBlock value={reveal.secret} />
				</Panel>
				{#if reveal.webhookSecret}
					<p class={muted}>
						AudioKit signs this key's result webhooks with its webhook secret. Verify the
						<code>X-Signature</code> header with it (<a
							class={link}
							href="https://audiokit.ai/docs/#webhooks">how</a
						>). It is also shown only now.
					</p>
					<Panel code label="Webhook secret">
						{#snippet bar()}<CopyButton
								value={reveal.webhookSecret ?? ''}
								label="Copy webhook secret"
							/>{/snippet}
						<CodeBlock value={reveal.webhookSecret} />
					</Panel>
				{/if}
			</Dialog.Body>
			<Dialog.Footer>
				<Button variant="primary" onclick={() => (revealOpen = false)}>Done</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Revoke: an Alert Dialog, so it is answered with Keep key or Revoke key, not dismissed. -->
<AlertDialog.Root bind:open={revokeOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header class="pr-5"
			><AlertDialog.Title>Revoke API key</AlertDialog.Title></AlertDialog.Header
		>
		{#if revokeTarget}
			<form method="POST" action="?/revoke" use:enhance>
				<input type="hidden" name="id" value={revokeTarget.id} />
				<AlertDialog.Body>
					<AlertDialog.Description>
						Revoke <strong class="text-foreground">{revokeTarget.label}</strong>
						({revokeTarget.prefix})? Any client using this key will start failing immediately. This
						can't be undone.
					</AlertDialog.Description>
					{#if revokeError}
						<Field.Error>{revokeError}</Field.Error>
					{/if}
				</AlertDialog.Body>
				<AlertDialog.Footer>
					<AlertDialog.Cancel onclick={() => (revokeTarget = null)}>Keep key</AlertDialog.Cancel>
					<Button type="submit" variant="danger">Revoke key</Button>
				</AlertDialog.Footer>
			</form>
		{/if}
	</AlertDialog.Content>
</AlertDialog.Root>
