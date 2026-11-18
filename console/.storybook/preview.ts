import type { Preview } from '@storybook/sveltekit';
import '../src/app.css';
import '../src/tailwind.css';

// The theme toolbar sets data-theme on <html>, as static/theme-init.js does in the app.
const preview: Preview = {
	globalTypes: {
		theme: {
			description: 'Theme',
			toolbar: {
				title: 'Theme',
				items: [
					{ value: 'dark', title: 'Dark' },
					{ value: 'light', title: 'Light' }
				],
				dynamicTitle: true
			}
		}
	},
	initialGlobals: {
		theme: 'dark'
	},
	decorators: [
		(story, context) => {
			document.documentElement.dataset.theme = context.globals.theme === 'light' ? 'light' : 'dark';
			document.documentElement.setAttribute('data-js', '');
			return story();
		}
	],
	parameters: {
		layout: 'padded',
		// The page ground comes from the theme's tokens (app.css), not from Storybook.
		backgrounds: { disable: true },
		// Fail the story test on accessibility violations, not just report them.
		a11y: { test: 'error' },
		// Components read the current route through `$app/state`; stories set the page here.
		sveltekit_experimental: {
			state: { page: { url: new URL('http://localhost/dashboard') } }
		}
	}
};

export default preview;
