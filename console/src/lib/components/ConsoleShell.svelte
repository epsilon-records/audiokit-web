<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import Alert from './Alert.svelte';
	import SideNav from './SideNav.svelte';
	import TopBar from './TopBar.svelte';
	import { formatNumber } from '#lib/format';
	import type { Account, Credits } from '#lib/types';

	type Props = {
		account: Account;
		/** The prepaid balance. null when billing could not report it: no banner is shown then. */
		credits: Credits | null;
		apiVersion: string;
		children: Snippet;
	};

	let { account, credits, apiVersion, children }: Props = $props();

	let drawerOpen = $state(false);
	afterNavigate(() => {
		drawerOpen = false;
	});

	// Decision 0052: a job is refused when the balance does not cover its minimum, and a long job
	// can take the balance below zero. No "running low" threshold has been decided, so the only
	// state the console warns about is a balance with nothing left.
	const outOfCredits = $derived(credits !== null && credits.balance <= 0);
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') drawerOpen = false;
	}}
/>

<a class="skip" href="#main">Skip to content</a>

<TopBar {account} {drawerOpen} onToggleDrawer={() => (drawerOpen = !drawerOpen)} />

{#if drawerOpen}
	<button
		type="button"
		class="drawer-backdrop"
		aria-label="Close navigation"
		onclick={() => (drawerOpen = false)}
	></button>
{/if}

<div class="console-body">
	<aside id="console-nav" class="console-side" class:open={drawerOpen} aria-label="Console">
		<SideNav {apiVersion} />
	</aside>

	<main id="main" class="console-main" tabindex="-1">
		{#if account.pastDue}
			<Alert tone="warn" role="alert">
				<span
					><strong>Payment failed.</strong> Update your card to keep {account.plan} after {account.renewsAt.slice(
						0,
						10
					)}.</span
				>
				<div class="actions">
					<a class="btn btn-ghost btn-sm" href="/settings/billing">Open billing</a>
				</div>
			</Alert>
		{/if}

		{#if !account.emailVerified}
			<Alert tone="info">
				<span>Confirm your email to unlock API keys.</span>
				<div class="actions">
					<a class="btn btn-ghost btn-sm" href="/settings">Open settings</a>
				</div>
			</Alert>
		{/if}

		{#if credits !== null && outOfCredits}
			<Alert tone="warn" role="alert">
				<span>
					<strong>Out of credits.</strong>
					Your balance is {formatNumber(credits.balance)} credits, so new jobs are refused until the account
					tops up. Free credits renew each calendar month (UTC).
				</span>
				<div class="actions">
					<a class="btn btn-primary btn-sm" href="/pricing">See pricing</a>
				</div>
			</Alert>
		{/if}

		{@render children()}
	</main>
</div>
