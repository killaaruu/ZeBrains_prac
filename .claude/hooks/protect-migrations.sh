#!/bin/bash
# Block direct edits to generated migration files.
# Migrations should be generated via `pnpm --filter @repo/db-backend generate`.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Block edits to migration directories
if echo "$FILE_PATH" | grep -qE 'packages/db-backend/src/migrations/'; then
  # Allow .gitkeep files
  if echo "$FILE_PATH" | grep -q '.gitkeep'; then
    exit 0
  fi
  echo "Blocked: Do not edit migration files directly. Use 'pnpm --filter @repo/db-backend generate' to create migrations from schema changes." >&2
  exit 2
fi

exit 0
