/**
 * First-touch signup source (AudioKit decisions 0040 and 0041, EPSILON-98).
 *
 * On the page a visitor lands on, the public site reads where they came from, in memory only
 * (0041: nothing is stored on the device), and adds it to that page's console
 * sign-up and sign-in links as query values (`src/static/first-touch.js`): `ak_ref` (the
 * referring site's host name), `utm_*` and `ak_landing` (the path they landed on). A visitor who
 * arrives at the console directly brings `utm_*` in the address and, at most, a `Referer` header.
 *
 * The console stores none of it: the signup and sign-in screens carry it in hidden form fields
 * to the magic-link request, and the billing service keeps it on the account it creates. Both
 * screens send it because a sign-in link also creates the account for a new address (0033).
 *
 * Every value is visitor-controlled, so it is cleaned and capped here and again by billing.
 */

export type SignupSource = {
	referrerHost?: string;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	utmTerm?: string;
	utmContent?: string;
	landingPath?: string;
};

/** Query/form names, shared with the public site's `first-touch.js`. */
export const SOURCE_PARAMS = {
	referrerHost: 'ak_ref',
	utmSource: 'utm_source',
	utmMedium: 'utm_medium',
	utmCampaign: 'utm_campaign',
	utmTerm: 'utm_term',
	utmContent: 'utm_content',
	landingPath: 'ak_landing'
} as const satisfies Record<keyof SignupSource, string>;

const LIMITS: Record<keyof SignupSource, number> = {
	referrerHost: 253,
	utmSource: 100,
	utmMedium: 100,
	utmCampaign: 100,
	utmTerm: 100,
	utmContent: 100,
	landingPath: 200
};

/** Our own hosts: a visit from one of them is not a source. */
const SELF_HOST = /(^|\.)audiokit\.ai$/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
/** An email address in a utm value is personal data nobody asked for: drop the value. */
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const HOSTNAME =
	/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

function clean(value: unknown, max: number): string {
	if (typeof value !== 'string') return '';
	return value
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
}

function cleanHost(value: unknown): string {
	const host = clean(value, LIMITS.referrerHost).toLowerCase();
	if (!host || !HOSTNAME.test(host) || IPV4.test(host) || SELF_HOST.test(host)) return '';
	return host;
}

function cleanPath(value: unknown): string {
	const path = clean(value, LIMITS.landingPath);
	// A path only: no scheme, host, query or fragment.
	if (!path.startsWith('/') || path.startsWith('//') || /[?#\\]/.test(path)) return '';
	return path;
}

function hostOf(url: string | null | undefined): string {
	if (!url) return '';
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.hostname : '';
	} catch {
		return '';
	}
}

type Getter = { get(name: string): unknown };

/**
 * Read a signup source from query values or form fields. `referer` is the request's `Referer`
 * header, used only when the site did not pass `ak_ref` (a direct landing on the console).
 * Returns `undefined` when there is nothing to send.
 */
export function readSignupSource(
	values: Getter,
	referer?: string | null
): SignupSource | undefined {
	const source: SignupSource = {};
	const ref = cleanHost(values.get(SOURCE_PARAMS.referrerHost)) || cleanHost(hostOf(referer));
	if (ref) source.referrerHost = ref;
	for (const key of ['utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent'] as const) {
		const value = clean(values.get(SOURCE_PARAMS[key]), LIMITS[key]);
		if (value && !EMAIL_LIKE.test(value)) source[key] = value;
	}
	const landing = cleanPath(values.get(SOURCE_PARAMS.landingPath));
	if (landing) source.landingPath = landing;
	return Object.keys(source).length ? source : undefined;
}

/** The source as query/form pairs, to carry it between the auth screens. */
export function signupSourceEntries(source: SignupSource | undefined): [string, string][] {
	if (!source) return [];
	return (Object.keys(SOURCE_PARAMS) as (keyof SignupSource)[])
		.filter((key) => source[key])
		.map((key) => [SOURCE_PARAMS[key], source[key] as string]);
}

/** `?ak_ref=…&utm_source=…` (or '') for links between /signup and /login. */
export function signupSourceQuery(source: SignupSource | undefined): string {
	const query = new URLSearchParams(signupSourceEntries(source)).toString();
	return query ? `?${query}` : '';
}

/**
 * The billing service's field shape, as billing published it in
 * epsilon-records/knowledge#55 (the contract for EPSILON-98): one optional `signup_source`
 * object, snake_case keys, empty keys left out. Billing re-validates every field, never refuses
 * a signup over it, and stores it only when the link creates the account. This is the only
 * place that knows the wire names.
 */
export function toWireSignupSource(
	source: SignupSource | undefined
): Record<string, string> | undefined {
	if (!source) return undefined;
	const wire: Record<string, string> = {};
	if (source.referrerHost) wire.referrer_host = source.referrerHost;
	if (source.utmSource) wire.utm_source = source.utmSource;
	if (source.utmMedium) wire.utm_medium = source.utmMedium;
	if (source.utmCampaign) wire.utm_campaign = source.utmCampaign;
	if (source.utmTerm) wire.utm_term = source.utmTerm;
	if (source.utmContent) wire.utm_content = source.utmContent;
	if (source.landingPath) wire.landing_path = source.landingPath;
	return Object.keys(wire).length ? wire : undefined;
}
