#!/usr/bin/env python3
"""🛫 Preflight: validate branch + working-tree state before shipping."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, git

print("🛫 Preflight checks…")
branch = git.current_branch()
print(f"   • Current branch: {branch}")

if branch in {"main", "dev", "staging", "master"}:
    print(f"❌ Refusing to ship from protected branch: {branch}")
    sys.exit(1)

if run("git status --porcelain", capture=True).strip():
    print("❌ Working tree is dirty. Commit or stash first:")
    run("git status --short")
    sys.exit(1)
print("   ✅ Working tree clean")

print("   • Fetching origin…")
run("git fetch origin --prune --quiet")

upstream = "origin/dev"
ahead = run(["git", "rev-list", "--count", f"{upstream}..HEAD"], capture=True, check=False).strip() or "?"
behind = run(["git", "rev-list", "--count", f"HEAD..{upstream}"], capture=True, check=False).strip() or "?"
print(f"   • vs {upstream} — ahead: {ahead}, behind: {behind}")

if behind not in {"0", "?"}:
    print(f"   ⚠️  Branch is {behind} commits behind dev — op 6 (resolve conflicts) will handle this")

print("✅ Preflight OK")
