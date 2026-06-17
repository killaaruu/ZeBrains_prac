"""sops helpers — write a value into a SOPS-encrypted file non-interactively.

The secret value is passed as an argv element (not via a shell), so it never
lands in shell history the way the old `sops --set "…"` bash invocation could.
"""

import json

from .runner import run


def set_expr(*, section, key, value):
    """The `sops --set` path+value expression, with the value JSON-escaped."""
    return f'["{section}"]["{key}"] {json.dumps(value)}'


def set_value(*, file, section, key, value):
    """Set `<section>.<key> = value` inside a SOPS-encrypted YAML file in place."""
    run(["sops", "--set", set_expr(section=section, key=key, value=value), file])
