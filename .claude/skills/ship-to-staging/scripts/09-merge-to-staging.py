#!/usr/bin/env python3
"""🔀 Merge feature branch into staging (--no-ff). Exit 5 on conflict."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, git, CommandError

branch_file = pathlib.Path(git.git_path("SHIP_FEATURE_BRANCH"))
if not branch_file.exists():
    print(f"❌ Missing {branch_file} — run op 8 first")
    sys.exit(1)
feature = branch_file.read_text().strip()

current = git.current_branch()
if current != "staging":
    print(f"❌ Expected to be on staging, on {current} — run op 8 first")
    sys.exit(1)

print(f"🔀 Merging {feature} into staging…")
try:
    run(["git", "merge", "--no-ff", "--no-edit", feature,
         "-m", f"chore(staging): merge {feature}"])
except CommandError:
    print("❌ Merge conflicts on staging:")
    run(["git", "diff", "--name-only", "--diff-filter=U"], check=False)
    print("\n💡 Resolve, then re-run.  To abort:  git merge --abort")
    sys.exit(5)

print(f"✅ Merged {feature} into staging")
