<script lang="ts">
	import { page } from '$app/state';

	type Props = { apiVersion: string };

	let { apiVersion }: Props = $props();

	const items = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/usage', label: 'Usage' },
		{ href: '/api-keys', label: 'API keys' },
		{ href: '/pricing', label: 'Plan' },
		{ href: '/settings', label: 'Settings' }
	];

	const path = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		return href === '/settings' ? path.startsWith('/settings') : path === href;
	}
</script>

<nav aria-label="Console">
	<ul class="side-links">
		{#each items as item (item.href)}
			<li>
				<a
					class="side-link"
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<div class="side-out">
	<a href="https://audiokit.ai/docs/">Docs ↗</a>
	<a href="https://audiokit.ai/">Marketing site ↗</a>
	<span class="side-caption">API v{apiVersion}</span>
</div>
