#!/usr/bin/env bash
# 🪢 Resolve conflicts: bring branch up to date with origin/dev
# Strategy: try rebase first; if it gets messy, abort and try merge.
# On lockfile conflicts (pnpm-lock.yaml), take ours and re-install.
set -euo pipefail

echo "🪢 Syncing with origin/dev…"
git fetch origin dev --quiet

BEHIND=$(git rev-list --count "HEAD..origin/dev")
if [[ "$BEHIND" == "0" ]]; then
  echo "✅ Already up to date with origin/dev"
  exit 0
fi
echo "   • $BEHIND commits behind dev — merging"

# Use merge (not rebase) to keep PR history simple and avoid force-push.
if git merge --no-edit origin/dev; then
  echo "✅ Merged origin/dev cleanly"
  exit 0
fi

echo "   ⚠️  Merge conflicts detected:"
git diff --name-only --diff-filter=U

# Auto-resolve lockfile conflicts: take ours then reinstall
LOCK_CONFLICTS=$(git diff --name-only --diff-filter=U | grep -E 'pnpm-lock\.yaml$' || true)
if [[ -n "$LOCK_CONFLICTS" ]]; then
  echo "   • Auto-resolving lockfile conflicts (ours + reinstall)…"
  for f in $LOCK_CONFLICTS; do
    git checkout --ours "$f"
    git add "$f"
  done
  pnpm install
  git add pnpm-lock.yaml
fi

REMAINING=$(git diff --name-only --diff-filter=U || true)
if [[ -z "$REMAINING" ]]; then
  git commit --no-edit
  echo "✅ Resolved (lockfile-only conflicts auto-fixed)"
  exit 0
fi

echo "❌ Source conflicts remain — Claude must resolve manually:"
echo "$REMAINING"
exit 3
