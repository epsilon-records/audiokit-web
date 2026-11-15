// Cloudflare Web Analytics site token, read from the build environment (shared decision 0011).
// The token is public, but it comes from the Netlify environment rather than the source, the way
// LabelKit does it (PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN, production context only).
//
// The beacon is built into the pages only when the variable is a 32-hex-character token AND the
// build is Netlify's production context. Unset, malformed, deploy previews, branch deploys and
// local builds (no CONTEXT) all build without it, and none of them fail.

export const TOKEN_VARIABLE = "PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN";

export function analyticsToken(env = process.env) {
  if (env.CONTEXT !== "production") return "";
  const value = (env[TOKEN_VARIABLE] || "").trim();
  return /^[a-f0-9]{32}$/i.test(value) ? value : "";
}
