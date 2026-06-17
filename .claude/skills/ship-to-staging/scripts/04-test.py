#!/usr/bin/env python3
"""🧪 Tests: pnpm exec turbo test across all packages."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import turbo

print("🧪 Running pnpm exec turbo test…")
turbo("test")
print("✅ Tests passed")
