<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · AudioKit console</title>
</svelte:head>

<main class="error-page">
	<p class="kicker">{page.status}</p>
	<h1>{page.error?.message ?? 'Something went wrong'}</h1>
	<p>Try again, or head back to the <a class="link" href="/dashboard">dashboard</a>.</p>
</main>
