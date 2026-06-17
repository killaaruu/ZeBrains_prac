#!/usr/bin/env python3
"""⬇️ Pull latest staging; remember the caller's branch for op 9."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, git

print("⬇️ Pulling latest staging…")
run("git fetch origin staging --quiet")

original = git.current_branch()
pathlib.Path(git.git_path("SHIP_FEATURE_BRANCH")).write_text(original + "\n")

run("git checkout staging")
run("git pull --ff-only origin staging")
sha = run("git rev-parse --short HEAD", capture=True).strip()
print(f"✅ staging updated to {sha}")
