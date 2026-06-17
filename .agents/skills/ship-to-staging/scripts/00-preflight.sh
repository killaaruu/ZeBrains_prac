#!/usr/bin/env bash
# 🛫 Preflight: validate branch + working tree state before shipping
set -euo pipefail

echo "🛫 Preflight checks…"

BRANCH=$(git branch --show-current)
echo "   • Current branch: $BRANCH"

case "$BRANCH" in
  main|dev|staging|master)
    echo "❌ Refusing to ship from protected branch: $BRANCH"
    exit 1
    ;;
esac

if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree is dirty. Commit or stash first:"
  git status --short
  exit 1
fi
echo "   ✅ Working tree clean"

echo "   • Fetching origin…"
git fetch origin --prune --quiet

UPSTREAM_DEV="origin/dev"
AHEAD=$(git rev-list --count "$UPSTREAM_DEV..HEAD" 2>/dev/null || echo "?")
BEHIND=$(git rev-list --count "HEAD..$UPSTREAM_DEV" 2>/dev/null || echo "?")
echo "   • vs $UPSTREAM_DEV — ahead: $AHEAD, behind: $BEHIND"

if [[ "$BEHIND" != "0" && "$BEHIND" != "?" ]]; then
  echo "   ⚠️  Branch is $BEHIND commits behind dev — op 6 (resolve conflicts) will handle this"
fi

echo "✅ Preflight OK"
