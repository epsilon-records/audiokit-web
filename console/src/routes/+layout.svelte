<script lang="ts">
	import '../app.css';
	import { browser } from '$app/env';
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
</script>

{#if collector}<AppPerformance {collector} />{/if}

<svelte:head>
	<title>AudioKit console</title>
	<meta
		name="description"
		content="The AudioKit customer console: usage, API keys, plan and settings."
	/>
	<meta name="robots" content="noindex" />
</svelte:head>

{@render children()}
