<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import '../site.css';
	import SitePage, { type RenderedPage } from '#lib/components/SitePage.svelte';

	// A public page as src/lib/server/site/render.ts hands it over (EPSILON-169 PR 2): the body is
	// the static site's own HTML. These bodies are short excerpts of the real pages.
	const docs: RenderedPage = {
		path: '/docs/',
		meta: {
			title: 'Get started',
			description: 'Submit your first AudioKit job.',
			layout: 'docs',
			nav: 'start'
		},
		body: `<section class="doc-intro">
  <p class="kicker">Get started</p>
  <h1>Run your first job</h1>
  <p class="lede">AudioKit works in jobs. You send a link to a file and the operation you want.</p>
</section>
<section>
  <h2 id="before">Before you start</h2>
  <ul class="checklist">
    <li><strong>An API key.</strong> <a href="/signup">Create an AudioKit account</a> or <a href="/login">sign in</a>.</li>
  </ul>
</section>
<section>
  <h2 id="check">Check the service</h2>
  <p>These two endpoints need no key.</p>
  <div class="panel">
    <div class="panel-bar"><span>shell</span><button class="copy" type="button">Copy</button></div>
<pre tabindex="0" class="code">curl https://api.audiokit.ai/v1/health
curl https://api.audiokit.ai/v1/capabilities</pre>
  </div>
</section>`,
		toc: [
			{ level: 2, id: 'before', label: 'Before you start' },
			{ level: 2, id: 'check', label: 'Check the service' }
		],
		apiVersion: '0.1.0',
		structuredData: ''
	};

	const site: RenderedPage = {
		path: '/subscribed/',
		meta: {
			title: "You're subscribed",
			layout: 'site',
			noindex: true,
			mainClass: 'wrap status-page'
		},
		body: `<p class="kicker">Product updates</p>
<h1>You're subscribed</h1>
<p class="lede">Thanks for confirming. Every email has an unsubscribe link.</p>
<div class="actions">
  <a class="btn btn-primary" href="/">Back to AudioKit</a>
  <a class="btn btn-ghost" href="/docs/">Read the quickstart</a>
</div>`,
		toc: [],
		apiVersion: '0.1.0',
		structuredData: ''
	};

	const { Story } = defineMeta({
		title: 'Site/SitePage',
		component: SitePage,
		args: { page: docs },
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Docs page">
	<main class="site"><SitePage page={docs} /></main>
</Story>

<Story name="Site page">
	<main class="site"><SitePage page={site} /></main>
</Story>
