# Consultant Profile Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the sample one-page site into Zoneson Chen's consultant profile with a working contact form that emails `zoneson@gmail.com`, deployable on `zoneson.net`.

**Architecture:** The existing `zc-website-1` Worker keeps serving `public/` as static assets. A small Worker script handles only `POST /api/contact`: validate → Turnstile → mail-domain check → build raw MIME → send via the Email Routing `send_email` binding. All logic lives in pure ES modules under `src/contact/` that take their I/O (`fetch`, `send`) as parameters, so Node's built-in test runner covers them without packages.

**Tech Stack:** Plain HTML/CSS/JS, Cloudflare Workers + static assets, Wrangler 4 (already installed), Cloudflare Turnstile, Email Routing `send_email`, `node --test` (Node 26).

**Spec:** `docs/superpowers/specs/2026-10-18-consultant-profile-site-design.md`

## Global Constraints

- No new npm packages, no frameworks, no web fonts, no build step (spec 7.1, 9).
- All website files stay in `public/` (project CLAUDE.md).
- Secrets never in website files: Turnstile secret only via `wrangler secret put TURNSTILE_SECRET` / `.dev.vars` (gitignored).
- Ask the owner before deploying, deleting files, or installing packages (project CLAUDE.md).
- English only on the page. No Pica8 logo or Pica8 colors; footer text exactly as spec section 6 item 7.
- Every source file < 800 lines; code comments in English, explaining only non-obvious why.
- Page weight (excluding photo and Turnstile script) < 50 KB; photo 400×400, ≤ 60 KB, metadata stripped.
- No horizontal scroll at 320px wide.
- Local Turnstile test keys: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
- Owner-facing explanations in plain words (owner is a beginner with web tooling).

## Review Focus

1. **Non-ASCII names/companies** (e.g. `陈忠森`, `Müller`) — the email must arrive with a readable subject and Reply-To, not mojibake. Test in Task 4.
2. **Line breaks inside a field** (`"Jane\r\nBcc: x@y.com"`) — must never create a new email header. Test in Task 4.
3. **Messy email input** (`"  Jane@Example.COM "`) — trimmed and accepted, domain lookup uses the lower-cased domain. Test in Task 1.
4. **Turnstile token missing or expired** — the visitor is told to retry the check, the widget resets, and the form keeps its contents; not the generic "sending failed". Test in Task 5 (403) and Task 7 (manual).
5. **Double click on Send / network offline** — one request only; offline shows the mailto fallback. Button disabled while sending (Task 7, manual).

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json` (modify) | `"type": "module"`, `"test": "node --test"` |
| `src/contact/validate.js` | Field rules, trimming, no-reply detection |
| `src/contact/mail-domain.js` | DNS-over-HTTPS "can this domain receive mail?" |
| `src/contact/turnstile.js` | Turnstile siteverify call |
| `src/contact/message.js` | Subject + raw MIME text |
| `src/contact/handle.js` | Ordered pipeline → HTTP JSON response |
| `src/worker.js` | Routing, binding glue (`cloudflare:email` import lives only here) |
| `test/*.test.js` | One test file per `src/contact/*` module |
| `wrangler.jsonc` (modify) | `main`, assets binding, `run_worker_first`, `send_email` |
| `public/index.html` (rewrite) | Page content per spec 6 |
| `public/css/theme-consultant.css` | Tokens per spec 7.2 |
| `public/css/base.css` (modify) | Navy hero band, form styles; drop dead rules |
| `public/js/contact.js` | Form submit, error display, fallback |
| `public/images/photo.jpg` | Processed photo |

HTTP contract between `handle.js` and `contact.js` (used by Tasks 5 and 7):

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ "ok": true }` | Sent |
| 400 | `{ "ok": false, "errors": { "<field>": "<message>" } }` | Fix fields |
| 403 | `{ "ok": false, "error": "turnstile" }` | Robot check failed/expired |
| 502 | `{ "ok": false, "error": "send" }` | Sending failed → mailto fallback |

Field keys everywhere: `name`, `email`, `company`, `topic`, `switches`, `timeline`, `problem`, plus `turnstileToken`.

---

### Task 1: Test tooling + field validation

**Files:**
- Modify: `package.json`
- Create: `src/contact/validate.js`
- Test: `test/validate.test.js`

**Interfaces:**
- Produces: `TOPICS: string[]` (the four topic labels, spec 8.1, exact text); `TIMELINES: string[]` (`["ASAP", "This month", "Just exploring"]`); `validateFields(input: object) -> { ok: true, data } | { ok: false, errors: {[field]: string} }` where `data` has all seven keys trimmed (optional ones `""` when absent), `email` trimmed with domain lower-cased; `emailDomain(email: string) -> string`.

- [ ] **Step 1:** In `package.json` set `"type": "module"` and `"scripts": { "test": "node --test" }`. Remove `"main"`.
- [ ] **Step 2: Write the failing tests** in `test/validate.test.js` (`node:test` + `node:assert/strict`):
  - `accepts a complete valid request` → `ok === true`.
  - `requires name, email, topic, problem` → empty input gives `errors` with exactly those four keys.
  - `enforces length limits` → name 101 chars, company 101, switches 201, problem 5001, email 255 each produce an error on that key; at-limit values pass.
  - `rejects topic or timeline outside the allowed set` → `topic: "Other"` and `timeline: "Tomorrow"` error.
  - `trims and lower-cases the email domain` → `"  Jane@Example.COM "` → `data.email === "Jane@example.com"`, `emailDomain(data.email) === "example.com"`.
  - `rejects implausible email syntax` → `"a@b"`, `"a@@b.com"`, `"@b.com"`, `"a b@c.com"` error on `email`.
  - `rejects no-reply style addresses` → `noreply@x.com`, `No-Reply@x.com`, `do-not-reply@x.com`, `donotreply@x.com`, `mailer-daemon@x.com`, `postmaster@x.com` give `errors.email === "Please use an address I can reply to."`; `noreplyjane@x.com` passes.
  - `ignores non-string field values` → `{ name: 42 }` treated as missing.
- [ ] **Step 3:** Run `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `src/contact/validate.js`. Limits from spec 8.1; no-reply regex `^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster)$` (case-insensitive, on the local part). Field error messages are the builder's wording except the no-reply one above. Prefer a rules table (`{ field, required, max }`) over per-field `if`s.
- [ ] **Step 5:** Run `npm test` → all PASS.
- [ ] **Step 6: Commit** `git add package.json src/contact/validate.js test/validate.test.js && git commit -m "feat(contact): add field validation"`

### Task 2: Mail-domain check

**Files:**
- Create: `src/contact/mail-domain.js`
- Test: `test/mail-domain.test.js`

**Interfaces:**
- Produces: `canReceiveMail(domain: string, fetchFn = fetch) -> Promise<boolean>`.

- [ ] **Step 1: Write the failing tests**, each with a fake `fetchFn` that answers by `type` query param with DoH JSON (`{ Status: 0, Answer: [{ type: 15, data: "10 mx.example.com." }] }`):
  - `true when an MX record exists` (A/AAAA never queried).
  - `false for null MX` → MX answer `"0 ."`.
  - `true with no MX but an A record` and `true with no MX but an AAAA record`.
  - `false when no MX, A or AAAA` (all `Answer` absent, `Status: 0`).
  - `false for NXDOMAIN` → `Status: 3` on every query.
  - `true when the lookup throws` and `true on HTTP 500` (fail open, spec 8.3).
  - `queries cloudflare-dns.com with accept: application/dns-json` → assert URL host and header.
- [ ] **Step 2:** Run `npm test` → new tests FAIL.
- [ ] **Step 3:** Implement. URL `https://cloudflare-dns.com/dns-query?name=<domain>&type=<MX|A|AAAA>`. Query MX first; only if no MX query A and AAAA. Any exception or non-OK HTTP anywhere → `true`.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(contact): check that email domain can receive mail"` (add both files).

### Task 3: Turnstile verification

**Files:**
- Create: `src/contact/turnstile.js`
- Test: `test/turnstile.test.js`

**Interfaces:**
- Produces: `verifyTurnstile(token: string, secret: string, ip: string|null, fetchFn = fetch) -> Promise<boolean>`.

- [ ] **Step 1: Write the failing tests:**
  - `posts secret, response and remoteip to siteverify` → fake fetch asserts URL `https://challenges.cloudflare.com/turnstile/v0/siteverify`, method POST, form body fields `secret`, `response`, `remoteip`.
  - `true when success is true`, `false when success is false`.
  - `false for empty token without calling fetch`.
  - `throws when fetch fails` (network error propagates — `handle.js` maps it to 502, so a Cloudflare outage shows the mailto fallback instead of "you're a robot").
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implement. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(contact): verify Turnstile token"`.

### Task 4: Email message building

**Files:**
- Create: `src/contact/message.js`
- Test: `test/message.test.js`

**Interfaces:**
- Consumes: `data` shape from Task 1.
- Produces: `buildSubject(data) -> string` (`[<topic>] <name> — <company or "no company">`); `buildMime(data, { from, to, date = new Date(), messageId }) -> string` (CRLF line endings).

- [ ] **Step 1: Write the failing tests:**
  - `subject follows the spec format` → `"[Troubleshooting] Jane Chen — Example DC"`; company `""` → `"… — no company"`.
  - `has the required headers` → MIME contains `From: Website form <form@zoneson.net>`, `To: zoneson@gmail.com`, `Reply-To:` containing `<jane@example.com>`, `Message-ID: <…@zoneson.net>`, `Date:`, `MIME-Version: 1.0`, `Content-Type: text/plain; charset=UTF-8`.
  - `encodes non-ASCII subject and display name` → name `"陈忠森"`: Subject and Reply-To lines are pure ASCII and contain `=?UTF-8?B?`; decoding the base64 gives back the original text.
  - `cannot inject headers through fields` → name `"Jane\r\nBcc: x@y.com"`, company `"A\nB"`: no line of the header block starts with `Bcc:`; header block has exactly the expected header names.
  - `body lists fields in order with problem last` → decoded body lines `Name:`, `Email:`, `Company:`, `Topic:`, `Switches:`, `Timeline:`, then a blank line, `Problem:`, then the problem text with its own line breaks kept.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement. Strip `\r` and `\n` from every header value before use. Header values with non-ASCII → RFC 2047 `=?UTF-8?B?<base64>?=`. Body `Content-Transfer-Encoding: base64`, wrapped at 76 chars. Use `btoa` over UTF-8 bytes (`TextEncoder`) — available in both Node and Workers. `messageId` defaults to `` `<${crypto.randomUUID()}@zoneson.net>` `` (Email Routing rejects messages without a Message-ID).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(contact): build notification email"`.

### Task 5: Request pipeline, Worker entry, Wrangler config

**Files:**
- Create: `src/contact/handle.js`, `src/worker.js`, `.dev.vars` (not committed)
- Modify: `wrangler.jsonc`
- Test: `test/handle.test.js`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `handleContact(request: Request, deps: { secret, verify, canReceiveMail, send }) -> Promise<Response>` where `send(raw: string) -> Promise<void>`; responses per the HTTP contract table above.

- [ ] **Step 1: Write the failing tests** with fake deps that record calls:
  - `200 and one send on a valid request`; the raw MIME passed to `send` contains the customer's Reply-To.
  - `400 with field errors, no verify/DNS/send calls` on invalid fields.
  - `400 on a body that is not JSON`.
  - `403 when verify returns false`, no send.
  - `400 errors.email "That email domain can't receive mail." when canReceiveMail is false`, no send.
  - `502 when send throws`, and `502 when verify throws`.
  - `runs checks in spec order` → for a no-reply address, `verify` is never called; for a valid request, call order is `verify` then `canReceiveMail` then `send`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implement `handle.js`; read `CF-Connecting-IP` for `remoteip`. Log the error (`console.error`) on 502 so `wrangler tail` shows why. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Implement `src/worker.js`: `POST /api/contact` → `handleContact` with real deps; `send` wraps `new EmailMessage("form@zoneson.net", "zoneson@gmail.com", raw)` from `cloudflare:email` and `env.SEND_EMAIL.send(...)`. Any other method on `/api/contact` → 405. Everything else → `env.ASSETS.fetch(request)`.
- [ ] **Step 6:** Edit `wrangler.jsonc`: add `"main": "src/worker.js"`, `"assets": { "directory": "./public", "binding": "ASSETS", "run_worker_first": ["/api/*"] }`, `"send_email": [{ "name": "SEND_EMAIL", "destination_address": "zoneson@gmail.com" }]`. Create `.dev.vars` with `TURNSTILE_SECRET=1x0000000000000000000000000000000AA`; confirm `git check-ignore .dev.vars` prints it.
- [ ] **Step 7: Verify locally.** `npx wrangler dev`, then:
  - `curl -s localhost:8787/` → the current page HTML (assets still served).
  - `curl -s -X POST localhost:8787/api/contact -H 'content-type: application/json' -d '{}'` → 400 with four field errors.
  - Same with a valid body and `"turnstileToken":"XXXX.DUMMY.TOKEN.XXXX"` → 200, and Wrangler's console shows the simulated email (local `send_email` is simulated, not delivered). If this Wrangler version cannot simulate `send_email`, gate a stub on `env.DEV_STUB_EMAIL === "1"` set only in `.dev.vars`, and tell the owner email is stubbed locally.
- [ ] **Step 8: Commit** `git add src test wrangler.jsonc && git commit -m "feat(contact): handle form submissions in the Worker"`.

### Task 6: The page — content, style, photo, cleanup

**Files:**
- Rewrite: `public/index.html`
- Create: `public/css/theme-consultant.css`, `public/images/photo.jpg`
- Modify: `public/css/base.css`, `.gitignore`
- Delete (ask owner first): `public/preview.html`, `public/css/theme-clean.css`, `public/css/theme-bold.css`, `public/css/theme-warm.css`

**Interfaces:**
- Produces for Task 7: `<form id="contact-form">` with inputs named exactly as the field keys; one error slot per field `<p class="field-error" data-for="<field>">`; a status region `<div id="form-status" role="status">`; Turnstile container `<div class="cf-turnstile" data-sitekey="1x00000000000000000000AA">`; Turnstile script `https://challenges.cloudflare.com/turnstile/v0/api.js` loaded `async defer`.

- [ ] **Step 1: Photo.** From `~/zoneson/icon/zc-kanas.jpeg`, into `public/images/photo.jpg` using `sips` (and `/usr/bin/python3` only if `sips` can't crop off-centre): apply EXIF orientation, square-crop head and shoulders (face ≈ 58% across, 45% down the upright image), 400×400, JPEG quality tuned to ≤ 60 KB. Verify: `sips -g pixelWidth -g pixelHeight` → 400/400; `ls -l` ≤ 61440 bytes; `mdls -name kMDItemLatitude public/images/photo.jpg` → `(null)`; open the file and check the face is centred.
- [ ] **Step 2: Content.** Rewrite `index.html` per spec section 6 in that order, with the exact copy the spec fixes (role line, pitch, footer, `<title>`, "I usually reply within one working day", "Used only to reply to you."). About paragraphs and project-1 result numbers are `[[…]]` placeholders; one project card only. Form fields per spec 8.1 with `required`/`maxlength` attributes matching Task 1. Remove the `?style=` script, stats, quotes, résumé link, `og:image`. Link `base.css` then `theme-consultant.css`; `<script src="/js/contact.js" defer>`.
- [ ] **Step 3: Style.** `theme-consultant.css` sets the existing base.css variables to spec 7.2 values, plus `--navy`. In `base.css`: full-width navy hero band and top bar with readable contrast; form layout (stacked labels, full-width inputs, ≥ 44px tap targets, radio group as a vertical list on phones); project card gold left border; remove rules for `.stats`, `.quote`, `.photo` initials and other selectors no longer in the HTML. Check muted-text contrast ≥ 4.5:1 on `#f7f5f0` and on `#ffffff`.
- [ ] **Step 4: Cleanup.** Ask the owner to confirm deleting the four files listed above; on yes, `git rm` them. Add `.superpowers/` to `.gitignore`.
- [ ] **Step 5: Verify.** `npx wrangler dev`; in a browser at 320px, 390px and 1280px wide: no horizontal scroll, hero navy band, photo round, all four nav links scroll to their section, form renders with the Turnstile test widget. `grep -c 'Pica8, Inc.' public/index.html` → 1. Page weight: `du -ch public/index.html public/css/*.css public/js/*.js` total < 50 KB.
- [ ] **Step 6: Commit** `git add public .gitignore && git commit -m "feat(site): consultant profile page in navy and gold"`.

### Task 7: Form behaviour in the browser

**Files:**
- Create: `public/js/contact.js`

**Interfaces:**
- Consumes: Task 6 markup ids/names; HTTP contract table; Turnstile global `turnstile.reset()`, token from the hidden input `cf-turnstile-response`.

- [ ] **Step 1:** Implement: on submit, prevent default; disable the Send button (re-enable on any non-200); send JSON of the field keys + `turnstileToken`; then by status:
  - 200 → replace the form with "Thanks — I usually reply within one working day."
  - 400 → put each message in its `data-for` slot and keep everything the visitor typed.
  - 403 → "Please complete the check and try again." and `turnstile.reset()`.
  - 502 or a network failure → "Sorry, sending failed. Please email me directly at zoneson@gmail.com" with a `mailto:zoneson@gmail.com` link.

  Keep it as a status→handler lookup, not an if-chain.
- [ ] **Step 2: Manual verification** with `npx wrangler dev`:
  - valid request → thanks message;
  - empty required fields → browser's own required hints, and when bypassed (DevTools: remove `required`) the server errors show per field;
  - `noreply@example.com` → the email error, other fields kept;
  - double-click Send → one request in the Network tab;
  - DevTools "Offline" → the mailto fallback;
  - set `.dev.vars` secret to the always-fail test secret `2x0000000000000000000000000000000AA`, restart → the 403 message and the widget resets. Restore the secret afterwards.
- [ ] **Step 3: Commit** `git add public/js/contact.js && git commit -m "feat(site): contact form submit and error handling"`.

### Task 8: Go live on zoneson.net (owner steps marked ★)

**Files:**
- Modify: `wrangler.jsonc`, `public/index.html` (site key only)

- [ ] **Step 1 ★:** Owner buys `zoneson.net` (Cloudflare dashboard → Domain Registration).
- [ ] **Step 2 ★:** Owner enables Email Routing on zoneson.net and verifies `zoneson@gmail.com` as a destination (click the link in the verification email).
- [ ] **Step 3 ★:** Owner creates a Turnstile widget for hostnames `zoneson.net` and `localhost`, gives the builder the **site key**, and runs `npx wrangler secret put TURNSTILE_SECRET` and pastes the secret (builder never sees it).
- [ ] **Step 4:** Put the real site key in `data-sitekey`. In `wrangler.jsonc` add `"routes": [{ "pattern": "zoneson.net", "custom_domain": true }]` and `"workers_dev": false`. `www` handling is the builder's call; state it to the owner.
- [ ] **Step 5:** Run `grep -n '\[\[' public/` and show the owner every remaining placeholder; owner decides fill-now or deploy-as-is.
- [ ] **Step 6 ★:** Ask the owner for permission to deploy; on yes, `npx wrangler deploy`. Expected: output lists `zoneson.net (custom domain)` and no `workers.dev` URL.
- [ ] **Step 7: Live test** on `https://zoneson.net`: one real request arrives in Gmail, Reply-To is the sender, not in spam (if in spam, tell the owner to mark "Not spam" and create a Gmail filter for `form@zoneson.net`); `noreply@example.com` rejected; a domain with no MX/A/AAAA (e.g. `x@nonexistent-domain-zc-test.invalid`) rejected; `curl -sI https://zc-website-1.<account>.workers.dev` no longer serves the site.
- [ ] **Step 8: Commit** `git add wrangler.jsonc public/index.html && git commit -m "chore: serve on zoneson.net"`.
