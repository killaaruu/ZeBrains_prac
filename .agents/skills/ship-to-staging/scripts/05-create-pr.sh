#!/usr/bin/env bash
# 📬 Create PR to dev (idempotent — prints existing PR if one already exists)
set -euo pipefail

BRANCH=$(git branch --show-current)
BASE="dev"

echo "📬 Ensuring PR exists for $BRANCH → ${BASE}…"

# Push branch first if upstream isn't set or is behind
if ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  echo "   • No upstream — pushing with -u"
  git push -u origin "$BRANCH"
else
  echo "   • Pushing latest"
  git push origin "$BRANCH"
fi

EXISTING=$(gh pr list --head "$BRANCH" --base "$BASE" --json url,number,state --jq '.[0]' 2>/dev/null || echo "")

if [[ -n "$EXISTING" && "$EXISTING" != "null" ]]; then
  URL=$(echo "$EXISTING" | jq -r '.url')
  NUM=$(echo "$EXISTING" | jq -r '.number')
  STATE=$(echo "$EXISTING" | jq -r '.state')
  echo "   ✅ PR #$NUM already exists ($STATE): $URL"
  echo "$URL" > .git/SHIP_PR_URL
  exit 0
fi

TITLE="${1:-$(git log -1 --pretty=%s)}"
echo "   • Creating PR with title: $TITLE"

URL=$(gh pr create --base "$BASE" --head "$BRANCH" --title "$TITLE" --body "$(cat <<'EOF'
## Summary
<!-- filled by reviewer / author -->

## Test plan
- [ ] turbo check passes locally
- [ ] CI green
EOF
)")

echo "   ✅ Created: $URL"
echo "$URL" > .git/SHIP_PR_URL
