import { setProjectAnnotations } from '@storybook/sveltekit';
import * as a11y from '@storybook/addon-a11y/preview';
import * as preview from './preview';

// The "storybook-light" project runs every story again in the light theme, so axe checks the
// contrast of both themes (EPSILON-169).
const theme = import.meta.env.VITE_STORYBOOK_THEME === 'light' ? 'light' : 'dark';

setProjectAnnotations([a11y, preview, { initialGlobals: { theme } }]);
