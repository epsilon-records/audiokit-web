<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect } from 'storybook/test';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';

	// System / Light / Dark (D3a). The pick sets data-theme on <html>, as static/theme-init.js does
	// before first paint.
	const { Story } = defineMeta({
		title: 'Site/ThemeToggle',
		component: ThemeToggle,
		tags: ['autodocs']
	});

	const root = () => document.documentElement;
</script>

<Story name="Default" />

<Story
	name="Picking a theme"
	play={async ({ canvas, userEvent, globals }) => {
		const before = root().dataset.theme;
		const light = canvas.getByRole('button', { name: 'Light' });
		const dark = canvas.getByRole('button', { name: 'Dark' });
		const system = canvas.getByRole('button', { name: 'System' });

		await userEvent.click(light);
		await expect(light).toHaveAttribute('aria-pressed', 'true');
		await expect(root().dataset.theme).toBe('light');
		await expect(localStorage.getItem('ak-theme')).toBe('light');

		await userEvent.click(dark);
		await expect(dark).toHaveAttribute('aria-pressed', 'true');
		await expect(light).toHaveAttribute('aria-pressed', 'false');
		await expect(root().dataset.theme).toBe('dark');

		await userEvent.click(system);
		await expect(system).toHaveAttribute('aria-pressed', 'true');
		await expect(localStorage.getItem('ak-theme')).toBeNull();

		// Leave the page in the theme this run checks.
		root().dataset.theme = globals.theme === 'light' ? 'light' : (before ?? 'dark');
	}}
/>
