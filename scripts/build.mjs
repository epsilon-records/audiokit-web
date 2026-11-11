// Builds the site into dist/.
//
// - Pages in src/pages/ are wrapped in one shared layout (head, header, docs sidebar, footer).
// - The API reference (/docs/reference/) and the landing page's operation list are generated
//   from the OpenAPI contract, so they say what the API ships.
// - {{TOKENS}} in pages are replaced with values from site.config.mjs and the contract.
//
// Contract source, first that works:
//   1. $AUDIOKIT_OPENAPI_URL
//   2. `${apiBaseUrl}/v1/openapi.yaml`, once apiBaseUrl in site.config.mjs is no longer a placeholder
//   3. contract/openapi.yaml (refresh with `npm run contract:pull`)

import { readFile, writeFile, mkdir, rm, readdir, cp, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import config from "../site.config.mjs";
import { renderReference, renderOperationList, operationModel, webhookTestVector } from "./reference.mjs";
import { assertNoGaps, findGaps, isRelease } from "./release-gaps.mjs";
import { applyKitBlocks, normalizeKitFormId, productUpdatesForm } from "./kit-form.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const out = join(root, "dist");

// ---------------------------------------------------------------------------------------------
// Contract

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function loadContract() {
  const candidates = [];
  if (process.env.AUDIOKIT_OPENAPI_URL) candidates.push(process.env.AUDIOKIT_OPENAPI_URL);
  if (!config.apiBaseUrlIsPlaceholder) candidates.push(`${config.apiBaseUrl}/v1/openapi.yaml`);
  for (const url of candidates) {
    try {
      const text = await fetchText(url);
      const doc = YAML.parse(text);
      if (!doc?.openapi || !doc?.paths) throw new Error("not an OpenAPI document");
      console.log(`contract: ${url} (version ${doc.info?.version})`);
      return { doc, text, source: url };
    } catch (err) {
      console.warn(`contract: could not use ${url}: ${err.message}; trying the next source`);
    }
  }
  const file = join(root, "contract", "openapi.yaml");
  const text = await readFile(file, "utf8");
  const doc = YAML.parse(text);
  console.log(`contract: contract/openapi.yaml (version ${doc.info?.version})`);
  return { doc, text, source: "contract/openapi.yaml" };
}

// ---------------------------------------------------------------------------------------------
// Layout

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const NAV = [
  { id: "start", href: "/docs/", label: "Get started" },
  { id: "reference", href: "/docs/reference/", label: "API reference" },
  { id: "sdks", href: "/docs/sdks/", label: "Client SDKs" },
  { id: "mcp", href: "/docs/mcp/", label: "MCP" },
  { id: "pricing", href: "/pricing/", label: "Pricing" },
];

// The console is a separate app on its own Netlify site (decisions 0016/0021), so every link to
// it is absolute. Its address is in one place: site.config.mjs.
const CONSOLE_LOGIN = `${config.consoleUrl}/login`;
const CONSOLE_SIGNUP = `${config.consoleUrl}/signup`;

const LOGO = `<svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 14v0M9 9v10M14 4v20M19 9v10M24 12v4"/></svg>`;

function header(meta) {
  const links = NAV.map(
    (n) => `<a href="${n.href}"${meta.nav === n.id ? ' aria-current="page"' : ""}>${n.label}</a>`,
  ).join("");
  return `<header class="site-header">
  <nav class="${meta.layout === "docs" ? "wrap-wide" : "wrap"} nav" aria-label="Main">
    <a class="brand" href="/"><span class="brand-mark">${LOGO}</span>AudioKit</a>
    <div class="nav-links">${links}<a class="btn btn-primary btn-sm" href="${CONSOLE_LOGIN}">Sign in</a></div>
  </nav>
</header>`;
}

function footer(meta, ctx) {
  return `<footer class="site-footer">
  <div class="${meta.layout === "docs" ? "wrap-wide" : "wrap"} footer">
    <span>© 2026 AudioKit · API v${esc(ctx.version)}</span>
    <nav aria-label="Footer">
      <a href="/docs/">Get started</a>
      <a href="/docs/reference/">API reference</a>
      <a href="/docs/mcp/">MCP</a>
      <a href="/pricing/">Pricing</a>
      <a href="/privacy/">Privacy</a>
      <a href="/docs/openapi.yaml">openapi.yaml</a>
    </nav>
  </div>
</footer>`;
}

// "On this page" links, from <h2 id> and <h3 id data-toc> in the page body.
function toc(body) {
  const items = [];
  const re = /<(h2|h3)\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g;
  for (const m of body.matchAll(re)) {
    const [, tag, id, attrs, inner] = m;
    if (tag === "h3" && !/data-toc/.test(attrs)) continue;
    const label = /data-toc="([^"]*)"/.exec(attrs)?.[1] || inner.replace(/<[^>]+>/g, "").trim();
    items.push({ level: tag === "h2" ? 2 : 3, id, label });
  }
  return items;
}

function sidebar(meta, body) {
  const pages = NAV.map(
    (n) => `<a class="side-page" href="${n.href}"${meta.nav === n.id ? ' aria-current="page"' : ""}>${n.label}</a>`,
  ).join("");
  const items = toc(body)
    .map((t) => `<a class="toc-${t.level}" href="#${t.id}">${t.label}</a>`)
    .join("");
  return `<aside class="docs-side">
  <nav aria-label="Docs">
    <div class="side-pages">${pages}</div>
    ${items ? `<details class="toc" open><summary>On this page</summary><div class="toc-links">${items}</div></details>` : ""}
  </nav>
</aside>`;
}

// Browser error monitoring (shared decision 0003). Injected into every page only when a
// DSN is present at build time; the audiokit Netlify site provides SENTRY_DSN for builds.
// The DSN is public, but it still comes from the environment rather than the source.
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN || "";
const SENTRY_BUNDLE_VERSION = "11.11.0";
const KIT_FORM_ID = normalizeKitFormId(config.kitFormId);
const KIT_ENABLED = KIT_FORM_ID !== "";
const KIT_DISCLOSURE = KIT_ENABLED || config.kitDisclosure === true;
const ANALYTICS_ENABLED = /^[a-f0-9]{32}$/i.test(config.cloudflareWebAnalyticsToken || "");

// Sentry.init runs from /sentry-init.js, written by the build, not from an inline script: the
// Content-Security-Policy in netlify.toml allows no inline scripts (EPSILON-118).
function sentryInit() {
  if (!SENTRY_DSN) return "";
  const init = {
    dsn: SENTRY_DSN,
    environment: process.env.CONTEXT || process.env.NODE_ENV || "production",
    tracesSampleRate: 0.1,
  };
  if (process.env.COMMIT_REF) init.release = process.env.COMMIT_REF;
  return `Sentry.init(${JSON.stringify(init)});\n`;
}

function sentryHead() {
  if (!SENTRY_DSN) return "";
  return `<script src="https://browser.sentry-cdn.com/${SENTRY_BUNDLE_VERSION}/bundle.tracing.min.js" crossorigin="anonymous"></script>
<script src="/sentry-init.js"></script>`;
}

// First-touch signup source (AudioKit decisions 0040 and 0041): adds the landing page's referrer
// host, utm_* values and path to that page's console sign-up/sign-in links. Stores nothing.
function firstTouchScript() {
  return `<script src="/first-touch.js" data-console-url="${esc(config.consoleUrl)}" defer></script>\n`;
}

function page(meta, body, ctx, route = "/") {
  const title = meta.title ? `${meta.title} · AudioKit` : "AudioKit";
  const desc = meta.description || "";
  const main =
    meta.layout === "docs"
      ? `<div class="wrap-wide docs">${sidebar(meta, body)}<main id="main" class="docs-main">${body}</main></div>`
      : `<main id="main"${meta.mainClass ? ` class="${meta.mainClass}"` : ""}>${body}</main>`;
  // Canonical links and Open Graph URLs point at production, so deploy previews don't compete.
  const canonical = meta.noindex ? "" : `${ctx.siteUrl}${route}`;
  const head = [
    desc ? `<meta name="description" content="${esc(desc)}">` : "",
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : "",
    '<meta name="color-scheme" content="dark">',
    desc ? `<meta property="og:description" content="${esc(desc)}">` : "",
    `<meta property="og:title" content="${esc(title)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="AudioKit">',
    '<meta property="og:locale" content="en">',
    canonical ? `<meta property="og:url" content="${esc(canonical)}">` : "",
    '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    desc ? `<meta name="twitter:description" content="${esc(desc)}">` : "",
    meta.noindex ? '<meta name="robots" content="noindex">' : "",
  ]
    .filter(Boolean)
    .join("\n");
  // site.js only has work on pages with copy buttons or the docs "On this page" list.
  const needsJs = /class="(copy|toc)"/.test(main);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${head}
<meta name="theme-color" content="#0c0e11">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${sentryHead()}
${!meta.noindex && ANALYTICS_ENABLED ? `<script src="/analytics.js" data-site-token="${esc(config.cloudflareWebAnalyticsToken)}" defer></script>` : ""}
</head>
<body class="layout-${meta.layout || "site"}">
<a class="skip" href="#main">Skip to content</a>
${header(meta)}
${main}
${footer(meta, ctx)}
${needsJs ? `<script src="/site.js" defer></script>\n` : ""}${firstTouchScript()}</body>
</html>
`;
}

// ---------------------------------------------------------------------------------------------
// Pages

function parsePage(text, file) {
  const m = /^<!--\s*(\{[\s\S]*?\})\s*-->\n?/.exec(text);
  if (!m) throw new Error(`${file}: missing <!-- {meta json} --> on the first line`);
  return { meta: JSON.parse(m[1]), body: text.slice(m[0].length) };
}

function fill(text, tokens, file) {
  return applyKitBlocks(text, KIT_DISCLOSURE).replace(/\{\{([A-Z_]+)\}\}/g, (_, name) => {
    if (!(name in tokens)) throw new Error(`${file}: unknown token {{${name}}}`);
    return tokens[name];
  });
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
}

// index.html → index.html, docs/mcp.html → docs/mcp/index.html, 404.html stays 404.html
function outPath(rel) {
  if (rel.endsWith("index.html") || rel === "404.html") return rel;
  return rel.replace(/\.html$/, "/index.html");
}

// Built file → URL path, e.g. docs/mcp/index.html → /docs/mcp/.
function routePath(rel) {
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"index.html".length);
  return "/" + rel;
}

async function write(rel, content) {
  const file = join(out, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

// sitemap.xml and robots.txt for the indexable pages, so search engines can find them.
async function writeSitemap(urls) {
  const abs = (path) => `${config.siteUrl}${path}`;
  const unique = [...new Set(urls)].sort();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique.map((u) => `  <url><loc>${esc(abs(u))}</loc></url>`).join("\n")}
</urlset>
`;
  await write("sitemap.xml", xml);
  await write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${abs("/sitemap.xml")}\n`);
  console.log(`sitemap: ${unique.length} urls; robots.txt written`);
}

// ---------------------------------------------------------------------------------------------
// Link check: every internal href must point at a built file, and every #fragment at an id.

async function checkLinks() {
  const files = (await walk(out)).filter((f) => f.endsWith(".html"));
  const ids = new Map();
  for (const f of files) {
    const html = await readFile(f, "utf8");
    ids.set(f, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  const problems = [];
  for (const f of files) {
    const html = await readFile(f, "utf8");
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const [path, frag] = href.split("#");
      let target = f;
      if (path) {
        target = path.startsWith("/") ? join(out, path) : join(dirname(f), path);
        if (path.endsWith("/")) target = join(target, "index.html");
        const exists = await stat(target).then((s) => s.isFile(), () => false);
        if (!exists) {
          problems.push(`${relative(out, f)}: ${href} (no such file)`);
          continue;
        }
      }
      if (frag && target.endsWith(".html") && !ids.get(target)?.has(frag)) {
        problems.push(`${relative(out, f)}: ${href} (no such id)`);
      }
    }
  }
  if (problems.length) {
    throw new Error(`broken links:\n  ${problems.join("\n  ")}`);
  }
  console.log(`links: ${files.length} pages checked`);
}

// ---------------------------------------------------------------------------------------------

async function main() {
  const contract = await loadContract();
  const { doc } = contract;
  const version = doc.info?.version ?? "?";
  const ctx = { version, siteUrl: config.siteUrl };
  const ops = operationModel(doc);
  const urls = [];

  const tokens = {
    API_BASE: config.apiBaseUrl,
    API_VERSION: esc(version),
    CONSOLE_URL: config.consoleUrl,
    CONSOLE_LOGIN: CONSOLE_LOGIN,
    CONSOLE_SIGNUP: CONSOLE_SIGNUP,
    OPERATION_LIST: renderOperationList(doc, ops),
    OPERATION_COUNT: String(ops.length),
    // The privacy notice (src/pages/privacy.html) states whether the Cloudflare beacon is on.
    ANALYTICS_STATUS: ANALYTICS_ENABLED
      ? "We use Cloudflare Web Analytics on selected public pages of audiokit.ai to measure aggregate page traffic and page performance."
      : "Cloudflare Web Analytics is currently disabled on this public site. When it is switched on, selected public pages of audiokit.ai use it to measure aggregate page traffic and page performance.",
    PRODUCT_UPDATES_FORM: productUpdatesForm(KIT_FORM_ID),
    WEBHOOK_TEST_VECTOR: webhookTestVector(doc),
    BASE_URL_NOTE: config.apiBaseUrlIsPlaceholder
      ? `<p class="note">Examples use <code>${esc(config.apiBaseUrl)}</code>. Replace it with the base URL that comes with your API key.</p>`
      : "",
  };

  await rm(out, { recursive: true, force: true });
  await cp(join(src, "static"), out, { recursive: true });
  if (SENTRY_DSN) await write("sentry-init.js", sentryInit());

  const pagesDir = join(src, "pages");
  const built = new Map();
  for (const file of await walk(pagesDir)) {
    const rel = relative(pagesDir, file);
    const { meta, body } = parsePage(await readFile(file, "utf8"), rel);
    const route = routePath(outPath(rel));
    if (!meta.noindex) urls.push(route);
    const html = page(meta, fill(body, tokens, rel), ctx, route);
    built.set(route, html);
    await write(outPath(rel), html);
  }
  // Facts only Nate can supply are marked TODO(privacy); a production build refuses them.
  const gaps = [...built.values()].reduce((n, html) => n + findGaps(html).length, 0);
  if (gaps) console.warn(`gaps: ${gaps} TODO(privacy) marker(s); a production build will refuse to publish`);
  assertNoGaps(built, isRelease());

  const refRoute = "/docs/reference/";
  urls.push(refRoute);
  const ref = renderReference(doc, ops, config);
  await write(
    "docs/reference/index.html",
    page(
      {
        title: "API reference",
        description: `AudioKit API v${version} reference: endpoints, operations, webhook, errors and schemas, generated from the OpenAPI contract.`,
        layout: "docs",
        nav: "reference",
      },
      ref,
      ctx,
      refRoute,
    ),
  );

  await write("docs/openapi.yaml", contract.text);
  await writeSitemap(urls);
  await checkLinks();
  console.log(`built dist/ from ${contract.source}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
