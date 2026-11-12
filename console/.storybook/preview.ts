import type { Preview } from '@storybook/sveltekit';
import '../src/app.css';

const preview: Preview = {
	initialGlobals: {
		backgrounds: { value: 'console' }
	},
	parameters: {
		layout: 'padded',
		backgrounds: {
			options: {
				console: { name: 'Console', value: '#0c0e11' },
				panel: { name: 'Panel', value: '#14171c' }
			}
		},
		// Components read the current route through `$app/state`; stories set the page here.
		sveltekit_experimental: {
			state: { page: { url: new URL('http://localhost/dashboard') } }
		}
	}
};

export default preview;
