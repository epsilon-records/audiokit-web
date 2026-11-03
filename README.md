# audiokit-web

The AudioKit website: the landing page, the getting-started guide, the API reference and the MCP page. The API itself lives in [`epsilon-records/audiokit`](https://github.com/epsilon-records/audiokit).

Plain HTML and one stylesheet, plus a small Node build that wraps every page in one layout and generates the API reference from the API's OpenAPI contract.

## Layout

```
src/pages/
  index.html          landing page
  docs/index.html     get started (hand-written guide)
  docs/mcp.html       MCP page (→ /docs/mcp/)
  thanks.html         shown after the early-access form (→ /thanks/)
  404.html
src/static/           copied as is: styles.css (design tokens at the top), site.js, favicon.svg
scripts/build.mjs     layout, {{TOKENS}}, link check; writes dist/
scripts/reference.mjs renders /docs/reference/ and the landing page's operation list from the contract
scripts/pull-contract.mjs  refreshes contract/openapi.yaml
contract/openapi.yaml the API contract the build falls back to; contract/SOURCE says where it came from
site.config.mjs       the API base URL (one place)
netlify.toml          build command, publish directory and headers
```

Each page starts with a `<!-- {json} -->` line: `title`, `description`, `layout` (`site` or `docs`), `nav` (which menu item is current), and optionally `noindex` and `mainClass`. Docs pages get an "On this page" list from their `<h2 id>` headings (and `<h3 id data-toc>`).

Tokens available in pages: `{{API_BASE}}`, `{{API_VERSION}}`, `{{OPERATION_LIST}}`, `{{OPERATION_COUNT}}`, `{{WEBHOOK_TEST_VECTOR}}`, `{{BASE_URL_NOTE}}`.

## Develop

```bash
npm ci
npm run dev        # builds, then serves dist/ on http://localhost:8000
```

The build fails on any broken internal link or `#anchor`.

## Keeping the docs right

The API reference and the landing page's list of operations are generated from the contract, so they follow it. The build reads the contract from, in order:

1. `$AUDIOKIT_OPENAPI_URL`, if set;
2. `<apiBaseUrl>/v1/openapi.yaml`, once `site.config.mjs` has a real base URL;
3. `contract/openapi.yaml` in this repo.

The API repo is private, so Netlify can't read it directly. Until the API is hosted, refresh the copy when the contract changes and commit it:

```bash
npm run contract:pull -- ../audiokit                         # from a local clone
npm run contract:pull -- https://<api host>/v1/openapi.yaml  # or from a running API
```

The getting-started guide (`src/pages/docs/index.html`) is hand-written. When the API changes, check it in the same week, and check the webhook examples still pass the test vector. Only describe an operation as available once it is in the contract.

## Base URL

`site.config.mjs` holds the API's base URL (`https://api-production-cd43.up.railway.app`). Every example on the site uses it, and the build reads the hosted contract from `<base URL>/v1/openapi.yaml`, falling back to `contract/openapi.yaml` if that fetch fails.

## Early-access form

The form on the landing page is a Netlify Form named `access` (fields `email` and optional `use`). Submissions appear under the site's **Forms** tab in Netlify once form detection is enabled there (Forms › Enable form detection, then redeploy). A honeypot field filters simple bots; Netlify's spam filter handles the rest.

## Deploy

Netlify site `audiokit` (https://audiokit.netlify.app), linked to this repo: every push to `main` deploys production, and pull requests get deploy previews.
