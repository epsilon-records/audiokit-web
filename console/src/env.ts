import { defineEnvVars } from '@sveltejs/kit/env';
export const variables = defineEnvVars({
	APP_METRICS_ENABLED: {
		schema: (v) => v === 'true',
		description: 'First-party performance relay; default disabled'
	},
	APP_METRICS_SECRET: {
		schema: (v) => v ?? '',
		description: 'Dedicated server-only metrics machine credential'
	}
});
