<script lang="ts">
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>AudioKit console</title>
	<meta
		name="description"
		content="The AudioKit customer console: usage, API keys, plan and settings."
	/>
	<meta name="robots" content="noindex" />
</svelte:head>

{@render children()}
