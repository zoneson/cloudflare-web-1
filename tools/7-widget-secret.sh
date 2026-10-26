#!/bin/bash
# Saves the Turnstile secret for local testing (npx wrangler dev) into .dev.vars,
# which .gitignore keeps out of git. The secret is typed in, never stored here.
# For the live site use instead: npx wrangler secret put TURNSTILE_SECRET

read -rsp 'Turnstile secret key: ' secret
echo
echo "TURNSTILE_SECRET=$secret" > "$(dirname "$0")/../.dev.vars"
echo 'Saved to .dev.vars'
