// The OpenAPI contract the public pages are generated from (EPSILON-169 PR 2). Read at build
// time only: the pages that use it are prerendered. Sources, first that works, as the static
// site's scripts/build.mjs had them:
//   1. $AUDIOKIT_OPENAPI_URL
//   2. `${apiBaseUrl}/v1/openapi.yaml`, unless apiBaseUrl is a placeholder
//   3. ../contract/openapi.yaml, the repo's copy (`npm run contract:check` keeps it current)
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { siteConfig } from '#lib/site/config';

export type Contract = {
	// The parsed OpenAPI document; its shape is the contract's, read by reference.js.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	doc: any;
	text: string;
	source: string;
};

/** The repo's copy of the contract. The build runs in console/, which Netlify clones with the repo. */
export const CONTRACT_FILE = resolve(process.cwd(), '..', 'contract', 'openapi.yaml');

async function fetchText(url: string) {
	const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.text();
}

export function contractCandidates(env: Record<string, string | undefined> = process.env) {
	const urls: string[] = [];
	if (env.AUDIOKIT_OPENAPI_URL) urls.push(env.AUDIOKIT_OPENAPI_URL);
	if (!siteConfig.apiBaseUrlIsPlaceholder) urls.push(`${siteConfig.apiBaseUrl}/v1/openapi.yaml`);
	return urls;
}

async function load(): Promise<Contract> {
	for (const url of contractCandidates()) {
		try {
			const text = await fetchText(url);
			const doc = YAML.parse(text);
			if (!doc?.openapi || !doc?.info || !doc?.paths || !doc?.components?.schemas)
				throw new Error('not an OpenAPI document the renderer can read');
			console.log(`contract: ${url} (version ${doc.info?.version})`);
			return { doc, text, source: url };
		} catch (err) {
			console.warn(
				`contract: could not use ${url}: ${(err as Error).message}; trying the next source`
			);
		}
	}
	const text = await readFile(CONTRACT_FILE, 'utf8');
	const doc = YAML.parse(text);
	console.log(`contract: contract/openapi.yaml (version ${doc.info?.version})`);
	return { doc, text, source: 'contract/openapi.yaml' };
}

let cached: Promise<Contract> | undefined;

/** The contract, loaded once per build (or dev server). */
export function loadContract(): Promise<Contract> {
	cached ??= load();
	return cached;
}
