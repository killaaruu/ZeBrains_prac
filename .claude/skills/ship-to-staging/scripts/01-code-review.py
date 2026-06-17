#!/usr/bin/env python3
"""🔍 Code review: dump current-branch diff vs origin/dev for the reviewer."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, git

print("🔍 Preparing code review context…")
run("git fetch origin dev --quiet", check=False)

branch = git.current_branch()
base = "origin/dev"
changed = run(["git", "diff", "--name-only", f"{base}...HEAD"], capture=True).strip().splitlines()
print(f"   • Branch: {branch} vs {base}")
print(f"   • Changed files: {len(changed)}")

if not changed:
    print(f"⚠️  No diff vs {base} — nothing to review.")
    sys.exit(0)

print("\n─── Files ───────────────────────────────────")
run(["git", "diff", "--stat", f"{base}...HEAD"])
print("─────────────────────────────────────────────\n")
print("💡 Run the reviewer next: invoke 'pr-review' skill or 'code-reviewer' agent against this diff.")
print("✅ Review context ready")
