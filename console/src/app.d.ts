import type { Session } from '#lib/types';

declare global {
	namespace App {
		interface Locals {
			/** The signed-in session, or null for anonymous requests. Mock-first: see src/lib/api-client.ts. */
			session: Session | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
