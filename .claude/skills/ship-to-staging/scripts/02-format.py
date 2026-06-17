#!/usr/bin/env python3
"""🎨 Format: run Biome via turbo; exit 2 if it produced changes."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import turbo, run

print("🎨 Running turbo format…")
turbo("format")

if run("git status --porcelain", capture=True).strip():
    print("   ⚠️  Format produced changes. Files modified:")
    run("git status --short")
    print("💡 Stage + amend or create a fixup commit before continuing.")
    sys.exit(2)

print("✅ Format clean")
