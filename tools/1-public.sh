#!/bin/bash

mkdir -p ../public
cat > ../public/index.html << 'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Website</title>
</head>
<body>
  <h1>Hello from Cloudflare!</h1>
  <p>My first deployed website.</p>
</body>
</html>
EOF
