"""run() — the one command primitive everything sits on. No shell=True, ever."""

import shlex
import shutil
import subprocess

from .errors import CommandError


def _argv(cmd):
    """String → shlex.split (shell-like, but no shell). List → copy as-is."""
    return shlex.split(cmd) if isinstance(cmd, str) else list(cmd)


def run(cmd, *, capture=False, check=True, input=None, cwd=None):
    """Run a command.

    cmd:     "a b c" (split safely) or ["a", "b c"] (for args with spaces).
    capture: True → return stdout (str); False → stream to terminal, return "".
    check:   True → raise CommandError on non-zero exit.
    """
    argv = _argv(cmd)
    argv[0] = shutil.which(argv[0]) or argv[0]  # real exe; fixes .cmd shims, never shell=True
    proc = subprocess.run(
        argv,
        capture_output=capture,
        text=True,
        encoding="utf-8",
        input=input,
        cwd=cwd,
    )
    if check and proc.returncode != 0:
        raise CommandError(argv, proc.returncode, proc.stdout, proc.stderr)
    return proc.stdout if capture else ""


def turbo(*args, **kwargs):
    """`pnpm exec turbo <args>` — the monorepo task runner."""
    return run(["pnpm", "exec", "turbo", *args], **kwargs)


def pnpm(*args, **kwargs):
    """`pnpm <args>`."""
    return run(["pnpm", *args], **kwargs)
