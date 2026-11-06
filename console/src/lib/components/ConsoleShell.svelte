<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import Alert from './Alert.svelte';
	import SideNav from './SideNav.svelte';
	import TopBar from './TopBar.svelte';
	import type { Account, UsageSummary } from '#lib/types';

	type Props = {
		account: Account;
		usage: UsageSummary;
		apiVersion: string;
		children: Snippet;
	};

	let { account, usage, apiVersion, children }: Props = $props();

	let drawerOpen = $state(false);
	afterNavigate(() => {
		drawerOpen = false;
	});

	const usedShare = $derived(usage.jobLimit > 0 ? (usage.jobsUsed / usage.jobLimit) * 100 : 0);
	const atLimit = $derived(usage.jobsUsed >= usage.jobLimit);
	const nearLimit = $derived(usedShare >= 80);
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

		{#if nearLimit}
			<Alert tone={atLimit ? 'warn' : 'info'} role={atLimit ? 'alert' : 'status'}>
				<span>
					<strong>{atLimit ? 'Quota reached.' : 'Running low.'}</strong>
					You've used {usage.jobsUsed} of your {usage.jobLimit} jobs this period.
				</span>
				<div class="actions">
					<a class="btn btn-primary btn-sm" href="/pricing">Upgrade to Pro</a>
				</div>
			</Alert>
		{/if}

		{@render children()}
	</main>
</div>
