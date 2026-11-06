/**
 * The base failure type the console client surfaces to screens.
 *
 * Both adapters throw a subclass of this, so a route can branch on the error
 * without knowing whether it is talking to the mock or the billing service.
 */
export class ApiError extends Error {
	constructor(
		readonly code: string,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}
