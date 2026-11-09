// Release gate for facts only Nate can supply (shared decision 0012).
//
// A draft page marks each missing fact as <mark class="gap">TODO(privacy): …</mark>. Deploy
// previews and CI build it with the gaps visible. A production build (Netlify sets
// CONTEXT=production) or `node scripts/build.mjs --release` refuses to publish while any gap is
// left, so the privacy notice cannot go live incomplete. Once this is merged, production deploys
// of the whole site stop until every gap is filled.

export const GAP = /TODO\(privacy\):\s*([^<]*)/g;

/** Every open gap in an HTML string, as its description. */
export function findGaps(html) {
  return [...html.matchAll(GAP)].map((m) => m[1].trim());
}

export function isRelease(env = process.env, argv = process.argv) {
  return env.CONTEXT === "production" || argv.includes("--release");
}

/** Throws in a release build when any page still has a gap. `pages` maps route → html. */
export function assertNoGaps(pages, release) {
  if (!release) return;
  const open = [];
  for (const [route, html] of pages) for (const gap of findGaps(html)) open.push(`${route}: ${gap}`);
  if (open.length) {
    throw new Error(
      `release build refused: ${open.length} fact(s) still missing (shared decision 0012):\n  ${open.join("\n  ")}`,
    );
  }
}
