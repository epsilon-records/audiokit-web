<script lang="ts">
	// System / Light / Dark (D3a, EPSILON-169). static/theme-init.js applies the pick before first
	// paint; this control changes it afterwards. Storage lives in #lib/theme (AudioKit 0079).
	import { onMount } from 'svelte';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { browserStorage, readStored, resolve, store, type ThemeChoice } from '#lib/theme';

	const labels = { system: 'System', light: 'Light', dark: 'Dark' };
	const nextChoice = { system: 'light', light: 'dark', dark: 'system' } as const;
	const icons = { system: Monitor, light: Sun, dark: Moon };
	let choice = $state<ThemeChoice>('system');
	const next = $derived(nextChoice[choice]);
	const Icon = $derived(icons[choice]);

	onMount(() => {
		// The page's own record comes first: it holds a pick that couldn't be stored, for example
		// when client-side navigation remounts this toggle.
		const recorded = document.documentElement.dataset.themeChoice;
		choice =
			recorded === 'system' || recorded === 'light' || recorded === 'dark'
				? recorded
				: readStored(browserStorage());
	});

	function pick(next: ThemeChoice) {
		choice = next;
		store(browserStorage(), next);
		// The page's own record of the pick, read by theme-init.js when the system theme changes,
		// so a pick that couldn't be stored still holds for this page.
		document.documentElement.dataset.themeChoice = next;
		const light = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
		document.documentElement.dataset.theme = resolve(next, light);
	}
</script>

<button
	type="button"
	aria-label="Theme: {labels[choice]}. Switch to {labels[next]}"
	title="Theme: {labels[choice]}"
	onclick={() => pick(next)}
>
	<Icon size={18} aria-hidden="true" />
</button>

<style>
	button {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
	}
	button:hover {
		color: var(--accent);
	}
	button:focus-visible {
		outline-offset: -4px;
	}
</style>
