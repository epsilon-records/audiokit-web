<script lang="ts">
	// The signed-in app's base styles (Preflight); the public pages never load them.
	import '../../../console.css';
	import { afterNavigate } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import Alert from './Alert.svelte';
	import SideNav from './SideNav.svelte';
	import TopBar from './TopBar.svelte';
	import { linkTarget } from './classes';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import { balanceBanner, outOfCreditsNotice } from '#lib/credits';
	import { formatNumber } from '#lib/format';
	import type { Account, Credits } from '#lib/types';

	type Props = {
		account: Account;
		/** The prepaid balance. null when billing could not report it: no banner is shown then. */
		credits: Credits | null;
		/** The current time, for the renewal date. Defaults to now; stories pin it. */
		now?: Date;
		apiVersion: string;
		children: Snippet;
	};

	let { account, credits, now = new Date(), apiVersion, children }: Props = $props();

	let drawerOpen = $state(false);
	afterNavigate(() => {
		drawerOpen = false;
	});

	// Decision 0052: a job is refused when the balance does not cover its minimum. With billing's
	// low-balance state (0077, epsilon-billing#81) the banner also shows below the threshold.
	const banner = $derived(balanceBanner(credits));
	const bannerAction = 'ml-auto flex items-center max-stack:ml-0';
</script>

<svelte:window
	onkeydown={(event) => {
		// Esc closes the navigation and returns focus to the Menu button (audit F-16).
		if (event.key !== 'Escape' || !drawerOpen) return;
		drawerOpen = false;
		document.getElementById('console-menu-button')?.focus();
	}}
/>

<a class="skip" href="#main">Skip to content</a>

<TopBar {account} {drawerOpen} onToggleDrawer={() => (drawerOpen = !drawerOpen)} />

{#if drawerOpen}
	<button
		type="button"
		class="fixed inset-0 z-[35] hidden bg-black/60 max-nav:block"
		aria-label="Close navigation"
		onclick={() => (drawerOpen = false)}
	></button>
{/if}

<div class="grid min-h-[calc(100vh-57px)] grid-cols-[240px_minmax(0,1fr)] max-nav:grid-cols-1">
	<aside
		id="console-nav"
		class={[
			'flex flex-col gap-6 border-r border-border bg-band px-3 pt-5 pb-6',
			'max-nav:fixed max-nav:inset-y-0 max-nav:left-0 max-nav:z-40 max-nav:w-[min(280px,84vw)] max-nav:overflow-y-auto max-nav:border-line-strong max-nav:transition-transform max-nav:duration-150 motion-reduce:transition-none',
			drawerOpen
				? 'max-nav:visible max-nav:translate-x-0'
				: 'max-nav:invisible max-nav:-translate-x-full'
		]}
		aria-label="Console"
	>
		<SideNav {apiVersion} />
	</aside>

	<main
		id="main"
		class="w-full max-w-[1100px] min-w-0 px-8 pt-7 pb-[72px] focus:outline-none max-nav:px-5 max-nav:pt-6 max-nav:pb-14"
		tabindex="-1"
	>
		{#if account.pastDue}
			<Alert tone="warn" role="alert" class="mb-5">
				<span
					><strong>Payment failed.</strong> Update your card to keep {account.plan} after {account.renewsAt.slice(
						0,
						10
					)}.</span
				>
				<div class={bannerAction}>
					<a class={linkTarget} href="/settings/billing">Open billing</a>
				</div>
			</Alert>
		{/if}

		{#if !account.emailVerified}
			<Alert tone="info" class="mb-5">
				<span>Confirm your email to unlock API keys.</span>
				<div class={bannerAction}>
					<a class={linkTarget} href="/settings">Open settings</a>
				</div>
			</Alert>
		{/if}

		{#if credits !== null && banner === 'empty'}
			<Alert tone="warn" role="alert" class="mb-5">
				<span>
					<strong>Out of credits.</strong>
					Your balance is {formatNumber(credits.balance)} credits. {outOfCreditsNotice(now)}
				</span>
				<div class={bannerAction}><a class={linkTarget} href="/credits">View credits</a></div>
			</Alert>
		{:else if credits !== null && banner === 'low' && credits.lowBalance}
			<Alert tone="warn" class="mb-5">
				<span>
					<strong>Running low on credits.</strong>
					Your balance is {formatNumber(credits.balance)} credits, below {formatNumber(
						credits.lowBalance.threshold
					)}.
				</span>
				<div class={bannerAction}><a class={linkTarget} href="/credits">View credits</a></div>
			</Alert>
		{/if}

		{@render children()}
	</main>
</div>

<Toaster />
