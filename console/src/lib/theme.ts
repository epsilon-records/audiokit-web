/**
 * The theme toggle's state (D3a, EPSILON-169): System, Light or Dark. static/theme-init.js
 * applies the same choice before first paint; this module changes it afterwards.
 *
 * The pick is kept in this browser's localStorage as `ak-theme`. That storage is pending
 * knowledge#131 Q7. If the theme must follow the system only, make `readStored` return
 * 'system' and `store` do nothing, and empty `stored()` in static/theme-init.js: the toggle then
 * lasts for the page only (or remove ThemeToggle.svelte). Nothing else reads or writes the key.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ak-theme';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The stored pick, or 'system' when there is none or storage is blocked. */
export function readStored(storage: Storage | undefined): ThemeChoice {
	try {
		const value = storage?.getItem(THEME_STORAGE_KEY);
		return value === 'light' || value === 'dark' ? value : 'system';
	} catch {
		return 'system';
	}
}

/** Keeps the pick. 'system' removes it, so the page follows the system again. */
export function store(storage: Storage | undefined, choice: ThemeChoice): void {
	try {
		if (choice === 'system') storage?.removeItem(THEME_STORAGE_KEY);
		else storage?.setItem(THEME_STORAGE_KEY, choice);
	} catch {
		// Storage blocked: the pick lasts for this page only.
	}
}

/** The theme a choice paints: 'system' resolves to the system's preference. */
export function resolve(choice: ThemeChoice, systemPrefersLight: boolean): 'light' | 'dark' {
	if (choice !== 'system') return choice;
	return systemPrefersLight ? 'light' : 'dark';
}
