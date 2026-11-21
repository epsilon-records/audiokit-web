<script lang="ts">
	import SitePage from '#lib/components/SitePage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<SitePage page={data.page} />
