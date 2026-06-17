#!/usr/bin/env bash
# ⬆️ Push staging
set -euo pipefail

CURRENT=$(git branch --show-current)
if [[ "$CURRENT" != "staging" ]]; then
  echo "❌ Not on staging (on $CURRENT) — refusing to push"
  exit 1
fi

echo "⬆️ Pushing staging…"
git push origin staging
SHA=$(git rev-parse --short HEAD)
echo "$SHA" > .git/SHIP_STAGING_SHA
echo "✅ Pushed staging @ $SHA"
echo "💡 GHA workflow deploy-prod-style for staging will pick up this commit."
