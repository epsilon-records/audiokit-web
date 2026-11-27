<script lang="ts" module>
	import type { RenderedPage } from '#lib/server/site/render';

	export const DOCS_NAV = [
		{ id: 'start', href: '/docs/', label: 'Get started' },
		{ id: 'reference', href: '/docs/reference/', label: 'API reference' },
		{ id: 'sdks', href: '/docs/sdks/', label: 'Client SDKs' },
		{ id: 'mcp', href: '/docs/mcp/', label: 'MCP' },
		{ id: 'pricing', href: '/pricing/', label: 'Pricing' }
	];

	export type { RenderedPage };
</script>

<script lang="ts">
	// One public page (EPSILON-169 PR 2): the head the static site's build wrote, and the page body
	// in the site or docs layout. The body is the static site's own HTML, rendered at build time
	// (src/lib/server/site/render.ts) from files in this repo, never from user input.
	import { siteConfig } from '#lib/site/config';

	type Props = { page: RenderedPage };

	let { page }: Props = $props();

	const title = $derived(page.meta.title ? `${page.meta.title} · AudioKit` : 'AudioKit');
	// Canonical links and Open Graph URLs point at production, so other hosts don't compete.
	const canonical = $derived(page.meta.noindex ? '' : `${siteConfig.siteUrl}${page.path}`);
	const image = `${siteConfig.siteUrl}/og.png`;

	let body = $state<HTMLElement | null>(null);

	// The static site's site.js: Copy on code panels (removed where the clipboard is missing).
	$effect(() => {
		if (!body) return;
		const timers: ReturnType<typeof setTimeout>[] = [];
		const cleanups: (() => void)[] = [];
		body.querySelectorAll<HTMLButtonElement>('.panel .copy').forEach((button) => {
			const code = button.closest('.panel')?.querySelector('pre');
			if (!code || !navigator.clipboard) return button.remove();
			const onclick = async () => {
				await navigator.clipboard.writeText(code.innerText.trimEnd());
				button.textContent = 'Copied';
				timers.push(setTimeout(() => (button.textContent = 'Copy'), 1500));
			};
			button.addEventListener('click', onclick);
			cleanups.push(() => button.removeEventListener('click', onclick));
		});
		return () => {
			timers.forEach(clearTimeout);
			cleanups.forEach((fn) => fn());
		};
	});

	// The "On this page" list: collapsed on small screens, open in the wide layout's side column.
	// The built HTML has it closed and site.css (.toc:not(.toc-ready)) shows the links in the wide
	// layout, so the first paint is already right at either width. Opening or closing it here,
	// after the first paint, moved the whole page body on small screens (#123). Without scripts
	// the small-screen list still opens on a tap.
	let tocOpen = $state(false);
	let tocReady = $state(false);
	$effect(() => {
		tocOpen = !window.matchMedia('(max-width: 900px)').matches;
		tocReady = true;
	});
</script>

<svelte:head>
	<title>{title}</title>
	<link rel="alternate" type="text/plain" href="/llms.txt" />
	{#if page.meta.description}<meta name="description" content={page.meta.description} />{/if}
	{#if canonical}<link rel="canonical" href={canonical} />{/if}
	{#if page.meta.description}<meta property="og:description" content={page.meta.description} />{/if}
	<meta property="og:title" content={title} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="AudioKit" />
	<meta property="og:locale" content="en" />
	{#if canonical}<meta property="og:url" content={canonical} />{/if}
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="AudioKit: audio analysis and processing, one job at a time."
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	{#if page.meta.description}<meta
			name="twitter:description"
			content={page.meta.description}
		/>{/if}
	<meta name="twitter:image" content={image} />
	{#if page.structuredData}{@html page.structuredData}{/if}
	{#if page.meta.noindex}<meta name="robots" content="noindex" />{/if}
</svelte:head>

{#if page.meta.layout === 'docs'}
	<div class="wrap-wide docs">
		<aside class="docs-side">
			<nav aria-label="Docs">
				<div class="side-pages">
					{#each DOCS_NAV as item (item.id)}
						<a
							class="side-page"
							href={item.href}
							aria-current={page.meta.nav === item.id ? 'page' : undefined}>{item.label}</a
						>
					{/each}
				</div>
				{#if page.toc.length}
					<details class="toc" class:toc-ready={tocReady} bind:open={tocOpen}>
						<summary>On this page</summary>
						<div class="toc-links">
							{#each page.toc as item (item.id)}
								<!-- The label is the heading's own HTML text, as on the static site. -->
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								<a class="toc-{item.level}" href="#{item.id}">{@html item.label}</a>
							{/each}
						</div>
					</details>
				{/if}
			</nav>
		</aside>
		<div class="docs-main" bind:this={body}>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html page.body}
		</div>
	</div>
{:else}
	<div class={page.meta.mainClass} bind:this={body}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html page.body}
	</div>
{/if}
