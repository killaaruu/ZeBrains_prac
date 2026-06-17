#!/usr/bin/env python3
"""🧠 Typecheck: pnpm exec turbo typecheck across all packages."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import turbo

print("🧠 Running pnpm exec turbo typecheck…")
turbo("typecheck")
print("✅ Typecheck passed")
