import TurndownService from 'turndown';
import { tables } from 'turndown-plugin-gfm';
import { siteConfig } from '#lib/site/config';
import { renderSitePage } from './render';

export const docsMarkdown = {
	index: '/docs/',
	reference: '/docs/reference/',
	sdks: '/docs/sdks/',
	mcp: '/docs/mcp/'
} as const;

export async function renderDocsMarkdown(document: keyof typeof docsMarkdown): Promise<string> {
	const page = await renderSitePage(docsMarkdown[document]);
	const convert = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
	convert.remove(['button', 'script', 'style']);
	convert.use(tables);
	convert.addRule('preformattedExamples', {
		filter: 'pre',
		replacement: (_content, node) => {
			const code = (node.textContent ?? '').trimEnd();
			const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((match) => match[0].length));
			const fence = '`'.repeat(longest + 1);
			return `\n\n${fence}\n${code}\n${fence}\n\n`;
		}
	});
	convert.addRule('tableCell', {
		filter: ['th', 'td'],
		replacement: (content, node) => {
			const prefix = node.parentElement?.firstElementChild === node ? '| ' : ' ';
			return (
				prefix +
				content
					.trim()
					.replace(/\s*\n\s*/g, ' ')
					.replaceAll('|', '\\|') +
				' |'
			);
		}
	});
	convert.addRule('canonicalLinks', {
		filter: (node) => node.nodeName === 'A' && Boolean(node.getAttribute('href')),
		replacement: (content, node) => {
			const target = new URL(node.getAttribute('href')!, siteConfig.siteUrl + page.path);
			return `[${content}](${target.href})`;
		}
	});
	return convert.turndown(page.body) + '\n';
}
