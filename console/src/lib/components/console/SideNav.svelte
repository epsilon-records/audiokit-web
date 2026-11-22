<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '../ThemeToggle.svelte';

	type Props = { apiVersion: string };

	let { apiVersion }: Props = $props();

	const items = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/usage', label: 'Usage' },
		{ href: '/api-keys', label: 'API keys' },
		// The plan page's place (EPSILON-169 PR 3): the balance, its lots and the packs.
		{ href: '/credits', label: 'Credits' },
		{ href: '/settings', label: 'Settings' }
	];

	const path = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		return href === '/settings' ? path.startsWith('/settings') : path === href;
	}

	const outLink = 'inline-flex min-h-11 items-center hover:text-accent';
</script>

<nav aria-label="Console">
	<ul class="flex flex-col gap-0.5">
		{#each items as item (item.href)}
			<li>
				<a
					class="flex min-h-11 items-center rounded-r-control border-l-2 border-transparent px-3.5 text-[15px] text-soft hover:bg-surface hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:bg-surface aria-[current=page]:text-foreground"
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<div class="mt-auto flex flex-col gap-1 border-t border-border pt-4 text-[14px] text-faint">
	<a class={outLink} href="https://audiokit.ai/docs/" data-sveltekit-reload>Docs ↗</a>
	<a class={outLink} href="https://audiokit.ai/">Marketing site ↗</a>
	<a class={outLink} href="https://audiokit.ai/privacy/" data-sveltekit-reload>Privacy ↗</a>
	<span class="mt-2 mb-2 font-mono text-[12px]">API v{apiVersion}</span>
	<ThemeToggle />
</div>
