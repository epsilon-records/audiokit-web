# audiokit-web

The AudioKit website: the landing page, the getting-started guide, the API reference and the MCP page, plus the signed-in customer console in `console/`. The API itself lives in [`epsilon-records/audiokit`](https://github.com/epsilon-records/audiokit).

Plain HTML and one stylesheet, plus a small Node build that wraps every page in one layout and generates the API reference from the API's OpenAPI contract.

## Layout

```
src/pages/
  index.html          landing page
  docs/index.html     get started (hand-written guide)
  docs/mcp.html       MCP page (→ /docs/mcp/)
  404.html
src/static/           copied as is: styles.css (design tokens at the top), site.js, favicon.svg
scripts/build.mjs     layout, {{TOKENS}}, link check; writes dist/, sitemap.xml and robots.txt
scripts/reference.mjs renders /docs/reference/ and the landing page's operation list from the contract
scripts/pull-contract.mjs  refreshes contract/openapi.yaml
scripts/check-contract.mjs checks contract/openapi.yaml against the live contract (npm test)
contract/openapi.yaml the API contract the build falls back to; contract/SOURCE says where it came from
site.config.mjs       the API base URL and the console URL (one place)
console/              the signed-in customer console, its own SvelteKit app and Netlify site
test/                 plan-consistency, sign-in CTA and contract-drift checks (npm test)
netlify.toml          build command, publish directory and headers
```

Each page starts with a `<!-- {json} -->` line: `title`, `description`, `layout` (`site` or `docs`), `nav` (which menu item is current), and optionally `noindex` and `mainClass`. Docs pages get an "On this page" list from their `<h2 id>` headings (and `<h3 id data-toc>`).

Tokens available in pages: `{{API_BASE}}`, `{{API_VERSION}}`, `{{CONSOLE_URL}}`, `{{CONSOLE_LOGIN}}`, `{{CONSOLE_SIGNUP}}`, `{{OPERATION_LIST}}`, `{{OPERATION_COUNT}}`, `{{WEBHOOK_TEST_VECTOR}}`, `{{BASE_URL_NOTE}}`.

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

The API repo is private, so Netlify can't read it directly, but the live API serves the contract publicly (decision [0011](https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0011-api-contract-is-public.md)). The build reads the live contract first, so the site already follows it; `contract/openapi.yaml` is the copy the build falls back to when that fetch fails. Refresh it when the contract changes and commit it:

```bash
npm run contract:pull -- https://api.audiokit.ai/v1/openapi.yaml  # from the live API
npm run contract:pull -- ../audiokit                              # or from a local clone
npm run build                                                     # regenerates dist/docs/openapi.yaml
```

`npm test` includes a drift check (`scripts/check-contract.mjs`; also `npm run contract:check`, or `contract:check:strict` to fail instead of warn) that compares the bundled copy with the live one and reports when they differ. It skips with a warning when the API can't be reached, so an offline run doesn't fail.

The getting-started guide (`src/pages/docs/index.html`) is hand-written. When the API changes, check it in the same week, and check the webhook examples still pass the test vector. Only describe an operation as available once it is in the contract.

## Base URLs

`site.config.mjs` holds the two origins the site points at:

- `apiBaseUrl` (`https://api.audiokit.ai`) — every example on the site uses it, and the build reads the hosted contract from `<base URL>/v1/openapi.yaml`, falling back to `contract/openapi.yaml` if that fetch fails.
- `consoleUrl` (`https://console.audiokit.ai`) — the customer console. Every sign-in CTA points at `<consoleUrl>/login`.

## Sign in and sign up

The site sells nothing by itself: every call to action goes to the console — `{{CONSOLE_SIGNUP}}`
for a new customer (`<consoleUrl>/signup`) and `{{CONSOLE_LOGIN}}` for a returning one
(`<consoleUrl>/login`). There is no early-access request form, no Netlify Form and no email
function on this site any more, and `test/signin-cta.test.mjs` keeps it that way.

The console lives in `console/` in this repo and deploys as its own Netlify site
([AudioKit decisions 0016 and 0021](https://github.com/epsilon-records/knowledge/tree/main/audiokit/decisions));
see [`console/README.md`](console/README.md) for its routes and auth. Neither screen needs a
password or an invitation: `/signup` and `/login` both email a magic link, and a link sent to an
address with no account creates it on the Free plan when it is opened (billing `POST
/v1/auth/signup` and `/v1/auth/magic-link`, AudioKit decision 0033). `/auth/callback` then shows
the account's first API key once and sends the customer through `/onboarding`.

No contact mailbox is advertised, because `sales@audiokit.ai` is not set up: the Enterprise card
and the pricing FAQ state the plan without a contact link, and the console's plan screen says
"Enterprise is arranged with us directly". Put an address back on all three once one exists and is
shown to receive mail.

## Deploy

Netlify site `audiokit` (https://audiokit.ai; https://audiokit.netlify.app redirects there), linked to this repo: every push to `main` deploys production, and pull requests get deploy previews.

The site no longer builds any function, so `RESEND_API_KEY` and `AUDIOKIT_FROM_EMAIL` on the `audiokit` Netlify site are unused. Console email goes through the billing service (see [`epsilon-records/audiokit-billing`](https://github.com/epsilon-records/audiokit-billing)), which has its own keys.
