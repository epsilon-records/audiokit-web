/**
 * Class strings the console's pages share, so a look is written once (EPSILON-169 PR 3). They
 * replace the old hand-written `.link`, `.muted`, ... rules in app.css. Tailwind scans this file.
 */

/** A text link inside a sentence: the accent colour, underlined at rest. */
export const link =
	'text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent hover:decoration-accent';

/** A link on its own (beside buttons, under a section): the same look, with a 44 px target. */
export const linkTarget = `${link} inline-flex min-h-11 items-center`;

/** A row of controls that wraps on narrow screens. */
export const actions = 'flex flex-wrap items-center gap-3';

/** Secondary text. */
export const muted = 'text-[15px] text-muted';

/** Small print: hints, captions, footnotes. */
export const faint = 'text-[13px] text-faint';

/** A labelled section inside a page: heading, text, then content. */
export const section = 'flex flex-col gap-3';

/** The section's heading. */
export const sectionTitle = 'text-[19px] font-bold tracking-[-0.01em]';

/** Columns of stacked content (forms, panels in a page). */
export const stack = 'flex flex-col gap-6';

/** A form's fields, one under the other. */
export const formStack = 'flex flex-col gap-[18px]';
