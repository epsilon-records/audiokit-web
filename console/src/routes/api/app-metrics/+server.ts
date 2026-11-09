import { APP_METRICS_ENABLED, APP_METRICS_SECRET } from '$app/env/private';
import { createRelay } from '#lib/server/app-metrics-relay';
import type { RequestHandler } from './$types';
const receive = createRelay({
	enabled: APP_METRICS_ENABLED && __METRICS_PRODUCTION__,
	secret: APP_METRICS_SECRET,
	fetch: globalThis.fetch.bind(globalThis)
});
export const fallback: RequestHandler = ({ request }) => receive(request);
export const POST = fallback;
