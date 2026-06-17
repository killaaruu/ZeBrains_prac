"""kubectl helpers."""

import base64
import json

from .errors import CommandError
from .runner import run


def _ctx(context):
    return ["--context", context] if context else []


def deploy_exists(*, ns, name, context=None):
    """True if deployment `name` exists in namespace `ns`."""
    try:
        run(["kubectl", *_ctx(context), "-n", ns, "get", "deploy", name], capture=True)
        return True
    except CommandError:
        return False


def deploy_env_names(*, ns, name, context=None):
    """Explicit container[0] env var names declared in a deployment spec."""
    out = run(
        ["kubectl", *_ctx(context), "-n", ns, "get", "deploy", name,
         "-o", "jsonpath={.spec.template.spec.containers[0].env[*].name}"],
        capture=True, check=False,
    )
    return out.split()


def deploy_envfrom_secret_names(*, ns, name, context=None):
    """secretRef names injected via container[0] envFrom blocks."""
    out = run(
        ["kubectl", *_ctx(context), "-n", ns, "get", "deploy", name,
         "-o", "jsonpath={.spec.template.spec.containers[0].envFrom[*].secretRef.name}"],
        capture=True, check=False,
    )
    return out.split()


def secret_data_keys(*, ns, name, context=None):
    """Key names inside a secret's `.data` (values never read)."""
    out = run(
        ["kubectl", *_ctx(context), "-n", ns, "get", "secret", name, "-o", "json"],
        capture=True, check=False,
    )
    return list((json.loads(out).get("data") or {}).keys()) if out.strip() else []


def secret(*, ns, name, key, context=None):
    """Decoded value of one key in a Kubernetes secret."""
    raw = run(
        ["kubectl", *_ctx(context), "-n", ns, "get", "secret", name,
         "-o", f"jsonpath={{.data.{key}}}"],
        capture=True,
    )
    return base64.b64decode(raw).decode("utf-8")


def apply_configmap_from_file(*, ns, name, file, key="config.yaml", context=None):
    """`kubectl create configmap --from-file --dry-run=client -o yaml | kubectl apply -f -`."""
    rendered = run(
        ["kubectl", *_ctx(context), "-n", ns, "create", "configmap", name,
         f"--from-file={key}={file}", "--dry-run=client", "-o", "yaml"],
        capture=True,
    )
    run(["kubectl", *_ctx(context), "apply", "-f", "-"], input=rendered)
