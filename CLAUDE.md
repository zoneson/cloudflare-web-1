# Project: website-1

A static website hosted on Cloudflare Workers (static assets), deployed with Wrangler.

## Structure
- `public/` – all website files (HTML, CSS, JS, images). Everything here is published.
- `wrangler.jsonc` – Cloudflare settings. Assets are served from `./public`.

## Commands
- Preview locally: `npx wrangler dev` → http://localhost:8787
- Deploy live: `npx wrangler deploy`
- Save work: `git add . && git commit -m "message" && git push`

## Rules
- Keep all website files inside `public/`.
- Use plain HTML, CSS, and JavaScript unless I ask for a framework.
- Pages must look good on phones and desktops.
- Never put passwords or API keys in website files. Use Wrangler secrets instead.
- Ask before deploying, deleting files, or installing new packages.
- I'm a beginner: briefly explain what you changed and why.
