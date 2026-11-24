<script lang="ts">
	// The public pages' footer (EPSILON-169, PR 1): the static site's footer links, plus the theme
	// toggle (D3a).
	import ThemeToggle from './ThemeToggle.svelte';

	type Props = { apiVersion: string };

	let { apiVersion }: Props = $props();

	const links = [
		{ href: '/docs/', label: 'Get started' },
		{ href: '/docs/reference/', label: 'API reference' },
		{ href: '/docs/mcp/', label: 'MCP' },
		{ href: '/pricing/', label: 'Pricing' },
		{ href: '/privacy/', label: 'Privacy' },
		{ href: '/terms/', label: 'Terms' },
		{ href: '/docs/openapi.yaml', label: 'openapi.yaml' }
	];
</script>

<footer class="site-footer">
	<div class="site-footer-inner">
		<span>© 2026 AudioKit · API v{apiVersion}</span>
		<nav aria-label="Footer">
			{#each links as link (link.href)}
				<a href={link.href}>{link.label}</a>
			{/each}
		</nav>
		<ThemeToggle />
	</div>
</footer>

<style>
	.site-footer {
		border-top: 1px solid var(--line);
	}
	.site-footer-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px 32px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px 32px;
		color: var(--faint);
		font-size: 14px;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0 24px;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	@media (max-width: 759.98px) {
		.site-footer-inner {
			padding: 20px 16px;
		}
	}
</style>
