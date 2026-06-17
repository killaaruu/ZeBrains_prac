#!/usr/bin/env bash
# 🔍 Code review: dump current branch diff vs origin/dev for the reviewer agent/skill
set -euo pipefail

echo "🔍 Preparing code review context…"
git fetch origin dev --quiet || true

BRANCH=$(git branch --show-current)
BASE="origin/dev"

CHANGED=$(git diff --name-only "$BASE...HEAD" | wc -l | tr -d ' ')
echo "   • Branch: $BRANCH vs $BASE"
echo "   • Changed files: $CHANGED"

if [[ "$CHANGED" == "0" ]]; then
  echo "⚠️  No diff vs $BASE — nothing to review."
  exit 0
fi

echo ""
echo "─── Files ───────────────────────────────────"
git diff --stat "$BASE...HEAD"
echo "─────────────────────────────────────────────"
echo ""
echo "💡 Run the reviewer next: invoke 'pr-review' skill or 'code-reviewer' agent against this diff."
echo "✅ Review context ready"
