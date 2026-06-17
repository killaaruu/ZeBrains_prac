#!/usr/bin/env python3
"""Add or update a secret env var in a SOPS-encrypted gitops-infra secrets file
(secrets-staging.enc.yaml / secrets-prod.enc.yaml).

The secret VALUE is read from the DEPLOY_SECRET_VALUE environment variable —
never from argv — so it does not appear in shell history. Requires `sops` and a
configured age key.

Usage:
  DEPLOY_SECRET_VALUE="the-secret" set-secret-env.py \\
    --env staging|prod --key KEY --gitops-dir DIR
"""
import argparse
import os
import pathlib
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import sops


def main():
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument("--env", dest="env_name", choices=["staging", "prod"], required=True)
    p.add_argument("--key", required=True)
    p.add_argument("--gitops-dir", default=os.environ.get("GITOPS_DIR", ""))
    a = p.parse_args()

    if not a.gitops_dir:
        print("--gitops-dir (or GITOPS_DIR env var) is required", file=sys.stderr)
        return 2

    secret_value = os.environ.get("DEPLOY_SECRET_VALUE", "")
    if not secret_value:
        print("DEPLOY_SECRET_VALUE environment variable is not set or empty.", file=sys.stderr)
        print("Export it before running this script:", file=sys.stderr)
        print('  export DEPLOY_SECRET_VALUE="the-secret"', file=sys.stderr)
        return 2

    if not shutil.which("sops"):
        print("sops is not installed or not in PATH.", file=sys.stderr)
        return 1

    rel = f"clusters/mb-office/values/mad-os-api/secrets-{a.env_name}.enc.yaml"
    secrets_file = pathlib.Path(a.gitops_dir) / rel
    if not secrets_file.is_file():
        print(f"Secrets file not found: {secrets_file}", file=sys.stderr)
        return 1

    sops.set_value(file=str(secrets_file), section="stringData", key=a.key, value=secret_value)

    print(f"set {a.key} in secrets-{a.env_name} (value hidden)")
    print()
    print("Next steps:")
    print(f"  cd {a.gitops_dir}")
    print(f"  git add {rel}")
    print(f'  git commit -m "feat(mad-os-api): add {a.key} secret [{a.env_name}]"')
    return 0


if __name__ == "__main__":
    sys.exit(main())
