<script lang="ts">
	import Welcome from '#lib/components/Welcome.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Set up your account · AudioKit console</title></svelte:head>
<Welcome
	email={data.email}
	name={form && 'name' in form ? form.name : data.name}
	company={form && 'company' in form ? form.company : ''}
	apiKey={form && 'apiKey' in form ? form.apiKey : null}
	webhookSecret={form && 'webhookSecret' in form ? form.webhookSecret : null}
	error={form && 'error' in form ? form.error : null}
/>
