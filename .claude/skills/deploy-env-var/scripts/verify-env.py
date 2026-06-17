#!/usr/bin/env python3
"""Check that an env var is wired into a running mad-os deployment after a gitops
redeploy. Prints KEY=<set> or KEY=<missing> — never the value (safe for secrets).

Usage:
  verify-env.py --env staging|prod --app mad-os-api|mad-os-python-worker \\
    --key KEY [--context mb-office]

WARNING: ArgoCD can report green while the pod is still on the old config —
always run this after every deploy before marking work complete.
"""
import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import deploy_env, kubectl

_NAMESPACES = {"staging": "mad-os-staging", "prod": "mad-os"}


def main():
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument("--env", dest="env_name", choices=["staging", "prod"], required=True)
    p.add_argument("--app", choices=["mad-os-api", "mad-os-python-worker"], required=True)
    p.add_argument("--key", required=True)
    p.add_argument("--context", default="mb-office")
    a = p.parse_args()

    ns = _NAMESPACES[a.env_name]
    print(f"Checking deployment {a.app} in namespace {ns} (context: {a.context})...")

    if not kubectl.deploy_exists(ns=ns, name=a.app, context=a.context):
        print(f"Deployment '{a.app}' not found in namespace '{ns}'.", file=sys.stderr)
        return 1

    env_names = kubectl.deploy_env_names(ns=ns, name=a.app, context=a.context)
    envfrom_secrets = kubectl.deploy_envfrom_secret_names(ns=ns, name=a.app, context=a.context)
    secret_keys_map = {
        name: kubectl.secret_data_keys(ns=ns, name=name, context=a.context)
        for name in envfrom_secrets
    }

    found, message = deploy_env.env_presence(
        a.key,
        env_names=env_names,
        envfrom_secrets=envfrom_secrets,
        secret_keys_map=secret_keys_map,
    )
    print(message)
    if found:
        return 0

    print()
    print("If you just redeployed, confirm ArgoCD has fully synced and the pod has restarted:")
    print(f"  kubectl --context {a.context} -n {ns} get pods -l app={a.app}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
