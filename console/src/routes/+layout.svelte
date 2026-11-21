<script lang="ts">
	import '../app.css';
	import '../tailwind.css';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import AppPerformance from '#lib/components/AppPerformance.svelte';
	import { createCollector, documentLifetime } from '#lib/app-metrics-client';
	import { METRICS_ORIGIN } from '#lib/app-metrics-contract';
	const collector =
		browser &&
		__METRICS_PRODUCTION__ &&
		import.meta.env.PUBLIC_APP_METRICS_ENABLED === 'true' &&
		window.origin === METRICS_ORIGIN &&
		typeof performance?.now === 'function'
			? createCollector({
					enabled: true,
					origin: window.origin,
					fetch: window.fetch.bind(window),
					now: () => performance.now(),
					visible: () => document.visibilityState === 'visible',
					lifetime: documentLifetime
				})
			: null;
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The public pages, and the not-found page for a path no route answers (+error.svelte).
	const publicPage = $derived(
		(page.route.id?.startsWith('/(site)') ?? false) || (page.status === 404 && !page.route.id)
	);
</script>

{#if collector}<AppPerformance {collector} />{/if}

<!-- The signed-in app and the auth routes stay out of search results. The public pages state
     their own title, description and indexing (SitePage.svelte, +error.svelte). -->
<svelte:head>
	{#if !publicPage}
		<title>AudioKit console</title>
		<meta
			name="description"
			content="The AudioKit customer console: usage, API keys, plan and settings."
		/>
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

{@render children()}
