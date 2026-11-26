import { describe, expect, it } from 'vitest';
import { htmlFiles, readBuilt } from './lib';

// #123: the "On this page" list is closed in the built HTML. Built open and closed by the page's
// script on small screens, it moved the whole page body after the first paint (a layout shift of
// up to 0.73 on the long pages). site.css shows its links in the wide layout until the script runs.

describe('the "On this page" list is built closed', () => {
	const pages = htmlFiles.filter((file) => readBuilt(file).includes('class="toc'));

	it('the docs pages carry the list, so this is a real check', () => {
		expect(pages.length).toBeGreaterThan(0);
	});

	for (const file of pages) {
		it(file, () => {
			const tags = readBuilt(file).match(/<details\b[^>]*class="toc[^>]*>/g) ?? [];
			expect(tags).toHaveLength(1);
			expect(tags[0]).not.toMatch(/\sopen\b/);
			expect(tags[0]).not.toContain('toc-ready');
		});
	}
});
