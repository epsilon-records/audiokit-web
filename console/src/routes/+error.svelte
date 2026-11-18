<script lang="ts">
	// A path no route answers gets the public site's not-found page, with its header and footer
	// (EPSILON-169 PR 2; the copy is src/lib/site/pages/404.html's, and the prerendered
	// build/404.html is the same page). An error inside a route keeps the console's page.
	import '../site.css';
	import { page } from '$app/state';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';

	const notFound = $derived(page.status === 404 && !page.route.id);
</script>

<svelte:head>
	{#if notFound}
		<title>Page not found · AudioKit</title>
		<meta name="robots" content="noindex" />
	{:else}
		<title>{page.status} · AudioKit console</title>
	{/if}
</svelte:head>

{#if notFound}
	<div class="site-root" data-sveltekit-reload>
		<a class="skip" href="#main">Skip to content</a>
		<SiteHeader />
		<main id="main" class="site" tabindex="-1">
			<div class="wrap status-page">
				<p class="kicker">404 not_found</p>
				<h1>There's no page at this address.</h1>
				<p class="lede">Check the link, or start from one of these.</p>
				<div class="actions">
					<a class="btn btn-primary" href="/docs/">Get started</a>
					<a class="btn btn-ghost" href="/docs/reference/">API reference</a>
					<a class="btn btn-ghost" href="/">Home</a>
				</div>
			</div>
		</main>
		<SiteFooter apiVersion={__API_VERSION__} />
	</div>
{:else}
	<main class="error-page">
		<p class="kicker">{page.status}</p>
		<h1>{page.error?.message ?? 'Something went wrong'}</h1>
		<p>Try again, or head back to the <a class="link" href="/dashboard">dashboard</a>.</p>
	</main>
{/if}

<style>
	.site-root {
		display: contents;
	}
</style>
