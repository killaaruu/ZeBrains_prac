#!/usr/bin/env python3
"""⬆️ Push staging; record short SHA to .git/SHIP_STAGING_SHA."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, git

current = git.current_branch()
if current != "staging":
    print(f"❌ Not on staging (on {current}) — refusing to push")
    sys.exit(1)

print("⬆️ Pushing staging…")
run("git push origin staging")
sha = run("git rev-parse --short HEAD", capture=True).strip()
pathlib.Path(git.git_path("SHIP_STAGING_SHA")).write_text(sha + "\n")
print(f"✅ Pushed staging @ {sha}")
print("💡 GHA workflow deploy-prod-style for staging will pick up this commit.")
