const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

/*
 * Errors only the site owner can fix: a missing or wrong secret, or a site
 * key that does not belong to the secret (e.g. the test key left in the
 * page). Blaming the visitor for these would loop them forever.
 */
const CONFIG_ERRORS = ["missing-input-secret", "invalid-input-secret", "invalid-input-response"];

/*
 * Throws when siteverify is unreachable, slow or misconfigured, so the
 * visitor gets "sending failed" with the email fallback instead of being
 * told they look like a robot.
 */
export async function verifyTurnstile(token, secret, ip, fetchFn = fetch) {
  if (!secret) throw new Error("TURNSTILE_SECRET is not set");
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, ...(ip && { remoteip: ip }) });
  const response = await fetchFn(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`siteverify HTTP ${response.status}`);
  const result = await response.json();
  const configError = (result["error-codes"] ?? []).find((code) => CONFIG_ERRORS.includes(code));
  if (configError) throw new Error(`siteverify ${configError}`);
  return result.success === true;
}
