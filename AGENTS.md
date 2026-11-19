# Notes for agents

This file is the single source of truth for every coding agent working in this repo (Claude, Codex, others). `CLAUDE.md` is a symlink to it; edit here only.

## Project rules

- The AudioKit site (audiokit.ai), the console and their Storybook, run by the AudioKit orchestrator. Decisions live in the private `epsilon-records/knowledge` repo, under `audiokit/decisions/` and `shared/decisions/`. Read them before proposing changes; record new decisions there, not here.
- At the start of a session, check the message board for open issues labeled `to:audiokit`: `gh api "repos/epsilon-records/knowledge/issues?state=open&labels=to:audiokit"`. The protocol is in that repo's `CLAUDE.md`.
- This repo is public: never describe a security hole in an issue, PR or commit here. AudioKit is presented as an independent project: no client-specific names in copy, docs or comments.
- `contract/` mirrors the API's `openapi.yaml`; it changes only through `npm run contract:pull`, never by hand.

## Commands

- Site (repo root): `npm ci`, then before finishing `npm test`, `npm run contract:check:strict`, `npm run test:build`
- Console (`console/`): `npm ci`, then before finishing `npm run check`, `npm run build`, `npm test`, and `npm run build-storybook -- --disable-telemetry` if you touched components or stories
- Netlify builds a site only when its own inputs change, and skips deploy previews unless the branch ends in `-preview`. Don't change the `ignore` rules unless the issue asks.

## Chain of command

- Nate is the board. The Oracle (a Claude session) is the only agent that talks to him, and its decisions are final.
- Worker agents take one issue at a time and deliver it as one PR. Codex takes only issues labelled `agent:codex`, and never takes issues assigned to another agent.

## How to work

- Branch from `main` (`codex/<issue#>-<slug>` for Codex). Never push to `main`.
- Keep each PR small and single-purpose, and include "Closes #<n>", a summary, test evidence and risks. CI must be green.
- If a PR makes a lasting decision, draft the decision record in the PR description so it can be filed in `epsilon-records/knowledge`.

## Never do these (raise them instead)

- Merge, deploy, or change production settings (Netlify, Stripe, PostHog).
- Change public API contracts, pricing, billing or artist-pay logic.
- Delete data, branches or files outside the issue's scope, or write migrations that drop data.
- Add paid services, contact anyone outside the company, or touch contracts. Never commit secrets.

## Blockers and reporting

- Messages to other agents (board issues and replies, status comments, Codex escalations) follow the agent message protocol, [kb:protocols/agent-messages.md](https://github.com/epsilon-records/knowledge/blob/main/protocols/agent-messages.md), using the terms in [kb:glossary.md](https://github.com/epsilon-records/knowledge/blob/main/glossary.md).
- Never stop silently. Post the blocker to the message board in `epsilon-records/knowledge` following that repo's `AGENTS.md`, with your options and a recommendation, link it from the issue, and carry on with anything that doesn't depend on the answer.
- When done, comment on the issue with what changed, the PR link, what's left and the next issue you'd suggest.
