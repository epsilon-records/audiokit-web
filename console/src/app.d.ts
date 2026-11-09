import type { Session } from '#lib/types';

declare global {
	const __METRICS_PRODUCTION__: boolean;
	namespace App {
		interface Platform {
			context?: { site?: { id?: string } };
		}
		interface Locals {
			/** The signed-in session, or null for anonymous requests. */
			session: Session | null;
			/**
			 * The raw session token from the cookie. Kept out of `Session` so it is
			 * never serialized into a page payload; `apiFor()` needs it for calls.
			 */
			sessionToken: string | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface ImportMetaEnv {
		readonly PUBLIC_BILLING_API_URL?: string;
		readonly PUBLIC_APP_METRICS_ENABLED?: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
