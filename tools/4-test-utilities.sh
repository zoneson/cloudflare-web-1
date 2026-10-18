#!/bin/bash

echo "--- Claude Code ---"; claude --version
echo "--- Git ---"; git --version
echo "--- Node.js ---"; node -v
echo "--- npm ---"; npm -v
echo "--- Wrangler ---"; npx wrangler --version
echo "--- Command Line Tools ---"; xcode-select -p
git remote -v
git fetch
git status
