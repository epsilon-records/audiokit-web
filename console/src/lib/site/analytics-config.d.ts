// Types for analytics-config.js, a verbatim copy of the static site's
// scripts/analytics-config.mjs (EPSILON-169).
export const TOKEN_VARIABLE: 'PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN';
export function analyticsToken(env?: Record<string, string | undefined>): string;
