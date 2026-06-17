#!/usr/bin/env python3
"""⏳ Monitor CI: watch PR checks until they pass (exit 4 on failure)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, git, gh, CommandError

branch = git.current_branch()
pr = gh.pr_for_branch(branch)
if pr is None:
    print(f"❌ No open PR for {branch} — run op 5 first")
    sys.exit(1)

print(f"⏳ Watching CI on PR #{pr.number}…")
print("   (use --watch; will exit non-zero if any check fails)")

try:
    gh.watch_checks(pr.number)
except CommandError:
    print("❌ CI failed. Failing checks:")
    run(["gh", "pr", "checks", str(pr.number)], check=False)
    print("\n💡 Inspect logs:  gh run view --log-failed")
    sys.exit(4)

print(f"✅ All checks passed on PR #{pr.number}")
