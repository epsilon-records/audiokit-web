<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '#lib/components/console/Alert.svelte';
	import PageHeader from '#lib/components/console/PageHeader.svelte';
	import Panel from '#lib/components/console/Panel.svelte';
	import SettingsTabs from '#lib/components/console/SettingsTabs.svelte';
	import { actions, formStack, muted, stack } from '#lib/components/console/classes';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { toast } from '#lib/components/ui/sonner/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const profileSaved = $derived(form && 'profileSaved' in form ? form.profileSaved : false);
	const preferencesSaved = $derived(
		form && 'preferencesSaved' in form ? form.preferencesSaved : false
	);
	const profileError = $derived(form && 'profileError' in form ? form.profileError : null);
	const deleteError = $derived(form && 'deleteError' in form ? form.deleteError : null);
	// The switch shows only when billing reports the preference (EPSILON-257, epsilon-billing#81).
	const lowBalanceAlerts = $derived(data.preferences.lowBalanceAlerts);

	// Saved results are toasts; the same words stay on the page without JavaScript (<noscript>).
	let toasted: unknown = null;
	$effect(() => {
		if (form === toasted) return;
		if (profileSaved) toast.success('Profile saved.');
		else if (preferencesSaved) toast.success('Preferences saved.');
		else return;
		toasted = form;
	});

	// Delete stays disabled until the typed address matches. The server checks it again.
	let confirmEmail = $state('');
	let deleting = $state(false);
	let confirmOpen = $state(false);
	let deleteForm: HTMLFormElement | null = $state(null);
	const confirmed = $derived(
		confirmEmail.trim().toLowerCase() === data.account.email.toLowerCase() && confirmEmail !== ''
	);

	const rowSwitch = 'flex min-h-11 items-start gap-3';
</script>

<svelte:head>
	<title>Settings · AudioKit console</title>
</svelte:head>

<PageHeader
	title="Settings"
	kicker="Account"
	description="Your profile, email preferences and the danger zone. Billing lives on its own tab."
/>

<SettingsTabs />

<div class={stack}>
	<Panel as="section" aria-labelledby="profile-heading" label="Profile" labelId="profile-heading">
		<form method="POST" action="?/saveProfile" class="{formStack} p-5 max-stack:p-4" use:enhance>
			<div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px]">
				<Field.Field>
					<Field.Label for="name">Name</Field.Label>
					<Input id="name" name="name" value={data.account.name} required />
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" type="email" value={data.account.email} readonly />
					<Field.Description>
						{#if data.account.emailVerified}
							<Badge tone="ok">Verified</Badge>
						{:else}
							Not verified — sign-in links still work, but API keys stay locked.
						{/if}
					</Field.Description>
				</Field.Field>
			</div>
			<p class="text-[13px] text-faint">
				Changing your email is not implemented yet: it requires re-verification through the billing
				service.
			</p>
			{#if profileError}
				<Field.Error>{profileError}</Field.Error>
			{/if}
			{#if profileSaved}
				<noscript><Alert tone="ok">Profile saved.</Alert></noscript>
			{/if}
			<div class={actions}>
				<Button type="submit" variant="primary">Save changes</Button>
			</div>
		</form>
	</Panel>

	<Panel
		as="section"
		aria-labelledby="password-heading"
		label="Password"
		labelId="password-heading"
	>
		<div class="p-5 max-stack:p-4">
			<p class={muted}>
				You sign in with an email magic link — there is no password to manage. Use
				<strong>Sign out</strong> below to sign out on every device.
			</p>
		</div>
	</Panel>

	<Panel
		as="section"
		aria-labelledby="notifications-heading"
		label="Notifications"
		labelId="notifications-heading"
	>
		<form
			method="POST"
			action="?/savePreferences"
			class="{formStack} p-5 max-stack:p-4"
			use:enhance
		>
			<Field.Field orientation="horizontal" class="items-start">
				<Checkbox
					id="paymentReceipts"
					name="paymentReceipts"
					checked={data.preferences.paymentReceipts}
					aria-describedby="paymentReceipts-hint"
					class="mt-0.5"
				/>
				<div class="flex flex-col gap-0.5">
					<Field.Label for="paymentReceipts" class="font-bold text-soft"
						>Payment receipts</Field.Label
					>
					<Field.Description id="paymentReceipts-hint"
						>Always sent for charges; required for your records.</Field.Description
					>
				</div>
			</Field.Field>
			<Field.Field orientation="horizontal" class="items-start">
				<Checkbox
					id="productUpdates"
					name="productUpdates"
					checked={data.preferences.productUpdates}
					aria-describedby="productUpdates-hint"
					class="mt-0.5"
				/>
				<div class="flex flex-col gap-0.5">
					<Field.Label for="productUpdates" class="font-bold text-soft">Product updates</Field.Label
					>
					<Field.Description id="productUpdates-hint"
						>Occasional news about new operations and features.</Field.Description
					>
				</div>
			</Field.Field>
			{#if lowBalanceAlerts !== undefined}
				<div class={rowSwitch}>
					<Switch
						id="lowBalanceAlerts"
						name="lowBalanceAlerts"
						checked={lowBalanceAlerts}
						aria-describedby="lowBalanceAlerts-hint"
						class="mt-0.5"
					/>
					<div class="flex flex-col gap-0.5">
						<Field.Label for="lowBalanceAlerts" class="font-bold text-soft"
							>Low-balance alerts</Field.Label
						>
						<Field.Description id="lowBalanceAlerts-hint"
							>An email when your credit balance runs low, and one when it reaches zero.</Field.Description
						>
					</div>
				</div>
			{/if}
			{#if preferencesSaved}
				<noscript><Alert tone="ok">Preferences saved.</Alert></noscript>
			{/if}
			<div class={actions}>
				<Button type="submit" variant="primary">Save preferences</Button>
			</div>
		</form>
	</Panel>

	<Panel as="section" aria-labelledby="session-heading" label="Session" labelId="session-heading">
		<div class="flex flex-col gap-4 p-5 max-stack:p-4">
			<p class={muted}>
				{data.account.email} · Plan resets {formatDate(data.account.renewsAt)}
			</p>
			<form method="POST" action="/logout" class={actions}>
				<Button type="submit">Sign out</Button>
			</form>
		</div>
	</Panel>

	<Panel
		as="section"
		aria-labelledby="danger-heading"
		label="⚠ Danger zone"
		labelId="danger-heading"
	>
		<div class="flex flex-col gap-4 p-5 max-stack:p-4">
			<p class={muted}>
				<strong class="text-foreground">Delete account</strong> — deletes your account, revokes and removes
				all API keys, cancels any subscription and deletes your jobs, usage data and billing profile.
				Invoices and payment records are kept for 7 years because Dutch tax law requires it. This can't
				be undone.
			</p>
			<form
				bind:this={deleteForm}
				method="POST"
				action="?/deleteAccount"
				class={formStack}
				use:enhance={() => {
					deleting = true;
					confirmOpen = false;
					return async ({ update }) => {
						await update();
						deleting = false;
					};
				}}
			>
				<Field.Field data-invalid={deleteError ? 'true' : undefined}>
					<Field.Label for="confirmEmail" class="block [overflow-wrap:anywhere]"
						>Type <strong>{data.account.email}</strong> to confirm</Field.Label
					>
					<Input
						id="confirmEmail"
						name="confirmEmail"
						type="email"
						autocomplete="off"
						bind:value={confirmEmail}
						aria-invalid={deleteError ? 'true' : undefined}
						aria-describedby={deleteError ? 'delete-error' : undefined}
					/>
				</Field.Field>
				{#if deleteError}
					<Field.Error id="delete-error">{deleteError}</Field.Error>
				{/if}
				<div class={actions}>
					<!-- Without JavaScript this submits straight away, after the typed address; with it,
					     an Alert Dialog asks once more. -->
					<Button
						type="submit"
						variant="danger"
						disabled={!confirmed || deleting}
						onclick={(event: MouseEvent) => {
							event.preventDefault();
							confirmOpen = true;
						}}
					>
						{deleting ? 'Deleting…' : 'Delete account'}
					</Button>
				</div>
			</form>
		</div>
	</Panel>
</div>

<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header class="pr-5">
			<AlertDialog.Title>Delete this account?</AlertDialog.Title>
		</AlertDialog.Header>
		<AlertDialog.Body>
			<AlertDialog.Description>
				This deletes <strong class="text-foreground">{data.account.email}</strong>, its API keys and
				its jobs. This can't be undone.
			</AlertDialog.Description>
		</AlertDialog.Body>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Keep account</AlertDialog.Cancel>
			<Button variant="danger" disabled={deleting} onclick={() => deleteForm?.requestSubmit()}
				>Delete account</Button
			>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
