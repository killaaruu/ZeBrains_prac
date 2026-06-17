#!/usr/bin/env python3
"""🪢 Resolve conflicts: bring branch up to date with origin/dev.
Merge (not rebase) to avoid force-push. Lockfile conflicts → ours + reinstall.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, pnpm, CommandError

print("🪢 Syncing with origin/dev…")
run("git fetch origin dev --quiet")

behind = run(["git", "rev-list", "--count", "HEAD..origin/dev"], capture=True).strip()
if behind == "0":
    print("✅ Already up to date with origin/dev")
    sys.exit(0)
print(f"   • {behind} commits behind dev — merging")

try:
    run(["git", "merge", "--no-edit", "origin/dev"])
    print("✅ Merged origin/dev cleanly")
    sys.exit(0)
except CommandError:
    pass

print("   ⚠️  Merge conflicts detected:")
run(["git", "diff", "--name-only", "--diff-filter=U"])

conflicts = run(["git", "diff", "--name-only", "--diff-filter=U"], capture=True).splitlines()
lock_conflicts = [f for f in conflicts if f.endswith("pnpm-lock.yaml")]
if lock_conflicts:
    print("   • Auto-resolving lockfile conflicts (ours + reinstall)…")
    for f in lock_conflicts:
        run(["git", "checkout", "--ours", f])
        run(["git", "add", f])
    pnpm("install")
    run(["git", "add", "pnpm-lock.yaml"])

remaining = run(["git", "diff", "--name-only", "--diff-filter=U"], capture=True).strip()
if not remaining:
    run(["git", "commit", "--no-edit"])
    print("✅ Resolved (lockfile-only conflicts auto-fixed)")
    sys.exit(0)

print("❌ Source conflicts remain — Claude must resolve manually:")
print(remaining)
sys.exit(3)
