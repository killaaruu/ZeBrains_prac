#!/bin/bash
# Enforce conventional commit messages.
# Valid prefixes: feat, fix, refactor, test, docs, chore, ci, perf, style, build

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ "$TOOL" != "Bash" ] || [ -z "$COMMAND" ]; then
  exit 0
fi

# Only check git commit commands
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

# Extract commit message from -m flag
MSG=$(echo "$COMMAND" | grep -oP -- '-m\s+["'"'"']?\K[^"'"'"']+' | head -1)

if [ -z "$MSG" ]; then
  # Heredoc-style or --message= style — try alternate extraction
  MSG=$(echo "$COMMAND" | grep -oP -- '--message[= ]+["'"'"']?\K[^"'"'"']+' | head -1)
fi

if [ -z "$MSG" ]; then
  # Could be a heredoc or interactive commit — skip validation
  exit 0
fi

# Check conventional commit format
if ! echo "$MSG" | grep -qE '^(feat|fix|refactor|test|docs|chore|ci|perf|style|build)(\(.+\))?!?:'; then
  echo "Blocked: Commit message must follow conventional commits format." >&2
  echo "Format: <type>(<scope>): <description>" >&2
  echo "Types: feat, fix, refactor, test, docs, chore, ci, perf, style, build" >&2
  echo "Example: feat(auth): add JWT refresh token rotation" >&2
  exit 2
fi

exit 0
