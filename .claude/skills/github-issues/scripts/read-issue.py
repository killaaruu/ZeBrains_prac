#!/usr/bin/env python3
"""Read a GitHub issue (or detect a PR) as JSON, avoiding the Projects-classic
deprecation error. Usage: read-issue.py <number>

Emits one JSON object on stdout; the `kind` field tells the caller what it got:
  {"kind":"issue", number,title,state,labels,body,comments:[{author,body}]}
  {"kind":"pr",    number,title,state,body}   ← N is really a PR, not an issue
"""
import dataclasses
import json
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import gh


def main():
    if len(sys.argv) != 2:
        print("Usage: read-issue.py <number>", file=sys.stderr)
        return 2
    try:
        obj = gh.read_issue_or_pr(int(sys.argv[1]))
    except LookupError as exc:
        print(exc, file=sys.stderr)
        return 1
    print(json.dumps(dataclasses.asdict(obj)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
