# Consultant profile site — design

Date: 2026-10-18
Status: awaiting owner approval
Domain: zoneson.net (to be bought by the owner on Cloudflare Registrar)

## 1. Intent

The owner is a former Pica8 Solution Engineer who is leaving to work as an
independent consultant for Pica8 customers. This is the owner's personal website.

Visitors are current or potential Pica8 customers — mostly network
engineers and their managers — who either have a question about a Pica8
product or a networking problem they want solved. The site's single job:
make such a visitor believe "this person knows Pica8 from the inside and
has done exactly my kind of rollout", and then get their request into the
owner's inbox with as little friction as possible.

## 2. Goals

1. One page that covers: who the owner is, areas of expertise, key projects,
   and a contact form.
2. The contact form works from day one and delivers each request to
   `zoneson@gmail.com`, with Reply-To set to the customer's address.
3. The form rejects robots and obviously fake or no-reply addresses.
4. Looks great on phones first, also on desktop; loads fast.
5. Live on `https://zoneson.net` via Cloudflare.

## 3. Non-goals (this version)

- Extra pages, blog, multi-language (English only).
- Confirmation-link ("double opt-in") email verification.
- Analytics, CMS, frameworks, build step.
- The "gap list" in section 11 — parked by the owner for later.

## 4. Anti-goals (failure even if it technically works)

- A visitor believes the site is Pica8's, or that the owner is Pica8 support.
  No Pica8 logo, no Pica8 colors, no wording implying endorsement.
- A real customer request is silently lost.
- Any customer is identifiable from the project descriptions.
- Invented facts (names, numbers, testimonials) shipped as if real.

## 5. Decisions made by the owner

| Topic | Decision |
|---|---|
| Positioning | Independent; "former Pica8 Solution Engineer, familiar with Pica8 products"; not affiliated |
| Expertise to feature | Pica8 products (PicOS, AmpCon), ONIE, Zero Touch Provisioning, Ansible playbooks, data-center environments |
| Lead project | Data-center rollout: ONIE → PicOS install via ZTP → config provisioning with Ansible. Anonymized |
| Top of page | "B · Person first": photo, name, role line, one-sentence pitch, Contact button |
| Visual style | "C · Consultant": navy + gold, serif headings (see 7.2) |
| Contact | Form on the page (not a mailto link), from day one |
| Form fields | Name*, Work email*, Company, Topic* (4 choices), Switch models & count, Timeline, Problem description* |
| Anti-robot | Required |
| Email check | Level A: reject no-reply style addresses and domains that cannot receive mail. No confirmation link |
| Domain | zoneson.net |

## 6. Page content (single page, top to bottom)

Owner's name: **Zoneson Chen**.

Real details not yet supplied (About text, project result numbers) appear
as visible placeholders wrapped in `[[…]]`, so nothing invented can ship
unnoticed. The owner chose to leave them for now. Before the deploy step
(section 10, step 6) the builder runs `grep -n '\[\[' public/` and shows
the owner every remaining placeholder; the owner decides then whether to
fill them or deploy as is. Project cards 2–3 are omitted entirely rather
than shown empty *(my call)*; the layout must look right with one card.

**Photo**: source `~/zoneson/icon/zc-kanas.jpeg` (outside the repo;
5712×4284 stored, displays portrait via EXIF orientation; 2.4 MB). Produce
`public/images/photo.jpg` with macOS `sips` (built in, no install):
apply the orientation, square-crop to head and shoulders (face sits
roughly 58% across and 45% down the upright image), resize to 400×400,
≤ 60 KB, and **strip all metadata** (phone photos can carry GPS location).
The original stays where it is; it is never committed.

1. **Top bar** — "Zoneson Chen" (left); links About · Expertise · Projects · Contact.
2. **Hero (navy band)** — round photo (`public/images/photo.jpg`, alt
   "Zoneson Chen"), name "Zoneson Chen", role line
   "Independent network consultant", pitch
   "Former Pica8 Solution Engineer. I help Pica8 customers deploy,
   automate and troubleshoot PicOS switches.", button "Contact me" → #contact.
3. **About** — 2–3 short paragraphs: Pica8 background, what the owner does now,
   based in Cupertino, CA (Pacific time). Placeholder text for anything
   personal.
4. **Areas of expertise** — 4 cards: Pica8 products (PicOS, AmpCon);
   ONIE & bare-metal installs; Zero Touch Provisioning; Ansible automation.
   One plain sentence each.
5. **Key projects** — up to 3 anonymized cards (tag, title, problem,
   what was done, result). One card for now: the ZTP + Ansible data-center rollout;
   its result numbers are placeholders. More cards added later.
6. **Contact** — heading, one line "I usually reply within one working
   day", the form (section 8), privacy line "Used only to reply to you."
7. **Footer** — "© 2026 Zoneson Chen · Independent consultant. Not
   affiliated with or endorsed by Pica8, Inc. Pica8, PicOS and AmpCon are
   trademarks of their respective owners."

Remove from the current page: stats strip, "What people say" quotes,
résumé link, "Read the story" links, and all designer sample copy.

Head: `<title>Zoneson Chen — PicOS & Zero Touch Provisioning consultant</title>`,
matching meta description and Open Graph title/description. Drop the
`og:image` tag until a share image exists.

## 7. Look and build of the page

### 7.1 Technology
Plain HTML + CSS, no framework, no web fonts, no build step. The only
JavaScript is the form submit handler and the Turnstile widget script.
Keep `public/css/base.css` as the layout; it already reads all colors and
fonts from CSS variables.

### 7.2 Style tokens (theme "consultant")
New file `public/css/theme-consultant.css`, linked directly (no switcher):

| Token | Value |
|---|---|
| page background | `#f7f5f0` (warm off-white) |
| surface (cards) | `#ffffff` |
| navy (hero band, top bar) | `#14213d` |
| text | `#1c2533` |
| muted text | builder picks, must pass WCAG AA on the background |
| gold accent | `#e0a526` (buttons, role line, card left border); text on gold is navy |
| headings | `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` |
| body | system font stack already in base.css |
| buttons | pill-shaped; cards ~12px radius with 3px gold left border on project cards |

Approved mockups, all in `.superpowers/brainstorm/*/content/`:
`visual-style.html` (option C — style), `hero-direction.html`
(option B — hero arrangement), `contact-form.html` (field layout and the
inbox email format; approved as shown). Where a mockup and this document
disagree, this document wins.

### 7.3 Mobile and speed
- Designed at 360px first; no horizontal scroll at 320px.
- Total page weight (excluding the photo and the Turnstile script)
  under 50 KB. Photo resized to ≤ 400×400, ≤ 60 KB.

### 7.4 Cleanup
Delete `public/preview.html`, `public/css/theme-clean.css`,
`theme-bold.css`, `theme-warm.css`, and the `?style=` switcher script in
`index.html`. (Project rule: confirm with the owner at the moment of
deleting.)

## 8. Contact form

### 8.1 Fields

| Field | Required | Input | Limit |
|---|---|---|---|
| Name | yes | text | 100 chars |
| Work email | yes | email | 254 chars |
| Company | no | text | 100 chars |
| Topic | yes | radio: "Question about a Pica8 product", "ZTP / automation (ONIE, Ansible)", "Troubleshooting", "Something else" | one of the four |
| Switch models & count | no | text, hint "e.g. 12 × AS4630, 4 × AS7726" | 200 chars |
| Timeline | no | select: ASAP / This month / Just exploring | one of three |
| Problem | yes | textarea | 5000 chars |

### 8.2 Behaviour
- Browser posts the form (JSON or form-encoded, builder's choice) to
  `POST /api/contact` with the Turnstile token.
- Success → form replaced by "Thanks — I usually reply within one working day."
- Validation error → message next to the field, form keeps its contents.
- Any server/sending failure → "Sorry, sending failed. Please email me
  directly at zoneson@gmail.com" with a mailto link. The request must never
  appear to succeed when it did not.

### 8.3 Server checks (in this order, cheapest first)
1. Required fields present, lengths within limits, topic/timeline in the
   allowed set.
2. Email syntax plausible (one `@`, a dot in the domain).
3. Local part not a no-reply address: matches
   `^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster)$`,
   case-insensitive → reject with "Please use an address I can reply to."
4. Turnstile token verified with
   `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
5. Domain can receive mail (DNS-over-HTTPS queries to
   `https://cloudflare-dns.com/dns-query?name=<domain>&type=<MX|A|AAAA>`,
   `accept: application/dns-json`). Null MX (`0 .`) → reject. Otherwise
   accept if it has an MX record, or — per RFC 5321's implicit-MX rule —
   an A or AAAA record. Neither → reject with "That email domain can't
   receive mail." If a DNS lookup itself errors, accept (do not lose a
   real customer over a DNS hiccup). *(Builder-check call: added the
   A/AAAA fallback to honour the "never lose a real customer" anti-goal.)*

### 8.4 The email the owner receives
- From: `Website form <form@zoneson.net>`
- To: `zoneson@gmail.com`
- Reply-To: `<customer name> <customer email>`
- Subject: `[<topic>] <name> — <company or "no company">`
- Body: plain text, one field per line, problem text last. All customer
  values inserted as text; header values stripped of CR/LF.

## 9. Architecture

- **Cloudflare Worker with static assets** (the project's existing
  `zc-website-1` Worker). `public/` stays the asset directory.
- New `src/worker.js` handles only `POST /api/contact`; every other
  request goes to static assets. In `wrangler.jsonc`: add `main`,
  `assets.binding`, and `assets.run_worker_first: ["/api/*"]`.
- **Email sending**: Cloudflare Email Routing `send_email` binding with
  `destination_address: "zoneson@gmail.com"`, sender on `zoneson.net`.
  Message built as raw MIME by hand (small, text/plain, UTF-8) — no npm
  package.
- **Turnstile**: site key in the HTML (public); secret stored with
  `wrangler secret put TURNSTILE_SECRET` and in `.dev.vars` locally
  (already gitignored). Local dev uses Cloudflare's published always-pass
  test keys.
- **Custom domain**: `zoneson.net` (and `www` redirect, builder's call)
  attached to the Worker via `routes` with `custom_domain: true`.
- Keep `src/worker.js` small: pure functions for validation and MIME
  building, so they can be tested with Node's built-in `node:test`
  without installing packages.

## 10. Rollout (owner actions marked ★)

1. Build and test locally with `npx wrangler dev` using Turnstile test
   keys. Email sending cannot be tested locally end-to-end; the builder
   stubs it in dev and states so.
2. ★ Buy `zoneson.net` on Cloudflare Registrar.
3. ★ Enable Email Routing on zoneson.net; add and verify
   `zoneson@gmail.com` as a destination address.
4. ★ Create a Turnstile widget for `zoneson.net` (and `localhost`) in
   the dashboard; give the site key to the builder and set the secret
   with `wrangler secret put`.
5. Builder wires the custom domain and bindings, and sets
   `workers_dev: false` so no public copy exists on `*.workers.dev`
   where Turnstile and email would fail.
6. ★ Owner approves deploy → `npx wrangler deploy`.
7. Live test: submit one real request; confirm it arrives in Gmail with
   correct Reply-To and does not land in spam; submit a `noreply@`
   address and a domain with no MX/A/AAAA record and confirm both are
   rejected.

"Form works from day one" means from the first public deploy. There is
no public deploy before `zoneson.net`, Email Routing and Turnstile are
ready — the domain is a hard blocker for going live. *(Builder-check call.)*

## 11. Parked for later (owner will decide)

Engagement terms (free first call, remote/on-site, pricing); `hello@zoneson.net`
forwarding; real case-study numbers; credentials/certifications; a public
technical sample (ZTP write-up or sanitized Ansible example — no Pica8 or
customer code); time zone/hours/languages; LinkedIn link; Cloudflare Web
Analytics; share image; résumé PDF.

## 12. Left to the builder

File layout inside `src/`, exact markup and CSS beyond the tokens above,
JSON vs form-encoded submit, `www` handling, wording of error messages
beyond those given, test structure. Add `.superpowers/` to `.gitignore`.
