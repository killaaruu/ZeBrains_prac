#!/usr/bin/env python3
"""🚀 Verify staging deploy: GHA → ArgoCD → kubectl rollout + image-tag match."""
import json
import os
import pathlib
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import run, git, CommandError

ns = os.environ.get("SHIP_STAGING_NS", "mad-os-staging")
deploy = os.environ.get("SHIP_STAGING_DEPLOY", "mad-os-api-mad-os-api")
timeout = os.environ.get("SHIP_STAGING_TIMEOUT", "15m")

print("🚀 Verifying staging deploy…")
print(f"   • Namespace:  {ns}")
print(f"   • Deployment: {deploy}")
print(f"   • Timeout:    {timeout}")

print("\n── 1) GitHub Actions (build + image push)")
if shutil.which("gh"):
    run_json = run([
        "gh", "run", "list", "--branch", "staging", "--workflow", "Deploy staging",
        "--limit", "1", "--json", "databaseId,status,conclusion,name", "--jq", ".[0]",
    ], capture=True).strip()
    print(f"   {run_json}")
    if run_json:
        meta = json.loads(run_json)
        if meta.get("status") != "completed":
            print("   ⏳ GHA still running — waiting (Ctrl-C to skip)…")
            try:
                run(["gh", "run", "watch", str(meta["databaseId"]), "--exit-status"])
            except CommandError:
                print("❌ GHA failed — abort deploy verify")
                sys.exit(6)
        print("   ✅ GHA done")

print("\n── 2) ArgoCD app status")
if shutil.which("argocd"):
    run(["argocd", "app", "get", "mad-os-api-staging", "--grpc-web"], check=False)
else:
    print("   ⚠️  argocd CLI not installed — skipping")

print("\n── 3) kubectl rollout status")
run(["kubectl", "-n", ns, "rollout", "status", f"deploy/{deploy}", f"--timeout={timeout}"])

image = run([
    "kubectl", "-n", ns, "get", "deploy", deploy,
    "-o", "jsonpath={.spec.template.spec.containers[0].image}",
], capture=True).strip()
print(f"   ✅ Live image: {image}")

expected = os.environ.get("SHIP_EXPECTED_TAG", "")
if not expected:
    sha_file = pathlib.Path(git.git_path("SHIP_STAGING_SHA"))
    if sha_file.exists():
        expected = sha_file.read_text().strip()
    else:
        try:
            expected = run("git rev-parse --short=7 origin/staging", capture=True).strip()
        except CommandError:
            expected = run("git rev-parse --short=7 HEAD", capture=True).strip()
expected = expected[:7]

if not image.endswith(f":{expected}"):
    print(f"❌ Live image tag does not match expected staging tag: expected {expected}, got {image}")
    sys.exit(7)
print(f"   ✅ Live image tag matches expected staging tag: {expected}")

print("\n── 4) Recent pod events")
run(["kubectl", "-n", ns, "get", "pods", "-l", "app.kubernetes.io/name=mad-os-api", "-o", "wide"], check=False)
print("\n✅ Staging deploy verified")
