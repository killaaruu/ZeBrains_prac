"""deploy-env-var domain logic: pure functions, no subprocess.

Kept side-effect-free so the gitops env-wiring decisions are unit-tested without
touching kubectl/git/sops. The thin scripts wire these to real I/O.
"""

import re


def set_env_var(text, key, value):
    """Return `text` with `env.<key>` set to `value` (2-space-indented map).

    Mirrors the old awk fallback but correct for an env block that runs to EOF:
      - existing key under `env:` → replace in place
      - new key, env block present → append at the end of the block
      - no env block at all → append `env:\\n  <key>: <value>`
    Always returns exactly one trailing newline.
    """
    lines = text.splitlines()
    key_line = re.compile(rf"^\s+{re.escape(key)}\s*:")
    out = []
    in_env = False
    done = False

    for line in lines:
        if line.startswith("env:"):
            in_env = True
            out.append(line)
            continue
        if in_env and not done:
            if key_line.match(line):  # update existing key
                out.append(f"  {key}: {value}")
                done = True
                continue
            # a non-indented line ends the env block → insert before it
            if line and not line[0].isspace():
                out.append(f"  {key}: {value}")
                done = True
                in_env = False
                out.append(line)
                continue
        out.append(line)

    if not done:
        if in_env:  # env block ran to EOF
            out.append(f"  {key}: {value}")
        else:  # no env block anywhere
            out.append("env:")
            out.append(f"  {key}: {value}")

    return "\n".join(out) + "\n"


def env_presence(key, *, env_names, envfrom_secrets, secret_keys_map):
    """Decide whether `key` is wired into a deployment. Never sees the value.

    Returns (found: bool, message: str). Checks explicit container env entries
    first, then any envFrom secretRef whose data carries the key.
    """
    if key in env_names:
        return True, f"{key}=<set> (explicit env entry in deployment spec)"

    for secret_name in envfrom_secrets:
        if key in secret_keys_map.get(secret_name, []):
            return True, f"{key}=<set> (injected via envFrom secretRef '{secret_name}')"

    if envfrom_secrets:
        sources = " ".join(envfrom_secrets)
        return False, f"{key}=<missing> (not found in explicit env or envFrom secrets: {sources})"
    return False, f"{key}=<missing> (not found in deployment spec env)"
