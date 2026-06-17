#!/usr/bin/env python3
"""Add or update a non-secret env var in a gitops-infra mad-os-api values file
(values-staging.yaml / values-prod.yaml). Does NOT commit unless --commit is
given; prints a diff so the caller can review first.

Usage:
  add-nonsecret-env.py --env staging|prod --key KEY --value VALUE \\
    --gitops-dir DIR [--commit]
The gitops dir may also come from the GITOPS_DIR environment variable.
"""
import argparse
import difflib
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import deploy_env, run


def main():
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument("--env", dest="env_name", choices=["staging", "prod"], required=True)
    p.add_argument("--key", required=True)
    p.add_argument("--value", required=True)
    p.add_argument("--gitops-dir", default=os.environ.get("GITOPS_DIR", ""))
    p.add_argument("--commit", action="store_true")
    a = p.parse_args()

    if not a.gitops_dir:
        print("--gitops-dir (or GITOPS_DIR env var) is required", file=sys.stderr)
        return 2

    rel = f"clusters/mb-office/values/mad-os-api/values-{a.env_name}.yaml"
    values_file = pathlib.Path(a.gitops_dir) / rel
    if not values_file.is_file():
        print(f"Values file not found: {values_file}", file=sys.stderr)
        return 1

    before = values_file.read_text()
    after = deploy_env.set_env_var(before, a.key, a.value)
    values_file.write_text(after)

    print(f"Diff for {values_file}:")
    diff = difflib.unified_diff(
        before.splitlines(), after.splitlines(),
        fromfile="before", tofile="after", lineterm="",
    )
    for line in diff:
        print(line)

    if a.commit:
        run(["git", "add", rel], cwd=a.gitops_dir)
        run(["git", "commit", "-m", f"feat(mad-os-api): set {a.key} in {a.env_name} env"],
            cwd=a.gitops_dir)
        print("Committed change.")
    else:
        print()
        print("Review the diff above, then commit in gitops-infra:")
        print(f"  cd {a.gitops_dir}")
        print(f"  git add {rel}")
        print(f'  git commit -m "feat(mad-os-api): set {a.key} in {a.env_name} env"')
    return 0


if __name__ == "__main__":
    sys.exit(main())
