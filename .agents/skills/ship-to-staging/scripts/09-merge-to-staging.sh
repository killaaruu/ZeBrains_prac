#!/usr/bin/env bash
# 🔀 Merge feature branch into staging (no fast-forward — keep merge commit)
set -euo pipefail

if [[ ! -f .git/SHIP_FEATURE_BRANCH ]]; then
  echo "❌ Missing .git/SHIP_FEATURE_BRANCH — run op 8 first"
  exit 1
fi
FEATURE=$(cat .git/SHIP_FEATURE_BRANCH)

CURRENT=$(git branch --show-current)
if [[ "$CURRENT" != "staging" ]]; then
  echo "❌ Expected to be on staging, on $CURRENT — run op 8 first"
  exit 1
fi

echo "🔀 Merging $FEATURE into staging…"

if git merge --no-ff --no-edit "$FEATURE" -m "chore(staging): merge $FEATURE"; then
  echo "✅ Merged $FEATURE into staging"
  exit 0
fi

echo "❌ Merge conflicts on staging:"
git diff --name-only --diff-filter=U
echo ""
echo "💡 Resolve, then re-run.  To abort:  git merge --abort"
exit 5
