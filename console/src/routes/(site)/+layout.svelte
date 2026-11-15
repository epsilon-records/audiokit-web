<script lang="ts">
	// The public, prerendered pages (EPSILON-169): marketing header and footer around each page.
	// The pages themselves move in from the static site in PR 2; the signed-in app is in (app).
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import { apiVersion } from '#lib/fixtures';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<a class="skip" href="#main">Skip to content</a>

<SiteHeader />

<main id="main" tabindex="-1">
	{@render children()}
</main>

<SiteFooter {apiVersion} />
