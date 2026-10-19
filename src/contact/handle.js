import { validateFields, emailDomain } from "./validate.js";
import { buildMime } from "./message.js";

export const FROM = "form@zoneson.net";
export const TO = "zoneson@gmail.com";

const json = (status, body) => Response.json(body, { status });

async function process(input, ip, deps) {
  const result = validateFields(input);
  if (!result.ok) return json(400, { ok: false, errors: result.errors });

  const token = typeof input.turnstileToken === "string" ? input.turnstileToken : "";
  if (!(await deps.verify(token, deps.secret, ip))) return json(403, { ok: false, error: "turnstile" });

  if (!(await deps.canReceiveMail(emailDomain(result.data.email)))) {
    return json(400, { ok: false, errors: { email: "That email domain can't receive mail." } });
  }

  await deps.send(buildMime(result.data, { from: FROM, to: TO }));
  return json(200, { ok: true });
}

/*
 * Anything that throws past validation (siteverify down, email binding
 * failing) becomes 502 so the page shows the direct-email fallback; a
 * request must never look sent when it was not.
 */
export async function handleContact(request, deps) {
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") {
    return json(400, { ok: false, errors: { form: "Sorry, the form could not be read. Please try again." } });
  }
  try {
    return await process(input, request.headers.get("CF-Connecting-IP"), deps);
  } catch (error) {
    console.error("contact form failed:", error);
    return json(502, { ok: false, error: "send" });
  }
}
