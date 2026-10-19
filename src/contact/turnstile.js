const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/*
 * Throws when siteverify itself is unreachable, so a Cloudflare outage
 * surfaces as "sending failed" (with the email fallback) instead of telling
 * a real visitor they look like a robot.
 */
export async function verifyTurnstile(token, secret, ip, fetchFn = fetch) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, ...(ip && { remoteip: ip }) });
  const response = await fetchFn(SITEVERIFY_URL, { method: "POST", body });
  if (!response.ok) throw new Error(`siteverify HTTP ${response.status}`);
  const result = await response.json();
  return result.success === true;
}
