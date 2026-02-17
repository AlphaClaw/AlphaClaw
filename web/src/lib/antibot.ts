import { verifyTurnstileToken } from "@/lib/turnstile";

/**
 * Centralized Turnstile guard for API routes.
 *
 * Returns a 403 Response on failure, or `null` on success.
 * Usage:
 *   const blocked = await requireTurnstile(request);
 *   if (blocked) return blocked;
 */
export async function requireTurnstile(
	request: Request,
): Promise<Response | null> {
	const token = request.headers.get("X-Turnstile-Token");
	if (!token || !(await verifyTurnstileToken(token))) {
		return Response.json(
			{ error: "Security verification failed" },
			{ status: 403 },
		);
	}
	return null;
}
