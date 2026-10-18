#!/bin/bash

cat > ../wrangler.jsonc << 'EOF'
{
  "name": "zc-website-1",
  "compatibility_date": "2026-10-17",
  "assets": {
    "directory": "./public"
  }
}
EOF
