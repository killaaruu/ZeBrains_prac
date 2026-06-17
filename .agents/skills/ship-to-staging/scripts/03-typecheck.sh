#!/usr/bin/env bash
# 🧠 Typecheck: turbo typecheck across all packages
set -euo pipefail

echo "🧠 Running turbo typecheck…"
turbo typecheck
echo "✅ Typecheck passed"
