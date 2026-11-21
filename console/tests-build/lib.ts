import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const build = fileURLToPath(new URL('../build/', import.meta.url));
export const repo = fileURLToPath(new URL('../../', import.meta.url));

if (!existsSync(join(build, 'index.html'))) {
	throw new Error('build/ is missing: run `npm run build` first (or `npm run test:build`)');
}

export function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

/** The built prerendered HTML pages, relative to build/. */
export const htmlFiles = walk(build)
	.map((f) => relative(build, f))
	.filter((f) => f.endsWith('.html'))
	.sort();

export const readBuilt = (rel: string) => readFileSync(join(build, rel), 'utf8');

/** The file in build/ that answers a URL path on Netlify, as the static site's build named it. */
export function fileFor(path: string): string {
	if (path.endsWith('/')) return `${path.slice(1)}index.html`;
	return path.slice(1);
}
