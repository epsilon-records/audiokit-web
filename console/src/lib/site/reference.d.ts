// Types for reference.js, a verbatim copy of the static site's scripts/reference.mjs
// (EPSILON-169 PR 2). The JavaScript is left as it is, so tsconfig.json leaves it unchecked.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Operation = any;
export function md(text: string): string;
export function operationModel(doc: any): Operation[];
export function renderOperationList(doc: any, ops: Operation[]): string;
export function webhookTestVector(doc: any): string;
export function renderReference(
	doc: any,
	ops: Operation[],
	config: { apiBaseUrl: string; apiBaseUrlIsPlaceholder: boolean }
): string;
