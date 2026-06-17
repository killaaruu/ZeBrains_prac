#!/bin/bash
# Guard against dangerous git operations.
# Defense-in-depth — the deny list should catch these, but this hook
# provides informative error messages.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ "$TOOL" != "Bash" ] || [ -z "$COMMAND" ]; then
  exit 0
fi

# Block force push
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*(-f|--force)'; then
  echo "Blocked: Force push is not allowed. Use regular push or create a new commit." >&2
  exit 2
fi

# Block push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push\s+(origin\s+)?(main|master)(\s|$)'; then
  echo "Blocked: Direct push to main/master is not allowed. Create a feature branch and open a PR." >&2
  exit 2
fi

# Block reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "Blocked: git reset --hard can destroy work. Use git stash or git checkout <file> for targeted rollback." >&2
  exit 2
fi

# Block git clean -f
if echo "$COMMAND" | grep -qE 'git\s+clean\s+-f'; then
  echo "Blocked: git clean -f can delete untracked files permanently. Remove files explicitly if needed." >&2
  exit 2
fi

exit 0
