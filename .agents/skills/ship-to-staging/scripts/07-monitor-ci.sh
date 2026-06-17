#!/usr/bin/env bash
# ⏳ Monitor CI: watch PR checks until they all pass (or fail)
set -euo pipefail

BRANCH=$(git branch --show-current)
PR_NUM=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number' || echo "")

if [[ -z "$PR_NUM" ]]; then
  echo "❌ No open PR for $BRANCH — run op 5 first"
  exit 1
fi

echo "⏳ Watching CI on PR #${PR_NUM}…"
echo "   (use --watch; will exit non-zero if any check fails)"

if gh pr checks "$PR_NUM" --watch --fail-fast; then
  echo "✅ All checks passed on PR #$PR_NUM"
  exit 0
fi

echo "❌ CI failed. Failing checks:"
gh pr checks "$PR_NUM" | grep -E '(fail|FAIL|✗|✘)' || true
echo ""
echo "💡 Inspect logs:  gh run view --log-failed"
exit 4
