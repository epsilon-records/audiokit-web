<script lang="ts">
	// The public, prerendered pages (EPSILON-169): marketing header and footer around each page.
	// The pages come from the static site (src/lib/site/pages/, rendered by
	// src/lib/server/site/render.ts); the signed-in app is in (app).
	//
	// data-sveltekit-reload: every link from a public page is a full page load, as on the static
	// site. So the public pages' scripts (analytics, error monitoring, first touch; added to the
	// prerendered HTML by hooks.server.ts) never follow a visitor into the signed-in app (shared
	// 0011, 0016), and each public page is counted as its own page view.
	import '../../site.css';
	import { page } from '$app/state';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import type { NavId } from '#lib/components/SiteHeader.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const current = $derived(page.data.page?.meta?.nav as NavId | undefined);
</script>

<div class="site-root" data-sveltekit-reload>
	<a class="skip" href="#main">Skip to content</a>

	<SiteHeader {current} />

	<main id="main" class="site" tabindex="-1">
		{@render children()}
	</main>

	<SiteFooter apiVersion={data.apiVersion} />
</div>

<style>
	.site-root {
		display: contents;
	}
</style>
