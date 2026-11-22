import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// EPSILON-169 PR 1: text pairs reach 4.9:1 and control borders 3:1 on every ground, in both
// themes; code panels keep the dark values; nothing is loaded from Google Fonts.

const css = readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../src/app.html', import.meta.url), 'utf8');

function block(selector: string): Record<string, string> {
	const start = css.indexOf(`${selector} {`);
	expect(start, selector).toBeGreaterThanOrEqual(0);
	const body = css.slice(start, css.indexOf('}', start));
	return Object.fromEntries(
		[...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]])
	);
}

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const dark = block(':root');
const light = block(":root[data-theme='light']");
const grounds = ['bg', 'bg-band', 'panel', 'panel-deep'];
const texts = ['text', 'text-soft', 'muted', 'faint', 'accent', 'ok', 'warn'];

describe.each([
	['dark', dark],
	['light', light]
])('%s theme', (_, theme) => {
	it.each(texts)('--%s reads at 4.9:1 or more on every ground', (name) => {
		for (const ground of grounds)
			expect(contrast(theme[name], theme[ground]), `${name} on ${ground}`).toBeGreaterThanOrEqual(
				4.9
			);
	});

	it('--line-control reaches 3:1 on every ground', () => {
		for (const ground of grounds)
			expect(contrast(theme['line-control'], theme[ground]), ground).toBeGreaterThanOrEqual(3);
	});

	it('text on the accent fill reads at 4.9:1 or more', () => {
		expect(contrast(theme['accent-ink'], theme.accent)).toBeGreaterThanOrEqual(4.9);
		expect(contrast(theme['accent-ink'], theme['accent-hover'])).toBeGreaterThanOrEqual(4.9);
	});
});

it('the light theme under the media query matches the explicit one', () => {
	const media = css.slice(css.indexOf('@media (prefers-color-scheme: light)'));
	const mediaBlock = media.slice(0, media.indexOf('}\n}') + 1);
	const values = Object.fromEntries(
		[...mediaBlock.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]])
	);
	expect(values).toEqual(light);
});

it('code panels restate the dark values (dark in both themes)', () => {
	const island = block('.dark-island');
	for (const [name, value] of Object.entries(island)) expect(dark[name], name).toBe(value);
	expect(Object.keys(island)).toEqual(expect.arrayContaining(['panel', 'text', 'code', 'line']));
	expect(css).toMatch(/\.panel:has\(\.code\),\s*pre,\s*\.code,\s*\.dark-island \{/);
});

it('controls draw their border in --line-control', () => {
	// EPSILON-169 PR 3: the controls are components now. Tailwind's `input` and `border-strong`
	// colours are --line-control (tailwind.css), and every control's border uses one of them.
	const tailwind = readFileSync(new URL('../src/tailwind.css', import.meta.url), 'utf8');
	expect(tailwind).toMatch(/--color-input: var\(--line-control\);/);
	expect(tailwind).toMatch(/--color-border-strong: var\(--line-control\);/);
	const controls = {
		'ui/input/input.svelte': 'border-input',
		'ui/textarea/textarea.svelte': 'border-input',
		'ui/native-select/native-select.svelte': 'border-input',
		'ui/checkbox/checkbox.svelte': 'border-input',
		'ui/switch/switch.svelte': 'border-input',
		'ui/button/button.svelte': 'border-border-strong',
		'console/CopyButton.svelte': 'border-input',
		'console/TopBar.svelte': 'border-input'
	};
	for (const [file, token] of Object.entries(controls)) {
		const source = readFileSync(new URL(`../src/lib/components/${file}`, import.meta.url), 'utf8');
		expect(source, file).toContain(token);
	}
});

it('fonts are self-hosted', () => {
	expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
	expect(html).toContain('fonts.css');
	const fonts = readFileSync(new URL('../static/fonts.css', import.meta.url), 'utf8');
	expect(fonts).not.toMatch(/https?:/);
	expect(fonts).toContain("font-family: 'Space Grotesk'");
	expect(fonts).toContain("font-family: 'JetBrains Mono'");
	expect(fonts.match(/font-display: swap/g)).toHaveLength(12);
});

it('the theme script runs from <head> before the stylesheet and body', () => {
	const head = html.slice(0, html.indexOf('</head>'));
	expect(head).toContain('theme-init.js');
	expect(head.indexOf('theme-init.js')).toBeLessThan(head.indexOf('fonts.css'));
	expect(html).not.toMatch(/<script>(?!<\/script>)/);
});

describe('dark islands', () => {
	// An alias such as --surface: var(--panel) resolves on the element that declares it, so an
	// island that only restates --panel would still inherit the light --surface.
	it.each(['surface', 'surface-2', 'soft', 'on-accent'])('restate --%s', (name) => {
		const start = css.indexOf('.dark-island {');
		const body = css.slice(start, css.indexOf('}', start));
		expect(body).toMatch(new RegExp(`--${name}:\\s*var\\(`));
	});
});
