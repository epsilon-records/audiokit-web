import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { readStored, resolve, store, THEME_STORAGE_KEY } from '../src/lib/theme';

// EPSILON-169 (D3a): the pre-paint script and the toggle agree on one key and one rule.

function memoryStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
		removeItem: (k: string) => void data.delete(k),
		data
	};
}

const blocked = {
	getItem: () => {
		throw new Error('blocked');
	},
	setItem: () => {
		throw new Error('blocked');
	},
	removeItem: () => {
		throw new Error('blocked');
	}
};

/** Runs static/theme-init.js against a fake document; returns the attributes it set. */
function runInit({ stored, systemLight }: { stored?: string; systemLight: boolean }) {
	const attributes = new Map<string, string>();
	const listeners: (() => void)[] = [];
	const media = {
		matches: systemLight,
		addEventListener: (_: string, fn: () => void) => listeners.push(fn)
	};
	const storage = memoryStorage(stored === undefined ? {} : { 'ak-theme': stored });
	runInNewContext(readFileSync(new URL('../static/theme-init.js', import.meta.url), 'utf8'), {
		document: { documentElement: { setAttribute: (k: string, v: string) => attributes.set(k, v) } },
		window: { matchMedia: () => media },
		localStorage: storage
	});
	return { attributes, media, listeners, storage };
}

describe('static/theme-init.js', () => {
	it('marks that scripts run', () => {
		expect(runInit({ systemLight: false }).attributes.has('data-js')).toBe(true);
	});

	it('follows the system when nothing is stored', () => {
		expect(runInit({ systemLight: true }).attributes.get('data-theme')).toBe('light');
		expect(runInit({ systemLight: false }).attributes.get('data-theme')).toBe('dark');
	});

	it('uses the stored pick over the system', () => {
		expect(runInit({ stored: 'dark', systemLight: true }).attributes.get('data-theme')).toBe(
			'dark'
		);
		expect(runInit({ stored: 'light', systemLight: false }).attributes.get('data-theme')).toBe(
			'light'
		);
	});

	it('ignores a value it did not write', () => {
		expect(runInit({ stored: 'sepia', systemLight: false }).attributes.get('data-theme')).toBe(
			'dark'
		);
	});

	it('follows a system change live while nothing is stored', () => {
		const run = runInit({ systemLight: false });
		run.media.matches = true;
		run.listeners.forEach((fn) => fn());
		expect(run.attributes.get('data-theme')).toBe('light');
	});

	it('reads the key the toggle writes', () => {
		const script = readFileSync(new URL('../static/theme-init.js', import.meta.url), 'utf8');
		expect(script).toContain(`'${THEME_STORAGE_KEY}'`);
		expect(THEME_STORAGE_KEY).toBe('ak-theme');
	});
});

describe('#lib/theme', () => {
	it('stores a pick and clears it for System', () => {
		const storage = memoryStorage();
		store(storage, 'light');
		expect(storage.data.get('ak-theme')).toBe('light');
		expect(readStored(storage)).toBe('light');
		store(storage, 'system');
		expect(storage.data.has('ak-theme')).toBe(false);
		expect(readStored(storage)).toBe('system');
	});

	it('survives blocked storage', () => {
		expect(() => store(blocked, 'dark')).not.toThrow();
		expect(readStored(blocked)).toBe('system');
		expect(readStored(undefined)).toBe('system');
	});

	it('resolves System from the system preference', () => {
		expect(resolve('system', true)).toBe('light');
		expect(resolve('system', false)).toBe('dark');
		expect(resolve('dark', true)).toBe('dark');
	});
});
