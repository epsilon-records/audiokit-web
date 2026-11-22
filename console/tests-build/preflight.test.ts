import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { build, htmlFiles, readBuilt, walk } from './lib';

// EPSILON-169 PR 3: Tailwind's Preflight (console.css) is for the signed-in app and the sign-in
// screens only. The public pages keep the static site's stylesheet on browser defaults, so no
// prerendered page may load it.

const PREFLIGHT_MARKER = ':-moz-focusring';

describe('Preflight stays off the public pages', () => {
	it('the console stylesheet carries Preflight, so the marker is a real check', () => {
		const assets = walk(join(build, '_app/immutable/assets')).filter((f) => f.endsWith('.css'));
		expect(assets.some((f) => readFileSync(f, 'utf8').includes(PREFLIGHT_MARKER))).toBe(true);
	});

	for (const file of htmlFiles) {
		it(file, () => {
			const html = readBuilt(file);
			const sheets = [...html.matchAll(/href="(?:\.\.?\/)*(_app\/[^"]+\.css)"/g)].map((m) => m[1]);
			expect(sheets.length, file).toBeGreaterThan(0);
			for (const sheet of sheets) {
				expect(readBuilt(sheet), `${file} → ${sheet}`).not.toContain(PREFLIGHT_MARKER);
			}
		});
	}
});
