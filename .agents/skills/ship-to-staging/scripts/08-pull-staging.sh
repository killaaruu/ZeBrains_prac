#!/usr/bin/env bash
# ⬇️ Pull latest staging
set -euo pipefail

echo "⬇️ Pulling latest staging…"
git fetch origin staging --quiet

# Remember caller's branch so 09-merge can return / merge from it
ORIGINAL=$(git branch --show-current)
echo "$ORIGINAL" > .git/SHIP_FEATURE_BRANCH

git checkout staging
git pull --ff-only origin staging
echo "✅ staging updated to $(git rev-parse --short HEAD)"
