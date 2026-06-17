"""git helpers."""

from .runner import run


def current_branch():
    """The checked-out branch name (empty string in detached HEAD)."""
    return run("git branch --show-current", capture=True).strip()


def git_path(name):
    """Absolute path to a file inside .git (e.g. SHIP_PR_URL), per `git rev-parse --git-path`."""
    return run(["git", "rev-parse", "--git-path", name], capture=True).strip()
