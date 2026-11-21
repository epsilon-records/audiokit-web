// `$app/env` for the unit tests, which run without SvelteKit's Vite plugin (vitest.config.ts).
// Nothing under test is being prerendered.
export const browser = false;
export const building = false;
export const dev = false;
export const version = 'test';
