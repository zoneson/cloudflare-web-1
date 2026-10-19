import { EmailMessage } from "cloudflare:email";
import { handleContact, FROM, TO } from "./contact/handle.js";
import { verifyTurnstile } from "./contact/turnstile.js";
import { canReceiveMail } from "./contact/mail-domain.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/api/contact") return env.ASSETS.fetch(request);
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });

    return handleContact(request, {
      secret: env.TURNSTILE_SECRET,
      verify: verifyTurnstile,
      canReceiveMail,
      send: (raw) => env.SEND_EMAIL.send(new EmailMessage(FROM, TO, raw)),
    });
  },
};
