#!/usr/bin/env python3
"""📬 Create PR to dev (idempotent — reuse existing PR if present)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, git, gh

BASE = "dev"
branch = git.current_branch()
url_file = git.git_path("SHIP_PR_URL")

print(f"📬 Ensuring PR exists for {branch} → {BASE}…")

has_upstream = run(
    ["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    capture=True, check=False,
).strip()
if not has_upstream:
    print("   • No upstream — pushing with -u")
    run(["git", "push", "-u", "origin", branch])
else:
    print("   • Pushing latest")
    run(["git", "push", "origin", branch])

existing = gh.pr_for_branch(branch, base=BASE)
if existing is not None:
    print(f"   ✅ PR #{existing.number} already exists ({existing.state}): {existing.url}")
    pathlib.Path(url_file).write_text(existing.url + "\n")
    sys.exit(0)

title = sys.argv[1] if len(sys.argv) > 1 else run("git log -1 --pretty=%s", capture=True).strip()
print(f"   • Creating PR with title: {title}")
body = (
    "## Summary\n<!-- filled by reviewer / author -->\n\n"
    "## Test plan\n- [ ] turbo check passes locally\n- [ ] CI green\n"
)
url = gh.create_pr(base=BASE, head=branch, title=title, body=body)
print(f"   ✅ Created: {url}")
pathlib.Path(url_file).write_text(url + "\n")
