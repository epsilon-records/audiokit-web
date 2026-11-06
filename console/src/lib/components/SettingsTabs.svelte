<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/settings', label: 'Profile' },
		{ href: '/settings/billing', label: 'Billing' }
	];

	const path = $derived(page.url.pathname);
</script>

<nav class="tabs" aria-label="Settings">
	{#each tabs as tab (tab.href)}
		<a class="tab" href={tab.href} aria-current={path === tab.href ? 'page' : undefined}>
			{tab.label}
		</a>
	{/each}
</nav>
