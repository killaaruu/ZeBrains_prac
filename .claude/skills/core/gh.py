"""gh helpers: typed issue/PR reads + Projects v2 board status."""

import json
from dataclasses import dataclass, field

from .errors import CommandError
from .git import current_branch
from .runner import run


@dataclass
class Comment:
    author: str
    body: str


@dataclass
class Issue:
    number: int
    title: str
    state: str
    body: str
    labels: list = field(default_factory=list)
    comments: list = field(default_factory=list)
    kind: str = field(default="issue", init=False)


@dataclass
class PullRequest:
    number: int
    title: str
    state: str
    body: str
    url: str = ""
    kind: str = field(default="pr", init=False)


def read_issue_or_pr(number):
    """Read #number, PR-first (the reliable discriminator).

    Returns PullRequest | Issue. Raises LookupError if it is neither.
    PR-first because `gh issue view` resolves a PR number too and would mislabel it;
    `gh pr view` errors cleanly on issues. Explicit --json field sets avoid the
    Projects-classic `projectCards` deprecation that breaks a bare `gh issue view`.
    """
    try:
        d = json.loads(run(
            ["gh", "pr", "view", str(number), "--json", "number,title,state,body,url"],
            capture=True,
        ))
        return PullRequest(
            number=d["number"], title=d["title"], state=d["state"],
            body=d["body"], url=d.get("url", ""),
        )
    except CommandError:
        pass

    try:
        d = json.loads(run(
            ["gh", "issue", "view", str(number),
             "--json", "number,title,state,labels,body,comments"],
            capture=True,
        ))
    except CommandError:
        raise LookupError(
            f"Not found: #{number} is neither an issue nor a PR in this repo"
        )

    return Issue(
        number=d["number"],
        title=d["title"],
        state=d["state"],
        body=d["body"],
        labels=[label["name"] for label in d["labels"]],
        comments=[
            Comment(author=(c.get("author") or {}).get("login", ""), body=c["body"])
            for c in d["comments"]
        ],
    )


# "Mad OS" Projects v2 board — stable ids (see github-issues SKILL.md).
_OWNER = "MrtnvM"
_PROJECT_NUM = "1"
_PROJECT_ID = "PVT_kwHOAGX8Vc4BZoP8"
_STATUS_FIELD = "PVTSSF_lAHOAGX8Vc4BZoP8zhUlk9I"
_STATUS_OPTIONS = {
    "Backlog": "e78bc439",
    "Todo": "f75ad846",
    "In progress": "47fc9ee4",
    "In Review": "e33017bb",
    "Done": "98236657",
}


def set_board_status(*, issue, status):
    """Set the board Status for an issue/PR number, adding it to the board if absent."""
    issue = int(issue)  # board JSON numbers are ints; coerce so "178" matches 178
    if status not in _STATUS_OPTIONS:
        raise ValueError(
            f"Unknown status {status!r} (use: {'|'.join(_STATUS_OPTIONS)})"
        )
    item_id = _find_board_item(issue) or _add_board_item(issue)
    run([
        "gh", "project", "item-edit", "--id", item_id,
        "--project-id", _PROJECT_ID, "--field-id", _STATUS_FIELD,
        "--single-select-option-id", _STATUS_OPTIONS[status],
    ])


def _find_board_item(number):
    out = run([
        "gh", "project", "item-list", _PROJECT_NUM,
        "--owner", _OWNER, "--format", "json", "--limit", "1000",
    ], capture=True)
    for item in json.loads(out)["items"]:
        if (item.get("content") or {}).get("number") == number:
            return item["id"]
    return None


def _add_board_item(number):
    url = _issue_or_pr_url(number)
    out = run([
        "gh", "project", "item-add", _PROJECT_NUM,
        "--owner", _OWNER, "--url", url, "--format", "json",
    ], capture=True)
    return json.loads(out)["id"]


def _issue_or_pr_url(number):
    try:
        out = run(["gh", "issue", "view", str(number), "--json", "url", "-q", ".url"], capture=True)
    except CommandError:
        out = run(["gh", "pr", "view", str(number), "--json", "url", "-q", ".url"], capture=True)
    return out.strip()


def pr_for_branch(branch=None, *, base=None):
    """First PR whose head is `branch` (default: current branch), or None."""
    branch = branch or current_branch()
    argv = ["gh", "pr", "list", "--head", branch, "--json", "number,title,state,url"]
    if base:
        argv += ["--base", base]
    arr = json.loads(run(argv, capture=True))
    if not arr:
        return None
    d = arr[0]
    return PullRequest(
        number=d["number"], title=d["title"], state=d["state"], body="", url=d["url"]
    )


def create_pr(*, base, head, title, body):
    """Create a PR; return its URL."""
    return run(
        ["gh", "pr", "create", "--base", base, "--head", head,
         "--title", title, "--body", body],
        capture=True,
    ).strip()


def watch_checks(number):
    """Watch PR checks live; raises CommandError if any check fails (--fail-fast)."""
    run(["gh", "pr", "checks", str(number), "--watch", "--fail-fast"])
