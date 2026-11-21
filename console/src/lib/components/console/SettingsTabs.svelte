<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/settings', label: 'Profile' },
		{ href: '/settings/billing', label: 'Billing' }
	];

	const path = $derived(page.url.pathname);
</script>

<!-- Links between two pages, so a nav with aria-current rather than the Tabs widget. -->
<nav class="mb-6 flex flex-wrap gap-1 border-b border-border" aria-label="Settings">
	{#each tabs as tab (tab.href)}
		<a
			class="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3.5 text-[15px] text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
			href={tab.href}
			aria-current={path === tab.href ? 'page' : undefined}
		>
			{tab.label}
		</a>
	{/each}
</nav>
