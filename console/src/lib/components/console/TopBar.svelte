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

	const menuItem =
		'flex min-h-11 w-full items-center rounded-[4px] bg-transparent px-3 text-left text-[14px] text-soft hover:bg-band hover:text-foreground';
</script>

<!-- Every item can shrink: at 320 px the email truncates and Docs moves into the drawer, so the
     bar never scrolls sideways. -->
<header class="sticky top-0 z-30 border-b border-border bg-background">
	<div class="flex min-h-14 items-center justify-between gap-4 px-6 max-nav:gap-2 max-nav:px-4">
		<div class="flex shrink-0 items-center gap-3">
			<button
				id="console-menu-button"
				type="button"
				class="hidden size-11 shrink-0 items-center justify-center rounded-control border border-input bg-transparent text-foreground hover:border-accent hover:text-accent max-nav:inline-flex"
				aria-expanded={drawerOpen}
				aria-controls="console-nav"
				onclick={onToggleDrawer}
			>
				<span aria-hidden="true">☰</span>
				<span class="sr-only">Menu</span>
			</button>
			<a
				class="flex min-h-11 shrink-0 items-center gap-2.5 text-[19px] font-bold tracking-[-0.01em] hover:text-foreground"
				href="/dashboard"
			>
				<span class="text-accent" aria-hidden="true">✦</span>
				AudioKit
			</a>
		</div>

		<div class="flex min-w-0 flex-1 items-center justify-end gap-[18px] text-[14px] text-soft">
			<span
				class={[
					'rounded-full border px-2.5 py-[3px] font-mono text-[12px] font-medium whitespace-nowrap max-nav:hidden',
					account.pastDue
						? 'border-warn/40 bg-warn/12 text-warn'
						: 'border-accent/35 bg-accent-soft text-accent'
				]}>{planLabel} plan</span
			>
			<a
				class="inline-flex min-h-11 items-center hover:text-accent max-nav:hidden"
				href="https://audiokit.ai/docs/" data-sveltekit-reload>Docs ↗</a
			>
			<details class="group relative min-w-0">
				<summary
					class="flex min-h-11 min-w-0 cursor-pointer list-none items-center gap-1.5 px-1 text-soft group-open:text-foreground after:text-[11px] after:text-faint after:content-['▾'] [&::-webkit-details-marker]:hidden"
				>
					<span class="min-w-0 max-w-[22ch] truncate">{account.email}</span>
					<span class="sr-only">Account menu</span>
				</summary>
				<div
					class="absolute top-[calc(100%+8px)] right-0 z-40 flex w-max max-w-[calc(100vw-32px)] min-w-[220px] flex-col gap-0.5 rounded-control border border-line-strong bg-surface p-1.5 shadow-[0_18px_40px_-24px_#000]"
				>
					<p
						class="mb-1 border-b border-border px-3 pt-1.5 pb-2 text-[12px] text-faint [overflow-wrap:anywhere]"
					>
						Signed in as <strong>{account.email}</strong>
					</p>
					<a class={menuItem} href="/settings">Profile and account</a>
					<a class={menuItem} href="/settings/billing">Billing</a>
					<form method="POST" action="/logout">
						<button class={menuItem} type="submit">Sign out</button>
					</form>
				</div>
			</details>
		</div>
	</div>
</header>
