export const TURNSTILE_SITE_KEY = "REPLACE_WITH_YOUR_SITE_KEY";

/**
 * Server-side Turnstile token verification with caching.
 *
 * Turnstile tokens are single-use: Cloudflare's siteverify endpoint returns
 * success only on the first call for a given token. We deduplicate and cache
 * the verification result so concurrent calls sharing the same token succeed.
 */

const tokenCache = new Map<
	string,
	{ result: boolean; expires: number; promise?: Promise<boolean> }
>();

function getTurnstileSecret(): string {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret) {
		throw new Error("TURNSTILE_SECRET_KEY environment variable is not set");
	}
	return secret;
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
	const cached = tokenCache.get(token);
	if (cached) {
		if (cached.promise) return cached.promise;
		if (cached.expires > Date.now()) return cached.result;
		tokenCache.delete(token);
	}

	const promise = (async () => {
		try {
			const response = await fetch(
				"https://challenges.cloudflare.com/turnstile/v0/siteverify",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						secret: getTurnstileSecret(),
						response: token,
					}).toString(),
				},
			);

			const data = (await response.json()) as { success: boolean };
			const success = data.success === true;

			tokenCache.set(token, {
				result: success,
				expires: Date.now() + 5 * 60 * 1000,
			});

			return success;
		} catch (error) {
			console.error("Turnstile verification error:", error);
			tokenCache.delete(token);
			return false;
		}
	})();

	tokenCache.set(token, { result: false, expires: 0, promise });
	return promise;
}
