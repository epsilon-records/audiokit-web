<script lang="ts">
	// Hidden fields that carry the first-touch signup source (decision 0040) to the magic-link
	// request. See `#lib/signup-source`.
	import { signupSourceEntries, type SignupSource } from '#lib/signup-source';

	let { source }: { source: SignupSource | null | undefined } = $props();
</script>

{#each signupSourceEntries(source ?? undefined) as [name, value] (name)}
	<input type="hidden" {name} {value} />
{/each}
