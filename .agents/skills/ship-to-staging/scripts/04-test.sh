#!/usr/bin/env bash
# 🧪 Tests: turbo test across all packages
set -euo pipefail

echo "🧪 Running turbo test…"
turbo test
echo "✅ Tests passed"
