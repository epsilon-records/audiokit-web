import Body from './table-body.svelte';
import Caption from './table-caption.svelte';
import Cell from './table-cell.svelte';
import Head from './table-head.svelte';
import Header from './table-header.svelte';
import Row from './table-row.svelte';
import Root from './table.svelte';

/** A cell holding an id, a date or an operation name. */
export const cellMono = 'font-mono text-[14px] whitespace-nowrap';
/** A right-aligned number. */
export const cellNumeric = 'font-mono text-right whitespace-nowrap';

export {
	Root,
	Caption,
	Header,
	Body,
	Row,
	Head,
	Cell,
	//
	Root as Table,
	Caption as TableCaption,
	Header as TableHeader,
	Body as TableBody,
	Row as TableRow,
	Head as TableHead,
	Cell as TableCell
};
