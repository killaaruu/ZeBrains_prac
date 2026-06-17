#!/bin/bash
# Auto-format edited files with Biome after each edit/write.
# Only formats TypeScript, JavaScript, JSON, and CSS files.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format files Biome handles
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css)
    # Resolve to absolute path if relative
    if [[ "$FILE_PATH" != /* ]]; then
      FILE_PATH="$CLAUDE_PROJECT_DIR/$FILE_PATH"
    fi

    if [ -f "$FILE_PATH" ]; then
      npx @biomejs/biome check --write "$FILE_PATH" 2>/dev/null
    fi
    ;;
esac

exit 0
