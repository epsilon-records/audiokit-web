import { createReceiver } from './app-metrics-receiver';
import type { Sample } from '../app-metrics-contract';
/** No framework/session client: reconstruct body and machine headers from constants. */
export function createRelay(options: {
	enabled: boolean;
	secret: string;
	fetch: typeof fetch;
	origin?: string;
}) {
	const receive = createReceiver();
	return (request: Request) =>
		receive(
			request,
			async (sample: Sample) => {
				if (!/^[a-zA-Z0-9_-]{32,128}$/.test(options.secret)) throw new Error('Unavailable');
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 1000);
				try {
					const response = await options.fetch(
						'https://billing.audiokit.ai/v1/internal/app-metrics',
						{
							method: 'POST',
							credentials: 'omit',
							referrerPolicy: 'no-referrer',
							redirect: 'error',
							cache: 'no-store',
							keepalive: false,
							headers: {
								'Content-Type': 'application/json',
								Authorization: 'Bearer ' + options.secret
							},
							body: JSON.stringify({
								v: 1,
								route: 'dashboard',
								metric: sample.metric,
								ms: sample.ms
							}),
							signal: controller.signal
						}
					);
					void response.body?.cancel().catch(() => {});
					if (response.status === 429) return false;
					if (response.status !== 204) throw new Error('Unavailable');
					return true;
				} finally {
					clearTimeout(timer);
				}
			},
			options.enabled,
			options.origin
		);
}
