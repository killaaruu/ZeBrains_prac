#!/usr/bin/env bash
# 🎨 Format: run Biome via turbo across the monorepo
set -euo pipefail

echo "🎨 Running turbo format…"
turbo format

if [[ -n "$(git status --porcelain)" ]]; then
  echo "   ⚠️  Format produced changes. Files modified:"
  git status --short
  echo "💡 Stage + amend or create a fixup commit before continuing."
  exit 2
fi

echo "✅ Format clean"
