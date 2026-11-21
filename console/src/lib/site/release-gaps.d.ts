// Types for release-gaps.js, a verbatim copy of the static site's scripts/release-gaps.mjs
// (EPSILON-169).
export const GAP: RegExp;
export function findGaps(html: string): string[];
export function isRelease(env?: Record<string, string | undefined>, argv?: string[]): boolean;
export function assertNoGaps(pages: Map<string, string>, release: boolean): void;
