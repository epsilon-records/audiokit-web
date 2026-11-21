<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, waitFor } from 'storybook/test';
	import SiteHeader from '#lib/components/SiteHeader.svelte';

	// The public pages' header. Below 760 px the links fold behind the Menu disclosure; the
	// "Narrow" stories pin Storybook's smallest viewport, in the browser and in the story tests.
	const { Story } = defineMeta({
		title: 'Site/SiteHeader',
		component: SiteHeader,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Default" />

<Story name="Pricing page" args={{ current: 'pricing' }} />

<Story name="Narrow (320 px)" globals={{ viewport: { value: 'mobile1', isRotated: false } }} />

<Story
	name="Narrow, Menu opens and Esc closes it"
	globals={{ viewport: { value: 'mobile1', isRotated: false } }}
	play={async ({ canvas, userEvent }) => {
		const menu = canvas.getByRole('button', { name: 'Menu' });
		await expect(menu).toHaveAttribute('aria-expanded', 'false');
		await expect(canvas.queryByRole('link', { name: 'Pricing' })).toBeNull();

		await userEvent.click(menu);
		await expect(menu).toHaveAttribute('aria-expanded', 'true');
		await expect(canvas.getByRole('link', { name: 'Pricing' })).toBeVisible();

		await userEvent.tab();
		await expect(canvas.getByRole('link', { name: 'Get started' })).toHaveFocus();
		await userEvent.keyboard('{Escape}');
		await expect(menu).toHaveAttribute('aria-expanded', 'false');
		await waitFor(() => expect(menu).toHaveFocus());
		await expect(canvas.queryByRole('link', { name: 'Pricing' })).toBeNull();
	}}
/>
