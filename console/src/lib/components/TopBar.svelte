<script lang="ts">
	import type { Account } from '#lib/types';

	type Props = {
		account: Account;
		drawerOpen: boolean;
		onToggleDrawer: () => void;
	};

	let { account, drawerOpen, onToggleDrawer }: Props = $props();

	const planLabels = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' } as const;
	const planLabel = $derived(planLabels[account.plan] ?? account.plan);
</script>

<header class="console-top">
	<div class="console-top-inner">
		<div class="actions">
			<button
				type="button"
				class="menu-btn"
				aria-expanded={drawerOpen}
				aria-controls="console-nav"
				onclick={onToggleDrawer}
			>
				<span aria-hidden="true">☰</span>
				<span class="sr-only">Menu</span>
			</button>
			<a class="brand" href="/dashboard">
				<span class="brand-mark" aria-hidden="true">✦</span>
				AudioKit
			</a>
		</div>

		<div class="top-actions">
			<span class="plan-badge" class:plan-badge-warn={account.pastDue}>{planLabel} plan</span>
			<a href="https://audiokit.ai/docs/">Docs ↗</a>
			<details class="menu">
				<summary>
					<span class="menu-email">{account.email}</span>
					<span class="sr-only">Account menu</span>
				</summary>
				<div class="menu-panel">
					<p class="menu-meta">
						Signed in as <strong>{account.email}</strong>
					</p>
					<a href="/settings">Profile and account</a>
					<a href="/settings/billing">Billing</a>
					<form method="POST" action="/logout">
						<button type="submit">Sign out</button>
					</form>
				</div>
			</details>
		</div>
	</div>
</header>
