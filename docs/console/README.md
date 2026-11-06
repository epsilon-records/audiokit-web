# Customer console — design

Information-architecture and wireframe work for the AudioKit customer console
([EPSILON-46](https://linear.app/epsilon-records/issue/EPSILON-46)). This is a **design
record, not an implementation**: no framework, language, hosting or vendor is chosen here.
Those are settled by
[EPSILON-42](https://linear.app/epsilon-records/issue/EPSILON-42) — decide where AudioKit's
freemium billing/account backend lives — and by recorded decisions in the knowledge repo.

The pages the plan calls for (freemium implementation plan, `IMPLEMENTATION_PLAN.md` Phase 2,
currently untracked — see
[EPSILON-43](https://linear.app/epsilon-records/issue/EPSILON-43)):

| Page | Purpose |
| --- | --- |
| Login / register | Get in and out of the console |
| Dashboard | Usage overview, recent jobs, quota remaining |
| Usage | Charts, per-operation breakdown, 12-month history |
| API keys | List, create, revoke, copy |
| Settings | Profile, billing link, delete account |
| Pricing | Current plan, upgrade |

## Documents

1. [Information architecture and sitemap](information-architecture.md) — routes, navigation
   model, content hierarchy, screen states, and what data each screen needs.
2. [User flows](user-flows.md) — the end-to-end journeys, including the awkward paths
   (quota exceeded, payment failure, account deletion).
3. [Wireframes](wireframes.md) — screen-by-screen ASCII wireframes for desktop and mobile,
   plus shared states.
4. [Component inventory](component-inventory.md) — the reusable pieces the screens are built
   from, with states and accessibility notes.
5. [Open questions for Nate](open-questions.md) — the decisions this design deliberately does
   not make.

## Scope

In scope: the signed-in console and its auth screens, the signed-in view of pricing, and the
entry points from the public site. Out of scope: the admin/operations interface (Phase 3 of
the plan), the marketing site redesign, and anything that depends on a settled backend.

## Constraints this design respects

- **Design direction A, "Console"** — dark, developer-first
  ([audiokit 0006](https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0006-website-in-separate-repo.md)).
- **Reuse the existing site's tokens and type** from `src/static/styles.css` rather than
  inventing a second visual language. See the token map below.
- **Keep it generic.** No client names (audiokit 0002, independent project), no real customer
  data in examples.
- **No new vendors.** Charts and any graphics should be achievable with what the repo already
  ships, or inline SVG (see [open questions](open-questions.md#charts)).

## Design foundation

The console is the "site" the landing page already advertises. It uses the same tokens, the
same two typefaces and the same panel/line language; it adds layout and data-display pieces,
not a new theme.

| Role | Token (`styles.css`) | Use in the console |
| --- | --- | --- |
| Page background | `--bg` `#0c0e11` | Console canvas |
| Band / secondary surface | `--bg-band` `#101318` | Sidebar, page bands, table headers |
| Panel | `--panel` `#14171c` | Cards, stat tiles |
| Deep panel | `--panel-deep` `#0f1215` | Code blocks, chart plot area |
| Border | `--line` `#262b33` | Card and table rules |
| Strong border | `--line-strong` `#3a414b` | Inputs, secondary buttons |
| Text | `--text` `#e6e8eb` | Headings, primary values |
| Soft text | `--text-soft` `#c3c9d1` | Body, nav |
| Muted | `--muted` `#b4bcc6` | Labels, helper copy |
| Faint | `--faint` `#9aa3ae` | Timestamps, captions |
| Accent | `--accent` `#ffb547` | Primary actions, active nav, focus ring |
| Accent wash | `--accent-soft` `rgba(255,181,71,.12)` | Selected rows, highlight bands |
| Success | `--ok` `#7fd69a` | Succeeded jobs, paid |
| Warning / error | `--warn` `#ff8a7a` | Failed jobs, past due, destructive |
| Sans | `--sans` Space Grotesk | UI and headings |
| Mono | `--mono` JetBrains Mono | Keys, IDs, numbers, code, timestamps |
| Radius | `--radius` 10px / `--radius-sm` 6px | Cards / controls |

Reuse the existing primitives where they fit: `.btn`, `.btn-primary`, `.btn-ghost`, `.panel`,
`.panel-bar`, `.code`, `.copy`, `.readout`, `.kicker`, `.lede`, `.dim`, `.band`, `.wrap`.

## How to read the wireframes

Boxes are layout, not pixels. `▸` marks the primary action of a screen; `…` marks content
that comes from the API; `[ ]`/`( )` are controls. Every wireframe is followed by its states
and the data it needs. Route names are a **proposal** (see
[open questions](open-questions.md#app-shape-and-hosting)); only the hierarchy is intended as
the design.
