<script lang="ts">
	// The public pages' header (EPSILON-169, PR 1). Under 760 px the links fold behind a Menu
	// disclosure (audit F-16): the button carries aria-expanded, Esc closes it and puts focus back
	// on the button. The fold needs scripts (html[data-js], set by static/theme-init.js), so with
	// JavaScript off the links stay in view and wrap.
	import { afterNavigate } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.js';

	type NavId = 'start' | 'reference' | 'sdks' | 'mcp' | 'pricing';
	type Props = { current?: NavId };

	let { current }: Props = $props();

	const links: { id: NavId; href: string; label: string }[] = [
		{ id: 'start', href: '/docs/', label: 'Get started' },
		{ id: 'reference', href: '/docs/reference/', label: 'API reference' },
		{ id: 'sdks', href: '/docs/sdks/', label: 'Client SDKs' },
		{ id: 'mcp', href: '/docs/mcp/', label: 'MCP' },
		{ id: 'pricing', href: '/pricing/', label: 'Pricing' }
	];

	let open = $state(false);
	let menuButton = $state<HTMLElement | null>(null);

	afterNavigate(() => {
		open = false;
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !open) return;
		open = false;
		menuButton?.focus();
	}
</script>

<svelte:window {onkeydown} />

<header class="site-header">
	<nav class="site-nav" aria-label="Main">
		<a class="site-brand" href="/">
			<span class="site-brand-mark"
				><svg
					width="26"
					height="26"
					viewBox="0 0 28 28"
					aria-hidden="true"
					fill="none"
					stroke="currentColor"
					stroke-width="2.4"
					stroke-linecap="round"><path d="M4 14v0M9 9v10M14 4v20M19 9v10M24 12v4" /></svg
				></span
			>AudioKit
		</a>
		<Button
			bind:ref={menuButton}
			class="site-menu-button"
			aria-expanded={open}
			aria-controls="site-nav-links"
			onclick={() => (open = !open)}>Menu</Button
		>
		<div id="site-nav-links" class="site-nav-links" class:open>
			<ul>
				{#each links as link (link.id)}
					<li>
						<a href={link.href} aria-current={current === link.id ? 'page' : undefined}
							>{link.label}</a
						>
					</li>
				{/each}
			</ul>
			<!-- Into the signed-in app: a full page load, so no public-page script follows along
			     (shared 0011, 0016). -->
			<div class="site-nav-actions">
				<Button href="/login" data-sveltekit-reload>Sign in</Button>
				<Button href="/signup" variant="primary" data-sveltekit-reload>Start free</Button>
			</div>
		</div>
	</nav>
</header>

<style>
	.site-header {
		border-bottom: 1px solid var(--line);
		background: var(--bg);
	}
	.site-nav {
		max-width: 1200px;
		margin: 0 auto;
		padding: 12px 32px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
	}
	.site-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		font-weight: 700;
		font-size: 20px;
		letter-spacing: -0.01em;
	}
	.site-brand:hover {
		color: var(--text);
	}
	.site-brand-mark {
		color: var(--accent);
		display: inline-flex;
	}
	.site-nav-links {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 26px;
		font-size: 15px;
	}
	.site-nav-links ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 26px;
	}
	.site-nav-links ul a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--text-soft);
		border-bottom: 2px solid transparent;
	}
	.site-nav-links ul a:hover {
		color: var(--accent);
	}
	.site-nav-links ul a[aria-current='page'] {
		color: var(--text);
		border-bottom-color: var(--accent);
	}
	.site-nav-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	/* Shown only when the links can fold (below). */
	.site-nav :global(.site-menu-button) {
		display: none;
	}

	/* Between 760 px and about 900 px the links stay inline, tighter, on one row. */
	@media (max-width: 959.98px) {
		.site-nav {
			padding: 12px 16px;
			gap: 12px 16px;
		}
		.site-nav-links,
		.site-nav-links ul {
			column-gap: 16px;
		}
		.site-nav-actions {
			gap: 8px;
		}
	}
	@media (max-width: 879.98px) {
		.site-nav-links,
		.site-nav-links ul {
			column-gap: 12px;
			font-size: 14px;
		}
	}

	@media (max-width: 759.98px) {
		:global(html[data-js]) .site-nav :global(.site-menu-button) {
			display: inline-flex;
		}
		:global(html[data-js]) .site-nav-links {
			display: none;
			flex-basis: 100%;
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
			padding: 4px 0 8px;
		}
		:global(html[data-js]) .site-nav-links.open {
			display: flex;
		}
		:global(html[data-js]) .site-nav-links ul {
			flex-direction: column;
		}
		:global(html[data-js]) .site-nav-links ul a {
			width: 100%;
			border-bottom: 1px solid var(--line);
		}
		:global(html[data-js]) .site-nav-links ul a[aria-current='page'] {
			border-bottom-color: var(--accent);
		}
	}
</style>
