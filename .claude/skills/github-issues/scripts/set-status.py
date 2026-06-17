#!/usr/bin/env python3
"""Set the "Mad OS" Projects v2 board Status for an issue/PR by number.
Usage: set-status.py <number> "<Backlog|Todo|In progress|In Review|Done>"
Adds the issue/PR to the board first if absent. Requires `gh` authed with the
`project` scope (gh auth refresh -s project).
"""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from core import gh


def main():
    if len(sys.argv) != 3:
        print('Usage: set-status.py <number> "<Backlog|Todo|In progress|In Review|Done>"',
              file=sys.stderr)
        return 2
    number, status = int(sys.argv[1]), sys.argv[2]
    try:
        gh.set_board_status(issue=number, status=status)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 1
    print(f"✓ #{number} → {status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
