<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SettingsTabs from '#lib/components/SettingsTabs.svelte';
	import { formatDate } from '#lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const profileSaved = $derived(form && 'profileSaved' in form ? form.profileSaved : false);
	const preferencesSaved = $derived(
		form && 'preferencesSaved' in form ? form.preferencesSaved : false
	);
	const profileError = $derived(form && 'profileError' in form ? form.profileError : null);
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

<div class="stack">
	<section class="panel" aria-labelledby="profile-heading">
		<div class="panel-bar">
			<span id="profile-heading">Profile</span>
		</div>
		<form method="POST" action="?/saveProfile" class="panel-body form-stack" use:enhance>
			<div class="form-row">
				<div class="field">
					<label for="name">Name</label>
					<input class="input" id="name" name="name" value={data.account.name} required />
				</div>
				<div class="field">
					<label for="email">Email</label>
					<input class="input" id="email" type="email" value={data.account.email} readonly />
					<p class="field-hint">
						{#if data.account.emailVerified}
							<span class="badge badge-ok"
								><span class="badge-dot" aria-hidden="true"></span>Verified</span
							>
						{:else}
							Not verified — sign-in links still work, but API keys stay locked.
						{/if}
					</p>
				</div>
			</div>
			<p class="field-hint">
				Changing your email is not implemented yet: it requires re-verification through the billing
				service.
			</p>
			{#if profileError}
				<p class="field-error" role="alert">{profileError}</p>
			{/if}
			{#if profileSaved}
				<p class="notice notice-ok" role="status">Profile saved.</p>
			{/if}
			<div class="actions">
				<button type="submit" class="btn btn-primary">Save changes</button>
			</div>
		</form>
	</section>

	<section class="panel" aria-labelledby="password-heading">
		<div class="panel-bar">
			<span id="password-heading">Password</span>
		</div>
		<div class="panel-body">
			<p class="muted">
				You sign in with an email magic link — there is no password to manage. Use
				<strong>Sign out</strong> below to end this session.
			</p>
		</div>
	</section>

	<section class="panel" aria-labelledby="notifications-heading">
		<div class="panel-bar">
			<span id="notifications-heading">Notifications</span>
		</div>
		<form method="POST" action="?/savePreferences" class="panel-body form-stack" use:enhance>
			<label class="checkbox">
				<input type="checkbox" name="quotaWarnings" checked={data.preferences.quotaWarnings} />
				<span>
					<strong>Quota warnings</strong>
					<span class="field-hint">Email at 80% of the limit and again when it is reached.</span>
				</span>
			</label>
			<label class="checkbox">
				<input type="checkbox" name="paymentReceipts" checked={data.preferences.paymentReceipts} />
				<span>
					<strong>Payment receipts</strong>
					<span class="field-hint">Always sent for charges; required for your records.</span>
				</span>
			</label>
			<label class="checkbox">
				<input type="checkbox" name="productUpdates" checked={data.preferences.productUpdates} />
				<span>
					<strong>Product updates</strong>
					<span class="field-hint">Occasional news about new operations and features.</span>
				</span>
			</label>
			{#if preferencesSaved}
				<p class="notice notice-ok" role="status">Preferences saved.</p>
			{/if}
			<div class="actions">
				<button type="submit" class="btn btn-primary">Save preferences</button>
			</div>
		</form>
	</section>

	<section class="panel" aria-labelledby="session-heading">
		<div class="panel-bar">
			<span id="session-heading">Session</span>
		</div>
		<div class="panel-body">
			<p class="muted">
				{data.account.email} · Plan resets {formatDate(data.account.renewsAt)}
			</p>
			<form method="POST" action="/logout" class="actions">
				<button type="submit" class="btn btn-ghost">Sign out</button>
			</form>
		</div>
	</section>

	<section class="panel" aria-labelledby="danger-heading">
		<div class="panel-bar">
			<span id="danger-heading">⚠ Danger zone</span>
		</div>
		<div class="panel-body">
			<p class="muted">
				<strong>Delete account</strong> — revokes all API keys and removes your jobs and usage data. Invoices
				are kept for tax. This can't be undone.
			</p>
			<p class="notice notice-warn">
				Not implemented: deletion needs a recorded retention policy (design open question). This
				button is disabled in the scaffold.
			</p>
			<div class="actions">
				<button type="button" class="btn btn-danger" disabled>Delete account…</button>
			</div>
		</div>
	</section>
</div>
